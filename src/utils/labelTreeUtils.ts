/**
 * Shared label tree utilities
 * Used by FoldersColumn and EmailItemContextMenu for consistent hierarchical label display
 */

export interface NestedLabel {
  id: string;
  name: string; // Normalized label path (INBOX/ prefix removed)
  gmailName: string; // Canonical Gmail label name
  displayName: string; // Just the last segment (e.g., "AI chatgpt")
  fullPath: string; // Full path (e.g., "--DAVID/AI chatgpt")
  children: NestedLabel[];
  messagesUnread?: number;
  threadsUnread?: number;
  isLeaf: boolean;
  labelObj?: any | null;
}

interface LabelTreeNode {
  name: string;
  fullPath: string;
  fullName: string;
  labelObj: any | null;
  children: Map<string, LabelTreeNode>;
  isFolder: boolean;
  isLeaf: boolean;
  id: string;
  messagesUnread: number;
  threadsUnread?: number;
  gmailName?: string;
}

interface LabelInput {
  id: string;
  name: string;
  messagesUnread?: number;
  threadsUnread?: number;
}

const SYSTEM_LABEL_NAMES = [
  'sent', 'drafts', 'draft', 'spam', 'trash', 'important',
  'starred', 'unread', 'yellow_star', 'deleted messages',
  'chat', 'blocked', '[imap]', 'junk e-mail', 'notes'
];

/**
 * Build hierarchical tree structure from flat Gmail labels
 */
export function buildLabelTree(labels: LabelInput[], systemCounts?: Record<string, number>): NestedLabel[] {
  // Filter out system labels
  const userLabels = labels.filter((label) => {
    const name = label.name.toLowerCase();
    return (
      !SYSTEM_LABEL_NAMES.includes(name) &&
      !name.startsWith('category_') &&
      !name.startsWith('label_') &&
      !name.startsWith('[imap')
    );
  });

  if (userLabels.length === 0) return [];

  // Filter out direct INBOX label and process INBOX children
  const processedLabels = userLabels
    .filter((label) => label.name.toLowerCase() !== 'inbox')
    .map((label) => {
      const normalizedName = label.name.startsWith('INBOX/')
        ? label.name.substring(6)
        : label.name;
      return {
        label,
        normalizedName,
      };
    })
    .filter((item) => item.normalizedName.length > 0);

  // Step 1: Identify all parent paths dynamically
  const allNames = processedLabels.map((l) => l.normalizedName);
  const parentNames = new Set<string>();

  for (const fullName of allNames) {
    const parts = fullName.split('/');
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
    threadsUnread: 0,
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
          threadsUnread: 0,
          gmailName: undefined,
        };

        node.children.set(key, newNode);
      }

      node = node.children.get(key)!;
    }

    // At the leaf: assign the actual label data
    if (node && node !== root) {
      node.labelObj = label;
      const systemCount = systemCounts?.[label.id];
      const labelCount = label.messagesUnread;
      node.messagesUnread = systemCount || labelCount || 0;
      node.threadsUnread = label.threadsUnread ?? 0;
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
        threadsUnread: node.threadsUnread,
        isLeaf: node.children.size === 0,
        labelObj: node.labelObj,
      };

      result.push(nestedLabel);
    }

    // Sort by display name for consistent ordering
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  };

  return convertMapToArray(root.children);
}

/**
 * Filter tree nodes by search query, preserving parent paths for matches
 */
export function filterLabelTree(nodes: NestedLabel[], searchQuery: string): NestedLabel[] {
  if (!searchQuery.trim()) return nodes;
  
  const lowerQuery = searchQuery.toLowerCase();
  
  const filterNode = (node: NestedLabel): NestedLabel | null => {
    // Check if this node matches
    const nodeMatches = node.displayName.toLowerCase().includes(lowerQuery) ||
                       node.fullPath.toLowerCase().includes(lowerQuery);
    
    // Recursively filter children
    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((child): child is NestedLabel => child !== null);
    
    // Include node if it matches OR has matching descendants
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }
    
    return null;
  };
  
  return nodes
    .map(node => filterNode(node))
    .filter((node): node is NestedLabel => node !== null);
}

/**
 * Check if search query has an exact match in tree
 */
export function hasExactMatchInTree(nodes: NestedLabel[], searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return false;
  
  const checkNode = (node: NestedLabel): boolean => {
    if (node.displayName.toLowerCase() === q || node.fullPath.toLowerCase() === q) {
      return true;
    }
    return node.children.some(child => checkNode(child));
  };
  
  return nodes.some(node => checkNode(node));
}

/**
 * Flatten tree to get all label IDs (useful for searching)
 */
export function flattenLabelTree(nodes: NestedLabel[]): NestedLabel[] {
  const result: NestedLabel[] = [];
  
  const flatten = (node: NestedLabel) => {
    result.push(node);
    node.children.forEach(flatten);
  };
  
  nodes.forEach(flatten);
  return result;
}
