import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Tag, Plus, Search, X, ChevronLeft, MoreVertical, Edit, Trash2, Filter, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useLabel } from '../contexts/LabelContext';
import { GmailLabel } from '../types';
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
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Build hierarchical tree structure from flat labels
  const labelTree = useMemo(() => {
    // Debug: Log ALL labels first to see what we're working with
    console.log('📋 ALL RAW LABELS:', labels.map(l => ({ name: l.name, type: l.type })));
    console.log('🔍 Loading Labels Status:', loadingLabels);
    console.log('📊 Total Labels Count:', labels.length);
    
    // Filter out system labels first
    const userLabels = labels.filter(label => {
      const name = label.name.toLowerCase();
      return name !== 'inbox' && 
             name !== 'sent' && 
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

    // Debug: Log all label names to understand the structure
    console.log('🏷️ All user label names:', userLabels.map(l => l.name));

    // Step 1: Identify all parent paths dynamically
    const allNames = userLabels.map(l => l.name);
    const parentNames = new Set<string>();
    
    for (const fullName of allNames) {
      const parts = fullName.split('/');
      // Every prefix of "A/B/C" (i.e. "A" and "A/B") is a parent
      for (let i = 1; i < parts.length; i++) {
        parentNames.add(parts.slice(0, i).join('/'));
      }
    }

    console.log('📁 Detected parent names:', Array.from(parentNames));

    const root = { children: new Map(), messagesUnread: 0, labelObj: null as GmailLabel | null, id: '' };
    const nodeMap = new Map<string, any>();

    // First pass: create all nodes
    for (const label of userLabels) {
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
            fullName: fullPath, // Keep original full name
            labelObj: null,
            children: new Map(),
            isFolder: isParentFolder,
            isLeaf: !isParentFolder,
            id: `temp-${fullPath}`, // Temporary ID, will be updated for actual labels
            messagesUnread: 0
          };
          
          node.children.set(key, newNode);
          nodeMap.set(fullPath, newNode);
        }
        
        node = node.children.get(key);
      }
      
      // At the leaf: assign the actual label data
      if (node && node !== root) {
        node.labelObj = label;
        node.messagesUnread = label.messagesUnread || 0;
        node.id = label.id;
        
        // Debug: Log unread count assignment
        if (label.messagesUnread && label.messagesUnread > 0) {
          console.log(`🏷️ Assigning unread count to ${label.name}: ${label.messagesUnread}`);
        }
        
        // Don't override isLeaf and isFolder here - they should be determined by the dynamic check
        // The final isLeaf determination happens in convertMapToArray based on children count
      }
    }

    // Step 3: Convert Map structure to NestedLabel array
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
          isLeaf: node.children.size === 0 // Dynamic check: if no children, it's a leaf
        };
        
        // Debug: Log converted node with unread counts
        if (node.messagesUnread > 0) {
          console.log(`🔄 Converting node "${node.name}" with ${node.messagesUnread} unread messages`);
        }
        
        result.push(nestedLabel);
      }
      
      // Sort by display name for consistent ordering
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
      return result;
    };

    // Step 4: Calculate total unread counts including children (bubble up)
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
    
    console.log('🌳 Final label tree with bubbled unread counts:', treeWithCounts.map(item => ({
      name: item.name,
      displayName: item.displayName,
      messagesUnread: item.messagesUnread,
      children: item.children.length
    })));
    
    return treeWithCounts;
  }, [labels]);

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

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleLabelClick = (label: NestedLabel) => {
    // Only navigate if it's a leaf node (actual label, not folder)
    if (label.isLeaf) {
      navigate(`/inbox?labelName=${encodeURIComponent(label.name)}`);
    } else {
      // Toggle folder if it's not a leaf
      toggleFolder(label.fullPath);
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
        // TODO: Implement label creation API call
        console.log('Creating label:', newLabelName);
        toast({
          title: "Label Created",
          description: `Successfully created label "${newLabelName}"`,
        });
        setNewLabelName('');
        setIsCreatingLabel(false);
        // You'll need to add this to your label context
        // await createLabel(newLabelName);
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
    if (!label.isLeaf) return; // Can't delete folders, only labels
    
    if (window.confirm(`Are you sure you want to delete the label "${label.displayName}"? This action cannot be undone.`)) {
      try {
        console.log('Deleting label:', label.name);
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

  const handleEditLabel = (label: NestedLabel) => {
    if (!label.isLeaf) return; // Can't edit folders, only labels
    setEditingLabelId(label.id);
    setEditingLabelName(label.displayName);
  };

  const handleSaveEdit = async (label: NestedLabel) => {
    if (!editingLabelName.trim()) return;
    
    if (window.confirm(`Rename label from "${label.displayName}" to "${editingLabelName}"?`)) {
      try {
        // TODO: Implement label update API call
        console.log('Updating label:', label.name, 'to:', editingLabelName);
        toast({
          title: "Label Updated",
          description: `Successfully renamed label to "${editingLabelName}"`,
        });
        setEditingLabelId(null);
        setEditingLabelName('');
        // You'll need to add this to your label context
        // await updateLabel(label.id, editingLabelName);
      } catch (error) {
        console.error('Failed to update label:', error);
        toast({
          title: "Error",
          description: "Failed to update label. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingLabelId(null);
    setEditingLabelName('');
  };

  const handleOpenFilters = (label: NestedLabel) => {
    if (!label.isLeaf) return; // Can't create filters for folders, only labels
    // Navigate to settings with label filter section open
    navigate(`/settings?tab=filters&label=${encodeURIComponent(label.name)}`);
  };

  // Recursive component for rendering label tree
  const renderLabelTree = (nodes: NestedLabel[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.fullPath} className="">
        {editingLabelId === node.id ? (
          // Edit mode (only for leaf nodes)
          <div className="px-2 py-1 space-y-1" style={{ marginLeft: `${depth * 12}px` }}>
            <Input
              value={editingLabelName}
              onChange={(e) => setEditingLabelName(e.target.value)}
              className="text-xs h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(node);
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
            <div className="flex gap-1">
              <Button 
                size="sm" 
                onClick={() => handleSaveEdit(node)}
                disabled={!editingLabelName.trim()}
                className="flex-1 h-6 text-xs"
              >
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1 h-6 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Normal mode
          <>
            <div 
              className="flex items-center group hover:bg-white hover:shadow-sm rounded-md transition-all duration-150 min-w-0"
              style={{ marginLeft: `${depth * 16}px` }}
            >
              <Button
                variant="ghost"
                onClick={() => handleLabelClick(node)}
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
                      {node.displayName}
                    </p>
                  </div>
                  
                  {/* Show count badges */}
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Unread count badge - only show if count > 0 */}
                    {(node.messagesUnread || 0) > 0 && (
                      <div className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                        {(node.messagesUnread || 0) > 99 ? '99+' : (node.messagesUnread || 0)}
                      </div>
                    )}
                    
                    {/* Total messages count - only show if count > 0 and it's a leaf label */}
                    {node.isLeaf && node.labelObj && (node.labelObj.messagesTotal || 0) > 0 && (
                      <div className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full text-center flex-shrink-0">
                        {(node.labelObj.messagesTotal || 0) > 999 ? `${Math.floor((node.labelObj.messagesTotal || 0) / 1000)}k` : (node.labelObj.messagesTotal || 0)}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
              
              {/* Three dots menu (only for leaf nodes) */}
              {node.isLeaf && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[32px] w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-none"
                    >
                      <MoreVertical size={14} className="text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleEditLabel(node)}>
                      <Edit size={14} className="mr-2" />
                      Edit Label
                    </DropdownMenuItem>
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
            
            {/* Render children if folder is expanded */}
            {!node.isLeaf && expandedFolders.has(node.fullPath) && node.children.length > 0 && (
              <div className="mt-0.5">
                {renderLabelTree(node.children, depth + 1)}
              </div>
            )}
          </>
        )}
      </div>
    ));
  };

  return (
    <div className="h-full bg-muted/30 border-r border-border overflow-hidden">
      <div className="h-full relative">
        {/* Collapsed State Content - Ultra compact */}
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
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                {!isCreatingLabel ? (
                  <Button
                    onClick={() => setIsCreatingLabel(true)}
                    size="sm"
                    variant="outline"
                    className="w-full flex items-center justify-center text-xs h-8 border-gray-300"
                  >
                    <Plus size={14} className="mr-2" />
                    New Label
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
                  {/* Folders with Unread Section - Always render */}
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
                    <div className="p-2">
                      <div className="mb-2">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">All Folders</h4>
                      </div>
                      {renderLabelTree(filteredTree)}
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
