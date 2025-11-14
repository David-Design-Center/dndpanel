/**
 * Label filtering utilities for email list items
 * Matches FoldersColumn.tsx filtering rules
 */

export interface FilterableLabel {
  id: string;
  name: string;
  displayName?: string;
}

const SYSTEM_LABEL_NAMES = [
  'sent', 'drafts', 'draft', 'spam', 'trash', 'important', 
  'starred', 'unread', 'yellow_star', 'deleted messages', 
  'chat', 'blocked', '[imap]', 'junk e-mail', 'notes'
];

/**
 * Remove system and special labels (matches FoldersColumn.tsx)
 */
export function filterSystemLabels(labels: FilterableLabel[]): FilterableLabel[] {
  return labels.filter(label => {
    const name = (label.name || '').toLowerCase();
    return !SYSTEM_LABEL_NAMES.includes(name) &&
           !name.startsWith('category_') &&
           !name.startsWith('label_') &&
           !name.startsWith('[imap');
  });
}

/**
 * Remove direct INBOX label and normalize INBOX/ children
 */
export function normalizeInboxLabels(labels: FilterableLabel[]): Array<FilterableLabel & { displayName: string }> {
  return labels
    .filter(label => (label.name || '').toLowerCase() !== 'inbox')
    .map(label => {
      const rawName = label.name || '';
      const displayName = rawName.startsWith('INBOX/') ? rawName.substring(6) : rawName;
      return { ...label, displayName };
    })
    .filter(label => label.displayName.length > 0);
}

/**
 * Search labels by display name
 */
export function searchLabels<T extends { displayName: string }>(
  labels: T[],
  query: string
): T[] {
  if (!query) return labels;
  const lowerQuery = query.toLowerCase();
  return labels.filter(label => 
    label.displayName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sort labels alphabetically by display name
 */
export function sortLabelsByName<T extends { displayName: string }>(labels: T[]): T[] {
  return [...labels].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Complete label filtering pipeline
 * Combines all filtering, normalization, search, and sorting
 */
export function filterAndPrepareLabels(
  labels: FilterableLabel[],
  searchQuery: string = ''
): Array<FilterableLabel & { displayName: string }> {
  const systemFiltered = filterSystemLabels(labels);
  const normalized = normalizeInboxLabels(systemFiltered);
  const searched = searchLabels(normalized, searchQuery);
  return sortLabelsByName(searched);
}

/**
 * Check if search query has an exact match in filtered labels
 */
export function hasExactLabelMatch(
  labels: Array<{ displayName: string }>,
  searchQuery: string
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return false;
  return labels.some(l => l.displayName.toLowerCase() === q);
}
