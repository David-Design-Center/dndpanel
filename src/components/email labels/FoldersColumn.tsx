import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  Tag, 
  Plus, 
  Search, 
  X, 
  ChevronLeft,
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Filter,
  Inbox,
  SendHorizontal,
  Trash,
  MailX,
  SquarePen,
  Flag,
  Star,
  MailPlus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { TreeView, TreeNode } from '@/components/ui/tree-view';
import { useLabel } from '../../contexts/LabelContext';
import { useFoldersColumn } from '../../contexts/FoldersColumnContext';
import { useAuth } from '../../contexts/AuthContext';
import { GmailLabel } from '../../types';
// Remove unused import

interface NestedLabel {
  id: string;
  name: string; // Normalized label path used for local lookups (INBOX/ prefix removed)
  gmailName: string; // Canonical Gmail label name (exact value returned by the API)
  displayName: string;
  fullPath: string;
  children: NestedLabel[];
  messagesUnread?: number;
  isLeaf: boolean;
  labelObj?: GmailLabel | null;
}

interface LabelTreeNode {
  name: string;
  fullPath: string;
  fullName: string;
  labelObj: GmailLabel | null;
  children: Map<string, LabelTreeNode>;
  isFolder: boolean;
  isLeaf: boolean;
  id: string;
  messagesUnread: number;
  gmailName?: string;
}

interface FoldersColumnProps {
  isExpanded: boolean;
  onToggle: () => void;
  onCompose: () => void;
}

function FoldersColumn({ isExpanded, onToggle, onCompose }: FoldersColumnProps) {
  const { labels, loadingLabels, deleteLabel, addLabel, isAddingLabel, systemCounts, recentCounts } = useLabel();
  // recentCounts.inboxUnreadToday -> unread INBOX messages received since today's New York midnight
  // recentCounts.draftTotal -> total number of drafts (exact)
  const { onSystemFolderFilter } = useFoldersColumn();
  const { isGmailSignedIn } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [nestUnder, setNestUnder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // Highlight selected system folder (visual state only)
  // Default to 'inbox' so the Inbox button starts in an active/disabled state
  const [selectedSystemFolder, setSelectedSystemFolder] = useState<string | null>('inbox');
  const navigate = useNavigate();

  // Build hierarchical tree structure from flat labels
  const labelTree = useMemo(() => {
    // Filter out system labels first, but keep inbox-related labels for processing
    const userLabels = labels.filter(label => {
      const name = label.name.toLowerCase();
      return name !== 'sent' && 
             name !== 'drafts' && 
             name !== 'draft' &&
             name !== 'spam' && 
             name !== 'trash' &&
             name !== 'important' &&
             name !== 'starred' &&
             name !== 'unread' &&
             name !== 'yellow_star' &&
             name !== 'deleted messages' &&
             name !== 'chat' &&
             name !== 'blocked' &&
             name !== '[imap]' &&
             name !== 'junk e-mail' &&
             name !== 'notes' &&
             !name.startsWith('category_') &&
             !name.startsWith('label_') &&
             !name.startsWith('[imap');
    });

    if (userLabels.length === 0) return [];

    // Filter out direct INBOX label and process INBOX children
    const processedLabels = userLabels
      .filter(label => label.name.toLowerCase() !== 'inbox') // Remove direct INBOX
      .map(label => {
        const normalizedName = label.name.startsWith('INBOX/')
          ? label.name.substring(6)
          : label.name;
        return {
          label,
          normalizedName,
        };
      })
      .filter(item => item.normalizedName.length > 0); // Remove any empty names

    // Step 1: Identify all parent paths dynamically
    const allNames = processedLabels.map(l => l.normalizedName);
    const parentNames = new Set<string>();
    
    for (const fullName of allNames) {
      const parts = fullName.split('/');
      // Every prefix of "A/B/C" (i.e. "A" and "A/B") is a parent
      for (let i = 1; i < parts.length; i++) {
        parentNames.add(parts.slice(0, i).join('/'));
      }
    }

    const root: LabelTreeNode = {
      name: '',
      fullPath: '',
      fullName: '',
      labelObj: null,
      children: new Map(),
      isFolder: true,
      isLeaf: false,
      id: '',
      messagesUnread: 0,
      gmailName: undefined,
    };

    // First pass: create all nodes
    for (const { label, normalizedName } of processedLabels) {
      const parts = normalizedName.split('/');
      let node = root;
      
      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];
        const fullPath = parts.slice(0, i + 1).join('/');
        
        if (!node.children.has(key)) {
          const isParentFolder = parentNames.has(fullPath);
          
          const newNode: LabelTreeNode = {
            name: key,
            fullPath: fullPath,
            fullName: fullPath,
            labelObj: null,
            children: new Map(),
            isFolder: isParentFolder,
            isLeaf: !isParentFolder,
            id: `temp-${fullPath}`,
            messagesUnread: 0,
            gmailName: undefined,
          };
          
          node.children.set(key, newNode);
        }

        node = node.children.get(key)!;
      }
      
      // At the leaf: assign the actual label data
      if (node && node !== root) {
        node.labelObj = label;
        node.messagesUnread = systemCounts[label.id] || label.messagesUnread || 0; // Use system counts from labels
        node.id = label.id;
        node.gmailName = label.name;
      }
    }

    // Convert Map structure to NestedLabel array
    const convertMapToArray = (nodeMap: Map<string, LabelTreeNode>): NestedLabel[] => {
      const result: NestedLabel[] = [];
      
      for (const [, node] of nodeMap) {
        const nestedLabel: NestedLabel = {
          id: node.id,
          name: node.fullName,
          gmailName: node.gmailName || node.labelObj?.name || node.fullName,
          displayName: node.name,
          fullPath: node.fullPath,
          children: convertMapToArray(node.children),
          messagesUnread: node.messagesUnread,
          isLeaf: node.children.size === 0,
          labelObj: node.labelObj
        };
        
        result.push(nestedLabel);
      }
      
      // Sort by display name for consistent ordering
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
      return result;
    };

    // Calculate total unread counts including children (bubble up)
    const calculateTotalUnreadCounts = (nodes: NestedLabel[]): NestedLabel[] => {
      return nodes.map(node => {
        // First, recursively process children
        const updatedChildren = calculateTotalUnreadCounts(node.children);
        
        // Calculate total unread count: own count + sum of all children's total counts
        const childrenUnreadTotal = updatedChildren.reduce((sum, child) => sum + (child.messagesUnread || 0), 0);
        const ownUnreadCount = node.messagesUnread || 0;
        const totalUnreadCount = ownUnreadCount + childrenUnreadTotal;
        
        return {
          ...node,
          children: updatedChildren,
          messagesUnread: totalUnreadCount
        };
      });
    };

    const treeWithCounts = calculateTotalUnreadCounts(convertMapToArray(root.children));
    
    return treeWithCounts;
  }, [labels, systemCounts]); // Use systemCounts from labels

  // System folders configuration
  const systemFolders = useMemo(() => {
  console.log('useMemo systemFolders - systemCounts:', systemCounts, 'recentCounts:', recentCounts);
    const systemFolderConfig = [
      { name: 'Inbox', icon: Inbox, folderType: 'inbox' },
      { name: 'Sent', icon: SendHorizontal, folderType: 'sent' },
      { name: 'Drafts', icon: SquarePen, folderType: 'drafts' },
      { name: 'Trash', icon: Trash, folderType: 'trash' },
      { name: 'Spam', icon: MailX, folderType: 'spam' },
      {
        name: 'Important',
        icon: Flag,
        folderType: 'important',
        tooltip: 'Important is a status automatically assigned by a machine learning algorithm to emails it predicts you\'ll care about.'
      },
      {
        name: 'Starred',
        icon: Star,
        folderType: 'starred',
        tooltip: 'Starred is a manual marker you apply to highlight specific emails you want to remember or act on later.'
      }
    ];

    // Get unread counts for system folders from the scanned counts
    return systemFolderConfig.map(folder => {
      const matchingLabel = labels.find(label => 
        label.name.toLowerCase() === folder.name.toLowerCase() ||
        (folder.name === 'Inbox' && label.name.toLowerCase() === 'inbox') ||
        (folder.name === 'Sent' && label.name.toLowerCase() === 'sent') ||
        (folder.name === 'Drafts' && (label.name.toLowerCase() === 'drafts' || label.name.toLowerCase() === 'draft')) ||
        (folder.name === 'Trash' && label.name.toLowerCase() === 'trash') ||
        (folder.name === 'Spam' && label.name.toLowerCase() === 'spam') ||
        (folder.name === 'Important' && label.name.toLowerCase() === 'important') ||
        (folder.name === 'Starred' && label.name.toLowerCase() === 'starred')
      );

      // Use scanned unread counts for dynamic updates
      let unreadCount = 0;
      let overLimit = false;
      
      // Map folder names to Gmail system label IDs used in scanning
      const systemLabelIdMap: Record<string, string> = {
        'Inbox': 'INBOX',
        'Sent': 'SENT', 
        'Drafts': 'DRAFT',
        'Trash': 'TRASH',
        'Spam': 'SPAM',
        'Important': 'IMPORTANT',
        'Starred': 'STARRED'
      };
      
      const systemLabelId = systemLabelIdMap[folder.name];
      if (systemLabelId) {
        const systemCount = systemCounts[systemLabelId];
        const fallbackCount = matchingLabel?.messagesUnread ?? 0;

        unreadCount = systemCount ?? fallbackCount;
        overLimit = unreadCount > 99;

        if (systemLabelId === 'INBOX' && unreadCount === 0) {
          // As a last resort, reuse recent count snapshot
          unreadCount = recentCounts.inboxUnreadToday || 0;
          overLimit = recentCounts.inboxUnreadOverLimit;
        }
      }

      // Debug logging
      if (folder.name === 'Inbox') {
        console.log('Inbox unread count:', unreadCount, 'systemCounts:', systemCounts);
      }

      return {
        ...folder,
        unreadCount,
        overLimit,
        totalCount: folder.name === 'Drafts'
          ? ((recentCounts.draftTotal ?? matchingLabel?.messagesTotal) || 0)
          : (matchingLabel?.messagesTotal || 0),
        color: selectedSystemFolder === folder.folderType ? '#272727ff' : '#4d4d4dff'
      };
    });
  }, [labels, systemCounts, selectedSystemFolder, recentCounts]); // include recentCounts

  // (Removed explicit refresh effect to avoid duplicate rapid refresh loops; context handles initial load)

  // Auto-expand all folders when labelTree changes
  useEffect(() => {
    if (labelTree.length > 0) {
      const getAllFolderPaths = (nodes: NestedLabel[]): string[] => {
        const paths: string[] = [];
        nodes.forEach(node => {
          if (!node.isLeaf) {
            paths.push(node.fullPath);
            paths.push(...getAllFolderPaths(node.children));
          }
        });
        return paths;
      };

      const allFolderPaths = getAllFolderPaths(labelTree);
      setExpandedFolders(new Set(allFolderPaths));
    }
  }, [labelTree]);

  // Filter tree based on search term
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return labelTree;

    const filterTree = (nodes: NestedLabel[]): NestedLabel[] => {
      return nodes.reduce((acc: NestedLabel[], node) => {
        const matchesSearch = node.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        const filteredChildren = filterTree(node.children);
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
        
        return acc;
      }, []);
    };

    return filterTree(labelTree);
  }, [labelTree, searchTerm]);

  const handleLabelClick = (label: NestedLabel) => {
    // Navigate for both leaf nodes and parent folders
    // For parent folders, we'll show all messages in that folder and its subfolders
    const displayName = label.fullPath || label.name;
    const canonicalName = label.gmailName || label.name;
    const baseUrl = `/inbox?labelName=${encodeURIComponent(displayName)}&labelQuery=${encodeURIComponent(canonicalName)}`;
    const labelIdParam = label.id && !label.id.startsWith('temp-') ? `&labelId=${encodeURIComponent(label.id)}` : '';
    navigate(`${baseUrl}${labelIdParam}`);
  };

  const handleOpenFilters = (label: NestedLabel) => {
    if (!label.isLeaf) return;
    navigate(`/settings?tab=filters&label=${encodeURIComponent(label.gmailName || label.name)}`);
  };

  const handleDeleteLabel = async (label: NestedLabel) => {
    // Determine confirmation message based on label type
    let confirmationMessage;
    if (!label.isLeaf) {
      // Parent label with potential children
      const childCount = label.children?.length || 0;
      if (childCount > 0) {
        confirmationMessage = `Are you sure you want to delete the parent label "${label.displayName}" and all ${childCount} of its sub-labels? This action cannot be undone and will remove the labels from all associated emails.`;
      } else {
        confirmationMessage = `Are you sure you want to delete the parent label "${label.displayName}"? This action cannot be undone and will remove the label from all associated emails.`;
      }
    } else {
      // Child/leaf label
      confirmationMessage = `Are you sure you want to delete the label "${label.displayName}"? This action cannot be undone and will remove the label from all associated emails.`;
    }
    
    if (window.confirm(confirmationMessage)) {
      try {
        await deleteLabel(label.id);
        
        toast({
          title: "Label Deleted",
          description: `Successfully deleted label "${label.displayName}"${!label.isLeaf && label.children?.length ? ' and its sub-labels' : ''}`,
        });
      } catch (error) {
        console.error('Failed to delete label:', error);
        toast({
          title: "Error",
          description: "Failed to delete label. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Convert NestedLabel to TreeNode for TreeView component
  const convertToTreeNodes = (nodes: NestedLabel[]): TreeNode[] => {
    return nodes.map(node => {
      const getNodeIcon = () => {
        if (node.isLeaf) {
          return <Tag size={12} className="text-green-500" />;
        } else {
          return <Folder size={12} className="text-yellow-500" />;
        }
      };

      const getNodeLabel = () => {
        const unreadCount = node.messagesUnread ?? 0;
        const showUnread = unreadCount > 0;
        const unreadBadgeText = unreadCount > 99 ? '99+' : unreadCount.toString();

        return (
          <div className="flex items-center justify-between w-full min-w-0 group">
            <span className={`text-xs font-medium truncate ${
              node.isLeaf 
                ? 'text-gray-700' 
                : 'text-gray-900 font-semibold'
            }`}>
              {node.displayName}
            </span>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* Unread count badge - render number only when greater than one */}
              {showUnread && (
                <span className="text-xs font-medium text-gray-600 flex-shrink-0 min-w-[18px] text-right">
                  {unreadBadgeText}
                </span>
              )}

              {/* Three dots menu for all labels (both parent and child) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={10} className="text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleOpenFilters(node)}>
                    <Filter size={14} className="mr-2" />
                    Filters
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeleteLabel(node)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete Label
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      };

      return {
        id: node.id,
        label: getNodeLabel(),
        icon: getNodeIcon(),
        children: node.children.length > 0 ? convertToTreeNodes(node.children) : undefined,
        data: node
      };
    });
  };

  // Reorder filteredTree first so nodes with unread float to top, then convert
  const reorderedFilteredTree = useMemo(() => {
    const unread: NestedLabel[] = [];
    const read: NestedLabel[] = [];
    for (const n of filteredTree) {
      if ((n.messagesUnread || 0) > 0) unread.push(n); else read.push(n);
    }
    unread.sort((a, b) => {
      const aCount = a.messagesUnread || 0;
      const bCount = b.messagesUnread || 0;
      if (bCount !== aCount) return bCount - aCount; // higher unread first
      return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase());
    });
    read.sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()));
    return [...unread, ...read];
  }, [filteredTree]);

  const treeNodes = useMemo(() => convertToTreeNodes(reorderedFilteredTree), [reorderedFilteredTree]);

  const handleNodeClick = (node: TreeNode) => {
    const nestedLabel = node.data as NestedLabel;
    handleLabelClick(nestedLabel);
  };

  const handleNodeExpand = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (expanded) {
        newExpanded.add(nodeId);
      } else {
        newExpanded.delete(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Memoize the defaultExpandedIds to prevent unnecessary re-renders
  const defaultExpandedIds = useMemo(() => Array.from(expandedFolders), [expandedFolders]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    try {
      // Create the label name with nested structure if needed
      const labelName = nestUnder && parentLabel ? `${parentLabel}/${newLabelName}` : newLabelName;
      
      // Call the addLabel method from LabelContext
      await addLabel(labelName);
      
      toast({
        title: "Label Created",
        description: `Successfully created label "${newLabelName}"`,
      });
      
      // Reset form
      setNewLabelName('');
      setParentLabel('');
      setNestUnder(false);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create label:', error);
      toast({
        title: "Error",
        description: "Failed to create label. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCreateDialog = () => {
    setShowCreateDialog(true);
    setNewLabelName('');
    setParentLabel('');
    setNestUnder(false);
  };

  const handleCompose = () => {
    if (!isGmailSignedIn) {
      toast({
        title: "Please sign in to Gmail first",
        description: "You need to sign in to your Gmail account to compose emails",
        variant: "destructive",
      });
      return;
    }
    onCompose();
  };

  const handleSystemFolderClick = (folderType: string) => {
    // Set the selected folder for color state
    setSelectedSystemFolder(folderType);
    
    // Trigger email filtering instead of navigation
    if (onSystemFolderFilter) {
      onSystemFolderFilter(folderType);
    }
  };

  return (
    <div className={`h-full bg-muted/30 border-r-1 border-gray-400 overflow-hidden relative ${!isGmailSignedIn ? 'blur-sm' : ''}`}>
      {/* Overlay for non-authenticated state */}
      {!isGmailSignedIn && (
        <div className="absolute inset-0 bg-white/20 z-10 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
            <p className="text-sm text-gray-700 font-medium">
              Sign in to Gmail to access folders
            </p>
          </div>
        </div>
      )}
      <div className="h-full relative">
        {/* Collapsed State Content */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div 
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="flex justify-center" style={{ paddingTop: '0.6rem', paddingBottom: '0.77rem' }}>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-gray-200 rounded transition-all duration-200 flex items-center justify-center group"
                  title="Expand Folders"
                >
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
                </button>
              </div>
              {/* Thin separator line like main sidebar */}
              <div className="border-b border-gray-200"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded State Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className="absolute inset-0 bg-white flex flex-col"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Header with Toggle Button */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 min-w-0">
                <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
              </div>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-gray-200 rounded transition-all duration-200 flex items-center justify-center group flex-shrink-0"
                  title="Collapse Folders"
                >
                  <ChevronLeft size={14} className="text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
                </button>
              </div>

              {/* Write Email Button */}
              <div className="p-3 border-b border-gray-200 bg-white">
                <button
                  onClick={handleCompose}
                  disabled={!isGmailSignedIn}
                  className={`w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-full font-medium text-sm transition-colors ${
                    isGmailSignedIn 
                      ? 'bg-gray-800 text-white hover:bg-gray-900' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <MailPlus size={16} />
                  <span>Write Email</span>
                </button>
              </div>

                            {/* Folders List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {/* Categories Section */}
                  <div className="p-2">

                    <TooltipProvider delayDuration={200}>
                      <div className="space-y-1">
                        {systemFolders.map((folder) => {
                          const IconComponent = folder.icon;
                          const isActive = selectedSystemFolder === folder.folderType;
                          return (
                            <Tooltip key={folder.name}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={isActive ? undefined : () => handleSystemFolderClick(folder.folderType)}
                                  disabled={isActive}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors group ${isActive ? 'bg-gray-200 cursor-default' : 'hover:bg-gray-100'}`}
                                  aria-disabled={isActive || undefined}
                                >
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <IconComponent
                                      size={18}
                                      className={`flex-shrink-0 transition-transform duration-200 group-hover:-rotate-12`}
                                      style={{ color: folder.color, opacity: isActive ? 0.8 : 1 }}
                                    />
                                    <span className="text-gray-900 truncate">{folder.name}</span>
                                  </div>
                                  
                                    {/* Count badges logic: 
                                      - Inbox: always show unread (capped 99+)
                                      - Drafts: show TOTAL drafts (exact, no cap)
                                      - Sent: never show a badge
                                      - Others: show unread only if > 0 (capped 99+)
                                  */}
                                  {(() => {
                                    const isInbox = folder.name === 'Inbox';
                                    const isDrafts = folder.name === 'Drafts';
                                    if (isInbox) {
                                      const displayUnread = folder.unreadCount || 0;
                                      return (
                                        <div className="text-gray-700 text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0 ml-2 font-medium">
                                          {folder.overLimit ? '99+' : (displayUnread > 99 ? '99+' : displayUnread)}
                                        </div>
                                      );
                                    }
                                    if (isDrafts) {
                                      const total = folder.totalCount || 0;
                                      if (total <= 0) return null;
                                      return (
                                        <div className="text-gray-700 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0 ml-2 font-medium">
                                          {total}
                                        </div>
                                      );
                                    }
                                    return null; // suppress all others (Trash, Spam, Important, etc.)
                                  })()}
                                </button>
                              </TooltipTrigger>
                              {folder.tooltip ? (
                                <TooltipContent side="right" className="max-w-xs bg-gray-800 text-white border-gray-700">
                                  <p className="text-xs leading-snug">{folder.tooltip}</p>
                                </TooltipContent>
                              ) : null}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  </div>

              {/* Combined Search & Create Section */}
              <div className="p-3 pb-0 border-t border-gray-200 bg-white">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search folders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-12 text-xs h-8 border-gray-200"
                  />
                  {searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-9 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                  
                  {/* Create Label Dialog */}
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <button
                        onClick={handleOpenCreateDialog}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors"
                        title="Create new folder"
                      >
                        <Plus size={14} />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>New label</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">Please enter a new label name:</label>
                          <Input
                            placeholder="Enter label name"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            className="w-full"
                            autoFocus
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="nest-under"
                            checked={nestUnder}
                            onCheckedChange={(checked) => setNestUnder(checked as boolean)}
                          />
                          <label htmlFor="nest-under" className="text-sm text-gray-600">
                            Nest label under:
                          </label>
                        </div>
                        
                        {nestUnder && (
                          <Select value={parentLabel} onValueChange={setParentLabel}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose parent label..." />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredTree.map((label) => (
                                <SelectItem key={label.id} value={label.name}>
                                  {label.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCreateDialog(false)}
                          disabled={isAddingLabel}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateLabel}
                          disabled={!newLabelName.trim() || isAddingLabel}
                        >
                          {isAddingLabel ? 'Creating...' : 'Create'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

                  {/* Regular Folders Tree */}
                  {loadingLabels ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading folders...</p>
                    </div>
                  ) : filteredTree.length > 0 ? (
                    <div className="p-1 pt-0">
                      
                      <TreeView
                        data={treeNodes}
                        onNodeClick={handleNodeClick}
                        onNodeExpand={handleNodeExpand}
                        expandedIds={defaultExpandedIds}
                        showLines={false}
                        showIcons={true}
                        selectable={false}
                        animateExpand={true}
                        indent={12}
                        className="space-y-0 [&_.tree-line]:border-gray-200 [&_.tree-chevron]:text-gray-400 [&_.tree-chevron]:scale-75"
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-500">
                        {searchTerm ? 'No folders match your search.' : 'No folders found.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default FoldersColumn;
