import { memo, useState, useMemo } from 'react';
import { GmailLabel } from '@/types';
import { TreeView, TreeNode } from '../ui/tree-view';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, X, Tag, Folder } from 'lucide-react';

interface LabelTreeSelectorProps {
  availableLabels: GmailLabel[];
  onSelect: (labelId: string) => void;
  searchPlaceholder?: string;
}

// System labels to filter out
const EXCLUDED_LABELS = [
  'CATEGORY_FORUMS',
  'CATEGORY_UPDATES',
  'CATEGORY_PERSONAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'YELLOW_STAR',
  'STARRED',
  'UNREAD',
  'CHAT',
  'SENT',
  'Blocked',
  'Notes',
  'costco'
];

const LabelTreeSelector = memo(({
  availableLabels,
  onSelect,
  searchPlaceholder = "Search labels..."
}: LabelTreeSelectorProps) => {
  const [search, setSearch] = useState('');

  // Filter out system labels
  const filteredAvailableLabels = useMemo(() => {
    return availableLabels.filter(label => {
      // Check if label name or id is in excluded list
      return !EXCLUDED_LABELS.includes(label.name) && 
             !EXCLUDED_LABELS.includes(label.id);
    });
  }, [availableLabels]);

  // Build a tree structure from flat labels
  const labelTree = useMemo(() => {
    const tree = new Map<string, any>();
    
    filteredAvailableLabels.forEach(label => {
      const parts = label.name.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const previousPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLeaf = index === parts.length - 1;
        
        if (!tree.has(currentPath)) {
          tree.set(currentPath, {
            id: isLeaf ? label.id : `folder-${currentPath}`, // Only assign real label ID to leaf nodes
            name: part,
            fullPath: currentPath,
            children: new Map(),
            parent: previousPath || null,
            isLeaf: isLeaf,
            label: isLeaf ? label : null // Only leaf nodes have the actual label
          });
        } else if (isLeaf && !tree.get(currentPath).label) {
          // If this path exists as a folder but now we found it's also a label, update it
          const existing = tree.get(currentPath);
          existing.label = label;
          existing.id = label.id;
          existing.isLeaf = true;
        }
        
        if (previousPath && tree.has(previousPath)) {
          const parent = tree.get(previousPath);
          parent.children.set(currentPath, tree.get(currentPath));
        }
      });
    });
    
    // Get root nodes (nodes without parents)
    const rootNodes: any[] = [];
    tree.forEach(node => {
      if (!node.parent) {
        rootNodes.push(node);
      }
    });
    
    return rootNodes;
  }, [filteredAvailableLabels]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!search.trim()) return labelTree;
    
    const searchLower = search.toLowerCase();
    
    const filterNode = (node: any): any | null => {
      const nameMatches = node.name.toLowerCase().includes(searchLower);
      const fullPathMatches = node.fullPath.toLowerCase().includes(searchLower);
      
      // Filter children recursively
      const filteredChildren: any[] = [];
      node.children.forEach((child: any) => {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      });
      
      // Include node if it matches or has matching children
      if (nameMatches || fullPathMatches || filteredChildren.length > 0) {
        const newChildren = new Map();
        filteredChildren.forEach(child => {
          newChildren.set(child.fullPath, child);
        });
        
        return {
          ...node,
          children: newChildren
        };
      }
      
      return null;
    };
    
    return labelTree.map(node => filterNode(node)).filter(Boolean);
  }, [labelTree, search]);

  // Convert to TreeNode format
  const convertToTreeNodes = (nodes: any[]): TreeNode[] => {
    return nodes.map(node => {
      const children = Array.from(node.children.values());
      const hasChildren = children.length > 0;
      const isFolder = hasChildren || !node.label; // It's a folder if it has children or no label
      
      return {
        id: node.id,
        label: (
          <div className="flex items-center justify-between w-full">
            <span className="truncate">{node.name}</span>
          </div>
        ),
        icon: isFolder ? (
          <Folder className="h-3.5 w-3.5 text-yellow-500" />
        ) : (
          <Tag className="h-3.5 w-3.5 text-green-600" />
        ),
        children: children.length > 0 ? convertToTreeNodes(children) : undefined,
        data: node
      };
    });
  };

  const treeNodes = useMemo(() => convertToTreeNodes(filteredTree), [filteredTree]);

  // Find only the INBOX root node ID to expand by default
  const defaultExpandedIds = useMemo(() => {
    const expandedIds: string[] = [];
    
    filteredTree.forEach(node => {
      if (node.name.toUpperCase() === 'INBOX' || node.fullPath.toUpperCase() === 'INBOX') {
        expandedIds.push(node.id);
      }
    });
    
    return expandedIds;
  }, [filteredTree]);

  const handleNodeClick = (node: TreeNode) => {
    const labelNode = node.data;
    
    // If it has a label, use that label's ID
    if (labelNode.label) {
      onSelect(labelNode.label.id);
    } else {
      // For folders without a direct label, find a label that matches this path
      const matchingLabel = filteredAvailableLabels.find(
        label => label.name === labelNode.fullPath
      );
      
      if (matchingLabel) {
        onSelect(matchingLabel.id);
      }
    }
  };

  return (
    <div className="bg-white">
      {/* Search */}
      <div className="p-2 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            autoFocus
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-gray-100"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Tree */}
      <div className="max-h-60 overflow-y-auto bg-white p-2">
        {treeNodes.length > 0 ? (
          <TreeView
            data={treeNodes}
            onNodeClick={handleNodeClick}
            showLines={true}
            showIcons={true}
            selectable={false}
            animateExpand={true}
            indent={16}
            defaultExpandedIds={defaultExpandedIds}
          />
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">
            {search ? `No labels found for "${search}"` : 'No labels available'}
          </div>
        )}
      </div>
    </div>
  );
});

LabelTreeSelector.displayName = 'LabelTreeSelector';
export default LabelTreeSelector;
