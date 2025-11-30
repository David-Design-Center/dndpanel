/**
 * MoveToFolderDialog Component
 * 
 * A dialog for bulk moving emails to folders/labels.
 * Uses TreeView to display folder hierarchy.
 */

import { useState, useMemo } from 'react';
import { Folder, FolderInput, FolderPlus, Search, X, ChevronRight, ChevronDown, Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLabel } from '@/contexts/LabelContext';
import { GmailLabel } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onMove: (labelId: string, labelName: string) => Promise<void>;
}

interface FolderNode {
  id: string;
  name: string;
  displayName: string;
  fullPath: string;
  children: FolderNode[];
  labelObj: GmailLabel | null;
}

/**
 * Build a tree structure from flat Gmail labels
 */
function buildFolderTree(labels: GmailLabel[]): FolderNode[] {
  // Filter to user labels only (exclude system labels)
  const userLabels = labels.filter(label => 
    label.type === 'user' && 
    !label.id.startsWith('CATEGORY_') &&
    !['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED', 'CHAT', 'UNREAD'].includes(label.id)
  );

  // Build tree structure
  const root: Map<string, FolderNode> = new Map();
  
  // Sort labels by name to ensure parents come before children
  const sortedLabels = [...userLabels].sort((a, b) => a.name.localeCompare(b.name));
  
  for (const label of sortedLabels) {
    const parts = label.name.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!currentLevel.has(part)) {
        const isLeaf = i === parts.length - 1;
        const node: FolderNode = {
          id: isLeaf ? label.id : `folder-${currentPath}`,
          name: part,
          displayName: part,
          fullPath: currentPath,
          children: [],
          labelObj: isLeaf ? label : null
        };
        currentLevel.set(part, node);
      }
      
      const existingNode = currentLevel.get(part)!;
      
      // If this is the actual label (leaf), update the node
      if (i === parts.length - 1) {
        existingNode.id = label.id;
        existingNode.labelObj = label;
      }
      
      // Move to children for next iteration
      if (i < parts.length - 1) {
        // Convert children array to map for lookup
        const childMap = new Map(existingNode.children.map(c => [c.name, c]));
        currentLevel = childMap;
        // Also update the children array reference
        existingNode.children = Array.from(childMap.values());
      }
    }
  }
  
  // Convert root map to array
  return Array.from(root.values());
}

/**
 * Recursive folder item component
 */
function FolderItem({ 
  node, 
  depth = 0, 
  searchTerm,
  onSelect 
}: { 
  node: FolderNode; 
  depth?: number;
  searchTerm: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 1 || searchTerm.length > 0);
  const hasChildren = node.children.length > 0;
  
  // Filter children if searching
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return node.children;
    return node.children.filter(child => 
      child.fullPath.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [node.children, searchTerm]);
  
  // Check if this node matches search
  const matchesSearch = !searchTerm || node.fullPath.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Don't render if doesn't match and has no matching children
  if (!matchesSearch && filteredChildren.length === 0) {
    return null;
  }
  
  const canSelect = node.labelObj !== null; // Can only select actual labels, not folder containers
  
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          canSelect ? "hover:bg-blue-50" : "hover:bg-gray-50",
          "group"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          if (canSelect) {
            onSelect(node.id, node.fullPath);
          }
        }}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          <button 
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-5" /> // Spacer
        )}
        
        {/* Folder icon */}
        <Folder size={16} className={cn(
          canSelect ? "text-blue-500" : "text-gray-400"
        )} />
        
        {/* Label name */}
        <span className={cn(
          "text-sm flex-1 truncate",
          canSelect ? "text-gray-800" : "text-gray-500"
        )}>
          {node.displayName}
        </span>
        
        {/* Move indicator on hover for selectable items */}
        {canSelect && (
          <FolderInput size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {filteredChildren.map(child => (
            <FolderItem 
              key={child.id} 
              node={child} 
              depth={depth + 1}
              searchTerm={searchTerm}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MoveToFolderDialog({ 
  open, 
  onOpenChange, 
  selectedCount,
  onMove 
}: MoveToFolderDialogProps) {
  const { labels, addLabel } = useLabel();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Build folder tree from labels
  const folderTree = useMemo(() => buildFolderTree(labels), [labels]);
  
  // Check if search term matches an existing folder exactly
  const hasExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.trim().toLowerCase();
    return labels.some(label => {
      const displayName = label.name.startsWith('INBOX/') 
        ? label.name.substring(6) 
        : label.name;
      return displayName.toLowerCase() === searchLower;
    });
  }, [labels, searchTerm]);
  
  // Filter top-level folders based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm) return folderTree;
    
    // Deep filter function
    const filterNode = (node: FolderNode): FolderNode | null => {
      const matchesSelf = node.fullPath.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is FolderNode => n !== null);
      
      if (matchesSelf || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    
    return folderTree
      .map(filterNode)
      .filter((n): n is FolderNode => n !== null);
  }, [folderTree, searchTerm]);
  
  const handleSelect = async (labelId: string, labelName: string) => {
    setIsMoving(true);
    try {
      await onMove(labelId, labelName);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to move emails:', error);
    } finally {
      setIsMoving(false);
    }
  };
  
  const handleCreateFolder = async () => {
    const folderName = searchTerm.trim();
    if (!folderName) return;
    
    setIsCreating(true);
    try {
      // Create the new label
      const newLabel = await addLabel(folderName) as GmailLabel | null;
      toast.success(`Folder "${folderName}" created`);
      
      // If we got a label back with an ID, move the emails to it
      if (newLabel?.id) {
        setIsMoving(true);
        await onMove(newLabel.id, folderName);
        onOpenChange(false);
      } else {
        // Clear search to show the new folder in the list
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsCreating(false);
      setIsMoving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput size={20} className="text-blue-500" />
            Move {selectedCount} email{selectedCount > 1 ? 's' : ''} to folder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search or create folder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim() && !hasExactMatch) {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Create new folder option */}
          {searchTerm.trim() && !hasExactMatch && (
            <button
              onClick={handleCreateFolder}
              disabled={isCreating}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
            >
              <FolderPlus size={16} />
              <span>Create folder "{searchTerm.trim()}" and move</span>
              {isCreating && (
                <div className="ml-auto animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              )}
            </button>
          )}
          
          {/* Folder list */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            {/* Special Inbox option - always shown at the top when not searching */}
            {!searchTerm && (
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-blue-50 border-b border-gray-100 group"
                onClick={() => handleSelect('INBOX', 'Inbox')}
              >
                <Inbox size={16} className="text-blue-600" />
                <span className="text-sm text-gray-800 font-medium">Inbox</span>
                <span className="text-xs text-gray-400 ml-1">(remove from folders)</span>
                <FolderInput size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </div>
            )}
            
            {filteredTree.length > 0 ? (
              <div className="py-1">
                {filteredTree.map(node => (
                  <FolderItem 
                    key={node.id} 
                    node={node}
                    searchTerm={searchTerm}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm">
                {searchTerm ? 'No folders match your search' : 'No folders available'}
              </div>
            )}
          </div>
          
          {/* Loading indicator */}
          {isMoving && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              Moving emails...
            </div>
          )}
          
          {/* Cancel button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving || isCreating}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MoveToFolderDialog;
