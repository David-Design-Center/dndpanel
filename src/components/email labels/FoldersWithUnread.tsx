import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { RefreshCw, Folder, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TreeView, TreeNode } from '@/components/ui/tree-view';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentAccessToken } from '../../integrations/gapiService';
import { subscribeLabelUpdateEvent, LabelUpdateEventDetail } from '../../utils/labelUpdateEvents';

type FoldersWithUnreadProps = {
  onOpenLabel: (labelId: string) => void;
  maxUnreadToScan?: number; // default 1000
  topN?: number;            // default 12
};

type LabelInfo = {
  id: string;
  name: string;
  type?: string;
};

type UnreadLabelItem = {
  labelId: string;
  name: string;
  fullPath: string;
  count: number;
  isLeaf: boolean;
  children: UnreadLabelItem[];
  depth: number;
};

type MessageMeta = {
  id: string;
  threadId: string;
  labelIds: string[];
};

type ScanStats = {
  totalScanned: number;
  lastUpdated: string;
};

// Helper function to get Gmail token
const getGmailToken = async (): Promise<string> => {
  // Use the existing getCurrentAccessToken function from gapiService
  const token = getCurrentAccessToken();
  if (!token) {
    throw new Error('No Gmail access token available');
  }
  return token;
};

// Fetch all labels with minimal data
const fetchLabels = async (token: string): Promise<Map<string, string>> => {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels?fields=labels(id,name,type)',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch labels: ${response.status}`);
  }

  const data = await response.json();
  const labelMap = new Map<string, string>();
  
  data.labels?.forEach((label: LabelInfo) => {
    // Filter out system labels we don't want to show in unread folders
    const systemLabelsToHide = [
      'CHAT', 
      'CATEGORY_FORUMS', 
      'CATEGORY_UPDATES', 
      'CATEGORY_PROMOTIONS', 
      'CATEGORY_SOCIAL',
      'CATEGORY_PERSONAL',
      'UNREAD',
      'IMPORTANT',
      'DRAFT',
      'SENT',
      'SPAM',
      'TRASH',
      'STARRED',
      'Blocked'
    ];
    
    // Also filter out system-type labels and very generic categories
    const isSystemLabel = label.type === 'system' || 
                         systemLabelsToHide.includes(label.id) || 
                         systemLabelsToHide.includes(label.name) ||
                         label.name?.startsWith('CATEGORY_');
    
    if (!isSystemLabel) {
      labelMap.set(label.id, label.name);
    }
  });

  return labelMap;
};

// List unread message IDs with pagination (last 1 week only)
const listUnreadMessageIds = async (token: string, limit: number): Promise<string[]> => {
  const messageIds: string[] = [];
  let nextPageToken: string | undefined;
  
  // Calculate date 1 week ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const dateString = oneWeekAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  while (messageIds.length < limit) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('q', `is:unread after:${dateString}`);
    url.searchParams.set('maxResults', '500');
    if (nextPageToken) {
      url.searchParams.set('pageToken', nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch unread messages: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.messages) {
      const batch = data.messages.slice(0, limit - messageIds.length);
      messageIds.push(...batch.map((msg: any) => msg.id));
    }

    nextPageToken = data.nextPageToken;
    if (!nextPageToken || messageIds.length >= limit) {
      break;
    }
  }

  return messageIds;
};

// Fetch message metadata in batches with concurrency control
const fetchMessageMetaBatch = async (
  token: string, 
  ids: string[], 
  concurrency: number = 10
): Promise<MessageMeta[]> => {
  const results: MessageMeta[] = [];
  
  // Process in chunks to control concurrency
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    
    const promises = chunk.map(async (id) => {
      try {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=minimal&fields=id,threadId,labelIds`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(`Failed to fetch message ${id}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        return {
          id: data.id,
          threadId: data.threadId,
          labelIds: data.labelIds || [],
        };
      } catch (error) {
        console.warn(`Error fetching message ${id}:`, error);
        return null;
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter((result): result is MessageMeta => result !== null));
    
    // Small delay between batches to be gentle on the API
    if (i + concurrency < ids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

// Aggregate messages by label, deduplicating by threadId
const aggregateByLabel = (messagesMeta: MessageMeta[]): Map<string, Set<string>> => {
  const labelToThreads = new Map<string, Set<string>>();

  messagesMeta.forEach((message) => {
    message.labelIds.forEach((labelId) => {
      if (!labelToThreads.has(labelId)) {
        labelToThreads.set(labelId, new Set());
      }
      labelToThreads.get(labelId)!.add(message.threadId);
    });
  });

  return labelToThreads;
};

// Build hierarchical structure from flat labels with unread counts
const buildLabelHierarchy = (
  labelMap: Map<string, string>, 
  labelToThreads: Map<string, Set<string>>
): UnreadLabelItem[] => {
  const allItems: UnreadLabelItem[] = [];
  const pathToItem = new Map<string, UnreadLabelItem>();

  // First pass: Create all items with INBOX processing
  labelToThreads.forEach((threads, labelId) => {
    const originalLabelName = labelMap.get(labelId);
    if (originalLabelName) {
      // Skip direct INBOX label, process INBOX children by removing prefix
      if (originalLabelName.toLowerCase() === 'inbox') {
        return; // Skip the INBOX folder itself
      }
      
      let labelName = originalLabelName;
      // If label starts with "INBOX/", remove the INBOX/ prefix
      if (labelName.startsWith('INBOX/')) {
        labelName = labelName.substring(6); // Remove "INBOX/" prefix
      }
      
      // Skip if name becomes empty after processing
      if (labelName.length === 0) {
        return;
      }
      
      const parts = labelName.split('/');
      const item: UnreadLabelItem = {
        labelId,
        name: parts[parts.length - 1], // Display name is just the last part
        fullPath: labelName,
        count: threads.size,
        isLeaf: true,
        children: [],
        depth: parts.length - 1,
      };
      
      allItems.push(item);
      pathToItem.set(labelName, item);
    }
  });

  // Second pass: Create intermediate parent nodes for paths that don't have direct labels
  const allPaths = new Set<string>();
  allItems.forEach(item => {
    const parts = item.fullPath.split('/');
    for (let i = 1; i <= parts.length; i++) {
      allPaths.add(parts.slice(0, i).join('/'));
    }
  });

  allPaths.forEach(path => {
    if (!pathToItem.has(path)) {
      const parts = path.split('/');
      const parentItem: UnreadLabelItem = {
        labelId: '', // No direct labelId for intermediate nodes
        name: parts[parts.length - 1],
        fullPath: path,
        count: 0,
        isLeaf: false,
        children: [],
        depth: parts.length - 1,
      };
      pathToItem.set(path, parentItem);
    }
  });

  // Third pass: Build parent-child relationships and aggregate counts
  const rootItems: UnreadLabelItem[] = [];
  
  Array.from(pathToItem.values())
    .sort((a, b) => a.depth - b.depth) // Process from root to leaves
    .forEach(item => {
      const parts = item.fullPath.split('/');
      
      if (parts.length === 1) {
        // Root level item
        rootItems.push(item);
      } else {
        // Find parent
        const parentPath = parts.slice(0, -1).join('/');
        const parent = pathToItem.get(parentPath);
        
        if (parent) {
          parent.children.push(item);
          parent.isLeaf = false;
          parent.count += item.count; // Aggregate count upward
        }
      }
    });

  // Sort function to order by count (descending)
  const sortByCount = (items: UnreadLabelItem[]): UnreadLabelItem[] => {
    return items
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        ...item,
        children: sortByCount(item.children)
      }));
  };

  return sortByCount(rootItems);
};

export function FoldersWithUnread({ 
  onOpenLabel, 
  maxUnreadToScan = 1000, 
  topN = 12 
}: FoldersWithUnreadProps) {
  const { isGmailSignedIn } = useAuth();
  const [items, setItems] = useState<UnreadLabelItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const hasScannedRef = useRef(false);

  // Function to update unread counts dynamically when emails are read/unread
  const updateUnreadCounts = useCallback((detail: LabelUpdateEventDetail) => {
    const { labelIds, action } = detail;
    const increment = action === 'mark-unread' ? 1 : -1;
    
    setItems(prevItems => {
      const updateItemCounts = (items: UnreadLabelItem[]): UnreadLabelItem[] => {
        return items.map(item => {
          // Check if this item's labelId is in the affected labels
          const isAffected = labelIds.includes(item.labelId);
          let updatedCount = item.count;
          
          if (isAffected) {
            updatedCount = Math.max(0, item.count + increment);
          }
          
          // Recursively update children
          const updatedChildren = updateItemCounts(item.children);
          
          // Calculate new count including children
          const childrenTotal = updatedChildren.reduce((sum, child) => sum + child.count, 0);
          const finalCount = isAffected ? updatedCount : item.count;
          
          return {
            ...item,
            count: item.isLeaf ? finalCount : childrenTotal,
            children: updatedChildren
          };
        });
      };
      
      return updateItemCounts(prevItems);
    });
  }, []);

  // Listen for label update events
  useEffect(() => {
    const unsubscribe = subscribeLabelUpdateEvent(updateUnreadCounts);
    return unsubscribe;
  }, [updateUnreadCounts]);

  // Auto-expand all folders when items change
  useEffect(() => {
    if (items.length > 0) {
      const getAllFolderPaths = (nodes: UnreadLabelItem[]): string[] => {
        const paths: string[] = [];
        nodes.forEach(node => {
          if (!node.isLeaf) {
            paths.push(node.fullPath);
            paths.push(...getAllFolderPaths(node.children));
          }
        });
        return paths;
      };

      const allFolderPaths = getAllFolderPaths(items);
      setExpandedFolders(new Set(allFolderPaths));
    }
  }, [items]);

  // Convert UnreadLabelItem to TreeNode for TreeView component
  const convertToTreeNodes = (nodes: UnreadLabelItem[]): TreeNode[] => {
    return nodes.map(node => {
      const getNodeIcon = () => {
        if (node.isLeaf) {
          return <Tag size={12} className="text-green-500" />;
        } else {
          return <Folder size={12} className="text-yellow-500" />;
        }
      };

      const getNodeLabel = () => {
        return (
          <div className="flex items-center justify-between w-full min-w-0 group">
            <span className={`text-xs font-medium truncate ${
              node.isLeaf 
                ? 'text-gray-700' 
                : 'text-gray-800 font-semibold'
            }`}>
              {node.name}
            </span>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* Unread count badge */}
              {node.count > 0 && (
                <div className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                  {node.count > 99 ? '99+' : node.count}
                </div>
              )}
            </div>
          </div>
        );
      };

      return {
        id: node.labelId || node.fullPath,
        label: getNodeLabel(),
        icon: getNodeIcon(),
        children: node.children.length > 0 ? convertToTreeNodes(node.children) : undefined,
        data: node
      };
    });
  };

  const treeNodes = useMemo(() => convertToTreeNodes(items), [items]);

  const handleNodeClick = (node: TreeNode) => {
    const unreadItem = node.data as UnreadLabelItem;
    if (unreadItem.isLeaf && unreadItem.labelId) {
      handleLabelClick(unreadItem.labelId);
    }
  };

  const handleNodeExpand = (nodeId: string, expanded: boolean) => {
    const newExpanded = new Set(expandedFolders);
    // Find the node by ID and use its fullPath for consistency
    const findNodeByFullPath = (nodes: UnreadLabelItem[], targetId: string): string | null => {
      for (const node of nodes) {
        if (node.labelId === targetId || node.fullPath === targetId) {
          return node.fullPath;
        }
        if (node.children.length > 0) {
          const found = findNodeByFullPath(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const fullPath = findNodeByFullPath(items, nodeId);
    if (fullPath) {
      if (expanded) {
        newExpanded.add(fullPath);
      } else {
        newExpanded.delete(fullPath);
      }
      setExpandedFolders(newExpanded);
    }
  };

  const scanUnreadFolders = useCallback(async () => {
    if (!isGmailSignedIn) {
      setError('Not signed in to Gmail');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Starting unread folders scan (1 week)...');
      
      // Step 1: Get Gmail token
      const token = await getGmailToken();
      
      // Step 2: Fetch all labels
      const labelMap = await fetchLabels(token);
      console.log(`📋 Fetched ${labelMap.size} labels`);
      
      // Step 3: Get unread message IDs (limited to 1 week)
      const messageIds = await listUnreadMessageIds(token, maxUnreadToScan);
      console.log(`📬 Found ${messageIds.length} unread messages from last week`);
      
      if (messageIds.length === 0) {
        setItems([]);
        setStats({
          totalScanned: 0,
          lastUpdated: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
        });
        return;
      }
      
      // Step 4: Fetch message metadata in batches
      const messagesMeta = await fetchMessageMetaBatch(token, messageIds, 10);
      console.log(`🔍 Successfully fetched metadata for ${messagesMeta.length} messages`);
      
      // Step 5: Aggregate by label (dedupe by threadId)
      const labelToThreads = aggregateByLabel(messagesMeta);
      
      // Step 6: Build hierarchical structure
      const hierarchicalItems = buildLabelHierarchy(labelMap, labelToThreads);
      
      // Step 7: Limit to topN items (only top-level)
      const topItems = hierarchicalItems.slice(0, topN);
      
      // Count the actual messages that contributed to unread labels
      const totalMessagesInLabels = Array.from(labelToThreads.values()).reduce((total, threads) => total + threads.size, 0);
      
      console.log(`📊 Found ${topItems.length} label hierarchies with unread conversations`);
      
      setItems(topItems);
      setStats({
        totalScanned: totalMessagesInLabels, // Only count messages that contributed to labels
        lastUpdated: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error scanning unread folders:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isGmailSignedIn, maxUnreadToScan, topN]);

  const handleLabelClick = (labelId: string) => {
    onOpenLabel(labelId);
  };

  // Auto-scan only on mount when signed in, avoid re-scanning on navigation
  useEffect(() => {
    if (isGmailSignedIn && !hasScannedRef.current) {
      hasScannedRef.current = true;
      scanUnreadFolders();
    } else if (!isGmailSignedIn) {
      // Reset when user signs out so we scan again when they sign back in
      hasScannedRef.current = false;
      setItems([]);
      setStats(null);
      setError(null);
    }
  }, [isGmailSignedIn]); // Removed scanUnreadFolders from dependencies to prevent unnecessary re-scans

  // Listen for profile switches and clear cache/state
  useEffect(() => {
    const handleClearCache = () => {
      console.log('🗑️ Clearing FoldersWithUnread state for profile switch');
      hasScannedRef.current = false;
      setItems([]);
      setStats(null);
      setError(null);
      setExpandedFolders(new Set());
      setLoading(false);
      
      // Trigger a new scan if Gmail is signed in
      if (isGmailSignedIn) {
        setTimeout(() => {
          scanUnreadFolders();
        }, 1000); // Small delay to allow profile switch to complete
      }
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, [isGmailSignedIn, scanUnreadFolders]);

  const handleRefresh = () => {
    hasScannedRef.current = false; // Reset to allow manual refresh
    scanUnreadFolders();
  };

  if (!isGmailSignedIn) {
    return null; // Don't show component if not signed in
  }

  return (
    <div className="p-2 pb-0">
      {/* Header with refresh button - matching the exact style of "All Folders" */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Folders with Unread (1 week)</h4>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
          title="Refresh unread folders"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="text-xs text-gray-500 mb-2">
          Scanned {stats.totalScanned} unread • {stats.lastUpdated}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <RefreshCw size={16} className="animate-spin" />
            <span>Scanning...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="py-3">
          <div className="text-sm text-red-600 mb-2">{error}</div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && stats && (
        <div className="text-center py-4">
          <div className="text-green-600 text-sm">✨ All caught up!</div>
          <div className="text-xs text-gray-500 mt-1">No unread folders</div>
        </div>
      )}

      {/* Hierarchical Labels Tree using TreeView */}
      {!loading && !error && items.length > 0 && (
        <TreeView
          data={treeNodes}
          onNodeClick={handleNodeClick}
          onNodeExpand={handleNodeExpand}
          defaultExpandedIds={Array.from(expandedFolders)}
          showLines={true}
          showIcons={true}
          selectable={false}
          animateExpand={true}
          indent={8}
          className="space-y-0"
        />
      )}
    </div>
  );
}

export default memo(FoldersWithUnread);
