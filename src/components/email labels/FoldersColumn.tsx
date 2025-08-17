import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Tag, Plus, Search, X, ChevronLeft, MoreVertical, Trash2, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { TreeView, TreeNode } from '@/components/ui/tree-view';
import { useLabel } from '../../contexts/LabelContext';
import { GmailLabel } from '../../types';
import FoldersWithUnread from './FoldersWithUnread';

interface NestedLabel {
  id: string;
  name: string;
  displayName: string;
  fullPath: string;
  children: NestedLabel[];
  messagesUnread?: number;
  isLeaf: boolean;
  labelObj?: GmailLabel | null;
}

interface FoldersColumnProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function FoldersColumn({ isExpanded, onToggle }: FoldersColumnProps) {
  const { labels, loadingLabels, deleteLabel } = useLabel();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
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
        // If label starts with "INBOX/", remove the INBOX/ prefix
        if (label.name.startsWith('INBOX/')) {
          return {
            ...label,
            name: label.name.substring(6) // Remove "INBOX/" prefix
          };
        }
        return label;
      })
      .filter(label => label.name.length > 0); // Remove any empty names

    // Step 1: Identify all parent paths dynamically
    const allNames = processedLabels.map(l => l.name);
    const parentNames = new Set<string>();
    
    for (const fullName of allNames) {
      const parts = fullName.split('/');
      // Every prefix of "A/B/C" (i.e. "A" and "A/B") is a parent
      for (let i = 1; i < parts.length; i++) {
        parentNames.add(parts.slice(0, i).join('/'));
      }
    }

    const root = { children: new Map(), messagesUnread: 0, labelObj: null as GmailLabel | null, id: '' };

    // First pass: create all nodes
    for (const label of processedLabels) {
      const parts = label.name.split('/');
      let node = root;
      
      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];
        const fullPath = parts.slice(0, i + 1).join('/');
        
        if (!node.children.has(key)) {
          const isParentFolder = parentNames.has(fullPath);
          
          const newNode = {
            name: key,
            fullPath: fullPath,
            fullName: fullPath,
            labelObj: null,
            children: new Map(),
            isFolder: isParentFolder,
            isLeaf: !isParentFolder,
            id: `temp-${fullPath}`,
            messagesUnread: 0
          };
          
          node.children.set(key, newNode);
        }
        
        node = node.children.get(key);
      }
      
      // At the leaf: assign the actual label data
      if (node && node !== root) {
        node.labelObj = label;
        node.messagesUnread = label.messagesUnread || 0;
        node.id = label.id;
      }
    }

    // Convert Map structure to NestedLabel array
    const convertMapToArray = (nodeMap: Map<string, any>): NestedLabel[] => {
      const result: NestedLabel[] = [];
      
      for (const [, node] of nodeMap) {
        const nestedLabel: NestedLabel = {
          id: node.id,
          name: node.labelObj ? node.labelObj.name : node.fullName,
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
  }, [labels]);

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
        return (
          <div className="flex items-center justify-between w-full min-w-0 group">
            <span className={`text-xs font-medium truncate ${
              node.isLeaf 
                ? 'text-gray-700' 
                : 'text-gray-800 font-semibold'
            }`}>
              {node.displayName}
            </span>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* Unread count badge */}
              {(node.messagesUnread || 0) > 0 && (
                <div className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                  {(node.messagesUnread || 0) > 99 ? '99+' : (node.messagesUnread || 0)}
                </div>
              )}
              
              {/* Total messages count for leaf labels */}
              {node.isLeaf && node.labelObj && (node.labelObj.messagesTotal || 0) > 0 && (
                <div className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full text-center flex-shrink-0">
                  {(node.labelObj.messagesTotal || 0) > 999 ? `${Math.floor((node.labelObj.messagesTotal || 0) / 1000)}k` : (node.labelObj.messagesTotal || 0)}
                </div>
              )}

              {/* Three dots menu for leaf nodes */}
              {node.isLeaf && (
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
              )}
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

  const treeNodes = useMemo(() => convertToTreeNodes(filteredTree), [filteredTree]);

  const handleNodeClick = (node: TreeNode) => {
    const nestedLabel = node.data as NestedLabel;
    handleLabelClick(nestedLabel);
  };

  const handleNodeExpand = (nodeId: string, expanded: boolean) => {
    const newExpanded = new Set(expandedFolders);
    if (expanded) {
      newExpanded.add(nodeId);
    } else {
      newExpanded.delete(nodeId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleLabelClick = (label: NestedLabel) => {
    // Only navigate if it's a leaf node (actual label, not folder)
    if (label.isLeaf) {
      navigate(`/inbox?labelName=${encodeURIComponent(label.name)}`);
    }
  };

  const handleLabelClickById = useCallback((labelId: string) => {
    // Find the label by ID and get its name
    const label = labels.find(l => l.id === labelId);
    if (label) {
      navigate(`/inbox?labelName=${encodeURIComponent(label.name)}`);
    }
  }, [labels, navigate]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    if (window.confirm(`Create new label "${newLabelName}"?`)) {
      try {
        toast({
          title: "Label Created",
          description: `Successfully created label "${newLabelName}"`,
        });
        setNewLabelName('');
        setIsCreatingLabel(false);
      } catch (error) {
        console.error('Failed to create label:', error);
        toast({
          title: "Error",
          description: "Failed to create label. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteLabel = async (label: NestedLabel) => {
    if (!label.isLeaf) return;
    
    if (window.confirm(`Are you sure you want to delete the label "${label.displayName}"? This action cannot be undone.`)) {
      try {
        await deleteLabel(label.id);
        
        toast({
          title: "Label Deleted",
          description: `Successfully deleted label "${label.displayName}"`,
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

  const handleOpenFilters = (label: NestedLabel) => {
    if (!label.isLeaf) return;
    navigate(`/settings?tab=filters&label=${encodeURIComponent(label.name)}`);
  };

  return (
    <div className="h-full bg-muted/30 border-r-2 border-gray-400 overflow-hidden">
      <div className="h-full relative">
        {/* Collapsed State Content */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-200 flex items-center justify-center group"
                title="Expand Folders"
              >
                <Folder size={14} className="text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
              </button>
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
                  <Folder size={16} className="text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 truncate">Folders</span>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-gray-200 rounded transition-all duration-200 flex items-center justify-center group flex-shrink-0"
                  title="Collapse Folders"
                >
                  <ChevronLeft size={14} className="text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
                </button>
              </div>

              {/* Create New Label Section */}
              <div className="p-3 border-b border-gray-200 bg-white">
                {!isCreatingLabel ? (
                  <Button
                    onClick={() => setIsCreatingLabel(true)}
                    size="sm"
                    variant="outline"
                    className="w-full flex items-center justify-center text-xs h-8 border-gray-300"
                  >
                    <Plus size={14} className="mr-2" />
                    New Folder
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter label name..."
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="text-xs h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateLabel();
                        } else if (e.key === 'Escape') {
                          setIsCreatingLabel(false);
                          setNewLabelName('');
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        onClick={handleCreateLabel}
                        disabled={!newLabelName.trim()}
                        className="flex-1 h-7 text-xs"
                      >
                        Create
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setIsCreatingLabel(false);
                          setNewLabelName('');
                        }}
                        className="flex-1 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
                
              {/* Search Section */}
              <div className="p-3 border-b border-gray-200 bg-white">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search folders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-8 text-xs h-8 border-gray-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Folders List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {/* Folders with Unread Section */}
                  <div className="p-2">
                    <FoldersWithUnread 
                      onOpenLabel={handleLabelClickById}
                      maxUnreadToScan={1000}
                      topN={12}
                    />
                  </div>

                  {/* Regular Folders Tree */}
                  {loadingLabels ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading folders...</p>
                    </div>
                  ) : filteredTree.length > 0 ? (
                    <div className="p-2 pt-0">
                      <div className="mb-2">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">All Folders</h4>
                      </div>
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
