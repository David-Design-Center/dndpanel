import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { RefreshCw, Folder, Tag, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentAccessToken } from '../integrations/gapiService';

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

  // First pass: Create all items
  labelToThreads.forEach((threads, labelId) => {
    const labelName = labelMap.get(labelId);
    if (labelName) {
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

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
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

  const handleRefresh = () => {
    hasScannedRef.current = false; // Reset to allow manual refresh
    scanUnreadFolders();
  };

  const handleLabelClick = (labelId: string) => {
    onOpenLabel(labelId);
  };

  // Recursive function to render hierarchical label tree - matching ALL FOLDERS styling exactly
  const renderLabelTree = (nodes: UnreadLabelItem[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.fullPath} className="">
        <div 
          className="flex items-center group hover:bg-white hover:shadow-sm rounded-md transition-all duration-150 min-w-0"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <Button
            variant="ghost"
            onClick={() => !node.isLeaf && node.children.length > 0 ? toggleFolder(node.fullPath) : handleLabelClick(node.labelId)}
            className="flex-1 justify-start px-3 py-1.5 text-left h-[32px] rounded-r-none border-r-0 min-w-0 overflow-hidden"
          >
            <div className="flex items-center w-full min-w-0">
              {/* Folder/Label Icon with Expand/Collapse */}
              <div className="flex items-center mr-2 flex-shrink-0">
                {!node.isLeaf ? (
                  // Folder with expand/collapse
                  <>
                    {expandedFolders.has(node.fullPath) ? (
                      <ChevronDown size={14} className="text-gray-400 mr-1" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400 mr-1" />
                    )}
                    {expandedFolders.has(node.fullPath) ? (
                      <FolderOpen size={14} className="text-yellow-500" />
                    ) : (
                      <Folder size={14} className="text-yellow-500 transition-colors" />
                    )}
                  </>
                ) : (
                  // Label
                  <Tag size={14} className="text-green-500 flex-shrink-0 transition-colors ml-5" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className={`text-xs font-medium transition-colors truncate ${
                  node.isLeaf 
                    ? 'text-gray-700 group-hover:text-gray-900' 
                    : 'text-gray-800 group-hover:text-gray-900 font-semibold'
                }`}>
                  {node.name}
                </p>
              </div>
              
              {/* Show count badges - matching the exact style */}
              <div className="flex items-center space-x-1 ml-2">
                {/* Unread count badge - only show if count > 0 */}
                {node.count > 0 && (
                  <div className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                    {node.count > 99 ? '99+' : node.count}
                  </div>
                )}
              </div>
            </div>
          </Button>

          {/* Secondary action area (if needed) - matches the three dots area in regular folders */}
          {node.labelId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLabelClick(node.labelId)}
              className="h-[32px] w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-none"
              title={`Open ${node.name}`}
            >
              {/* Empty button for consistency with regular folder structure */}
            </Button>
          )}
        </div>
        
        {/* Render children if folder is expanded */}
        {!node.isLeaf && expandedFolders.has(node.fullPath) && node.children.length > 0 && (
          <div className="mt-0.5">
            {renderLabelTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!isGmailSignedIn) {
    return null; // Don't show component if not signed in
  }

  return (
    <div className="p-2">
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

      {/* Hierarchical Labels Tree - using exact same structure as ALL FOLDERS */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-0.5">
          {renderLabelTree(items)}
        </div>
      )}
    </div>
  );
}

export default memo(FoldersWithUnread);
