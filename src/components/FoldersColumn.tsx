import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Tag, Plus, Search, X, ChevronLeft, MoreVertical, Edit, Trash2, Filter } from 'lucide-react';
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

interface FoldersColumnProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function FoldersColumn({ isExpanded, onToggle }: FoldersColumnProps) {
  const { labels, loadingLabels } = useLabel();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const navigate = useNavigate();

  // Filter and clean labels for display
  const filteredLabels = useMemo(() => {
    const cleanedLabels = labels
      .map(label => ({
        ...label,
        displayName: label.name
          .replace(/^\[Gmail\]\/|^\[Gmail\]\s*›\s*|^Gmail\/|^INBOX\/|^Categories\//i, '') // Remove Gmail prefixes
          .replace(/^--/, '') // Remove leading dashes
          .replace(/\//g, ' › ') // Replace slashes with arrow for hierarchy
          .trim()
      }))
      .filter(label => {
        // Filter out system labels - only exclude exact matches and well-known system labels
        const name = label.name.toLowerCase();
        return name !== 'inbox' && 
               name !== 'sent' && 
               name !== 'drafts' && 
               name !== 'spam' && 
               name !== 'trash' &&
               name !== 'important' &&
               name !== 'starred' &&
               !name.startsWith('category_') &&
               !name.startsWith('label_') &&
               label.displayName.length > 0; // Make sure we have a display name
      });

    // Then filter by search term
    if (!searchTerm.trim()) return cleanedLabels;
    
    return cleanedLabels.filter(label => 
      label.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [labels, searchTerm]);

  const handleLabelClick = (label: any) => {
    // Navigate to inbox with label filter
    navigate(`/inbox?labelName=${encodeURIComponent(label.name)}`);
  };

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

  const handleDeleteLabel = async (label: any) => {
    if (window.confirm(`Are you sure you want to delete the label "${label.displayName}"? This action cannot be undone.`)) {
      try {
        // TODO: Implement label deletion API call
        console.log('Deleting label:', label.name);
        toast({
          title: "Label Deleted",
          description: `Successfully deleted label "${label.displayName}"`,
        });
        // You'll need to add this to your label context
        // await deleteLabel(label.id);
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

  const handleEditLabel = (label: any) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.displayName);
  };

  const handleSaveEdit = async (label: any) => {
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

  const handleOpenFilters = (label: any) => {
    // Navigate to settings with label filter section open
    navigate(`/settings?tab=filters&label=${encodeURIComponent(label.name)}`);
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
              className="p-1 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-105"
              title="Collapse folders"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Create Label Button */}
          <div className="p-3">
            {!isCreatingLabel ? (
              <Button 
                className="w-full mb-2" 
                size="sm"
                onClick={() => setIsCreatingLabel(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Label
              </Button>
            ) : (
              <div className="space-y-2 mb-2">
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
            {loadingLabels ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Loading folders...</p>
              </div>
            ) : filteredLabels.length > 0 ? (
              <div className="p-2">
                {filteredLabels.map((label) => (
                  <div
                    key={label.id}
                    className="mb-1"
                  >
                    {editingLabelId === label.id ? (
                      // Edit mode
                      <div className="px-3 py-2 space-y-2">
                        <Input
                          value={editingLabelName}
                          onChange={(e) => setEditingLabelName(e.target.value)}
                          className="text-xs h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(label);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveEdit(label)}
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
                      <div className="flex items-center group hover:bg-white hover:shadow-sm rounded-md transition-all duration-150 min-w-0">
                        <Button
                          variant="ghost"
                          onClick={() => handleLabelClick(label)}
                          className="flex-1 justify-start px-3 py-2 text-left h-[36px] rounded-r-none border-r-0 min-w-0 overflow-hidden"
                        >
                          <div className="flex items-center w-full min-w-0">
                            <Tag size={14} className="mr-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">
                                {label.displayName}
                              </p>
                              {(label.messagesUnread && label.messagesUnread > 0) && (
                                <p className="text-xs text-blue-600 mt-0.5 truncate">
                                  {label.messagesUnread} unread
                                </p>
                              )}
                            </div>
                            {(label.messagesUnread && label.messagesUnread > 0) && (
                              <div className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                                {label.messagesUnread > 99 ? '99+' : label.messagesUnread}
                              </div>
                            )}
                          </div>
                        </Button>
                        
                        {/* Three dots menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-[36px] w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-none"
                            >
                              <MoreVertical size={14} className="text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleEditLabel(label)}>
                              <Edit size={14} className="mr-2" />
                              Edit Label
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenFilters(label)}>
                              <Filter size={14} className="mr-2" />
                              Filters
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLabel(label)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete Label
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500">No folders found for "{searchTerm}"</p>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500">No folders available</p>
              </div>
            )}
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default FoldersColumn;
