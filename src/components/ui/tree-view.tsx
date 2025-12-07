"use client";

import React, { useState, useCallback } from "react";
import { ChevronRight, Folder, File, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Types
export type TreeNode = {
  id: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: any;
};

export type TreeViewProps = {
  data: TreeNode[];
  className?: string;
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  defaultExpandedIds?: string[];
  expandedIds?: string[]; // Add controlled expanded state
  showLines?: boolean;
  showIcons?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  indent?: number;
  animateExpand?: boolean;
  nodeWrapper?: (node: TreeNode, children: React.ReactNode) => React.ReactNode;
};

// Main TreeView component
export function TreeView({
  data,
  className,
  onNodeClick,
  onNodeExpand,
  defaultExpandedIds = [],
  expandedIds, // Add controlled expandedIds
  showLines = true,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds = [],
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  nodeWrapper,
}: TreeViewProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds),
  );
  const [internalSelectedIds, setInternalSelectedIds] =
    useState<string[]>(selectedIds);

  // Use controlled expandedIds if provided, otherwise use internal state
  const isExpandedControlled = expandedIds !== undefined;
  const currentExpandedIds = isExpandedControlled ? new Set(expandedIds) : internalExpandedIds;

  const isControlled =
    selectedIds !== undefined && onSelectionChange !== undefined;
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds;

  // Only sync expanded state with defaultExpandedIds on initial mount
  // Remove the useEffect that syncs on every defaultExpandedIds change to prevent 
  // setState-during-render warnings when parent and child both manage the same state

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      if (isExpandedControlled) {
        // For controlled mode, just call the callback and let parent handle state
        const isExpanded = currentExpandedIds.has(nodeId);
        onNodeExpand?.(nodeId, !isExpanded);
      } else {
        // For uncontrolled mode, manage internal state
        setInternalExpandedIds((prev) => {
          const newSet = new Set(prev);
          const isExpanded = newSet.has(nodeId);
          isExpanded ? newSet.delete(nodeId) : newSet.add(nodeId);
          onNodeExpand?.(nodeId, !isExpanded);
          return newSet;
        });
      }
    },
    [onNodeExpand, isExpandedControlled, currentExpandedIds],
  );

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) return;

      let newSelection: string[];

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId)
          ? currentSelectedIds.filter((id) => id !== nodeId)
          : [...currentSelectedIds, nodeId];
      } else {
        newSelection = currentSelectedIds.includes(nodeId) ? [] : [nodeId];
      }

      isControlled
        ? onSelectionChange?.(newSelection)
        : setInternalSelectedIds(newSelection);
    },
    [
      selectable,
      multiSelect,
      currentSelectedIds,
      isControlled,
      onSelectionChange,
    ],
  );

  const renderNode = (
    node: TreeNode,
    level = 0,
    isLast = false,
    parentPath: boolean[] = [],
  ) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = currentExpandedIds.has(node.id);
    const isSelected = currentSelectedIds.includes(node.id);
    const currentPath = [...parentPath, isLast];

    const getDefaultIcon = () =>
      hasChildren ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4" />
        ) : (
          <Folder className="h-4 w-4" />
        )
      ) : (
        <File className="h-4 w-4" />
      );

    const nodeContent = (
      <div key={node.id} className="select-none">
        <motion.div
          className={cn(
            "flex items-center py-0.5 px-0.5 transition-all duration-200 relative group rounded-md mx-0",
            "hover:bg-accent/50",
            isSelected && "bg-accent/80",
            selectable && "hover:border-accent-foreground/10",
          )}
          style={{ paddingLeft: level * indent + 2 }}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
          {/* Tree Lines */}
          {showLines && level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {currentPath.map((isLastInPath, pathIndex) => (
                <div
                  key={pathIndex}
                  className="absolute top-0 bottom-0 border-l border-border/40"
                  style={{
                    left: pathIndex * indent + 8,
                    display:
                      pathIndex === currentPath.length - 1 && isLastInPath
                        ? "none"
                        : "block",
                  }}
                />
              ))}
              <div
                className="absolute top-1/2 border-t border-border/40"
                style={{
                  left: (level - 1) * indent + 8,
                  width: indent - 4,
                  transform: "translateY(-1px)",
                }}
              />
              {isLast && (
                <div
                  className="absolute top-0 border-l border-border/40"
                  style={{
                    left: (level - 1) * indent + 8,
                    height: "50%",
                  }}
                />
              )}
            </div>
          )}

          {/* Expand Icon - Left clickable for expand/collapse */}
          <motion.div
            className="flex items-center justify-center w-6 h-5 mr-0.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpanded(node.id);
            }}
            animate={{ rotate: hasChildren && isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {hasChildren && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </motion.div>

          {/* Node Icon */}
          {showIcons && (
            <motion.div
              className="flex items-center justify-center w-3 h-3 mr-0.5 text-muted-foreground"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.15 }}
            >
              {node.icon || getDefaultIcon()}
            </motion.div>
          )}

          {/* Label - Right 2/3 clickable for node selection */}
          <div 
            className="text-xs font-medium truncate flex-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleSelection(node.id, e.ctrlKey || e.metaKey);
              onNodeClick?.(node);
            }}
          >
            {typeof node.label === 'string' ? (
              <span>{node.label}</span>
            ) : (
              node.label
            )}
          </div>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: animateExpand ? 0.2 : 0,
                ease: "easeInOut",
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -5 }}
                animate={{ y: 0 }}
                exit={{ y: -5 }}
                transition={{
                  duration: animateExpand ? 0.15 : 0,
                  delay: animateExpand ? 0.05 : 0,
                }}
              >
                {node.children!.map((child, index) =>
                  renderNode(
                    child,
                    level + 1,
                    index === node.children!.length - 1,
                    currentPath,
                  ),
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );

    // Wrap with nodeWrapper if provided
    return nodeWrapper ? (
      <React.Fragment key={node.id}>{nodeWrapper(node, nodeContent)}</React.Fragment>
    ) : nodeContent;
  };

  return (
    <motion.div
      className={cn(
        "w-full bg-background",
        className,
      )}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="px-0.5 py-0">
        {data.map((node, index) =>
          renderNode(node, 0, index === data.length - 1),
        )}
      </div>
    </motion.div>
  );
}
