import { RefObject, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, ChevronRight, Folder, Tag } from 'lucide-react';
import { buildLabelTree, filterLabelTree, NestedLabel } from '@/utils/labelTreeUtils';
import { useLabel } from '@/contexts/LabelContext';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateFilterModalProps {
  isOpen: boolean;
  modalRef: RefObject<HTMLDivElement>;
  senderName: string;
  senderEmail: string;
  selectedFilterLabel: string;
  onSelectLabel: (labelId: string, labelName: string) => void;
  onClose: () => void;
  onCreateFilter: (skipInbox: boolean) => void;
}

/**
 * Modal for creating email filter rules (move messages from sender to folder)
 * Updated Jan 2026: Now uses hierarchical tree view like Move function
 */
export function CreateFilterModal({
  isOpen,
  modalRef,
  senderName,
  senderEmail,
  selectedFilterLabel,
  onSelectLabel,
  onClose,
  onCreateFilter,
}: CreateFilterModalProps) {
  const { labels } = useLabel();
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [skipInbox, setSkipInbox] = useState(false);

  // Build hierarchical tree from labels
  const labelTree = useMemo(() => buildLabelTree(labels), [labels]);
  
  // Filter tree by search query
  const filteredTree = useMemo(() => 
    filterLabelTree(labelTree, filterLabelQuery), 
    [labelTree, filterLabelQuery]
  );

  if (!isOpen) return null;

  const displaySender = senderName || senderEmail;

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSelectLabel = (labelId: string, labelName: string) => {
    setSelectedLabelId(labelId);
    onSelectLabel(labelId, labelName);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Create a rule</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              Always move messages from <span className="font-semibold">{senderEmail}</span> to this folder:
            </p>

            {/* Label Selection UI */}
            <div className="border border-gray-200 rounded-lg">
              {/* Search Bar */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a folder"
                    value={filterLabelQuery}
                    onChange={(e) => setFilterLabelQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {filterLabelQuery && (
                    <button
                      onClick={() => setFilterLabelQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                      aria-label="Clear search"
                    >
                      <X size={12} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Labels Tree */}
              <div className="max-h-56 overflow-y-auto">
                {filteredTree.length > 0 ? (
                  <LabelTreeView
                    nodes={filteredTree}
                    depth={0}
                    expandedNodes={expandedNodes}
                    onToggleExpand={handleToggleExpand}
                    selectedLabelId={selectedLabelId}
                    onSelectLabel={handleSelectLabel}
                  />
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">No folders found</div>
                )}
              </div>
            </div>

            {/* Skip Inbox checkbox */}
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="skip-inbox-filter"
                checked={skipInbox}
                onCheckedChange={(checked) => setSkipInbox(!!checked)}
              />
              <label htmlFor="skip-inbox-filter" className="text-sm text-gray-600">
                Skip Inbox
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreateFilter(skipInbox)}
            disabled={!selectedFilterLabel}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Recursive tree view component for hierarchical label display
interface LabelTreeViewProps {
  nodes: NestedLabel[];
  depth: number;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  selectedLabelId: string;
  onSelectLabel: (labelId: string, labelName: string) => void;
}

function LabelTreeView({
  nodes,
  depth,
  expandedNodes,
  onToggleExpand,
  selectedLabelId,
  onSelectLabel,
}: LabelTreeViewProps) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const hasRealId = node.id && !node.id.startsWith('temp-');
        const isSelected = selectedLabelId === node.id;
        
        return (
          <div key={node.id || node.fullPath}>
            <div
              className={`flex items-center w-full hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              {/* Expand/collapse button */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(node.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown size={12} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={12} className="text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}
              
              {/* Icon */}
              <span className="flex-shrink-0 mr-1.5">
                {node.isLeaf ? (
                  <Tag size={12} className="text-green-500" />
                ) : (
                  <Folder size={12} className="text-yellow-500" />
                )}
              </span>
              
              {/* Label name */}
              <button
                className={`flex-1 py-1.5 text-left text-xs truncate ${
                  hasRealId 
                    ? 'text-gray-700 hover:text-gray-900' 
                    : 'text-gray-400 cursor-default'
                } ${node.isLeaf ? '' : 'font-medium'}`}
                onClick={() => hasRealId && onSelectLabel(node.id, node.fullPath)}
                disabled={!hasRealId}
                title={hasRealId ? `Select ${node.fullPath}` : 'Folder group (no label)'}
              >
                {node.displayName}
              </button>
              
              {isSelected && (
                <span className="text-xs text-blue-600 mr-2">Selected</span>
              )}
            </div>
            
            {/* Render children if expanded */}
            {hasChildren && isExpanded && (
              <LabelTreeView
                nodes={node.children}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                selectedLabelId={selectedLabelId}
                onSelectLabel={onSelectLabel}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
