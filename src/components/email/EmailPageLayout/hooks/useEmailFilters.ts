/**
 * useEmailFilters Hook
 * 
 * Manages all email filtering and search functionality:
 * - Search query state and suggestions
 * - Active filters (unread, starred, attachments)
 * - Category selection
 * - Filter building for API calls
 * - Search handlers
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useState, useCallback } from 'react';
import { Email } from '@/types';
import { getEmails, CategoryFilterOptions } from '@/services/emailService';

interface SearchSuggestion {
  id: string;
  title: string;
  sender: string;
  snippet: string;
  timestamp: string;
}

type TabKey = 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail';

export interface UseEmailFiltersOptions {
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';
  labelName: string | null;
  activeTab: TabKey;
  allTabEmails: Record<TabKey, Email[]>;
  emails: Email[];
  setAllTabEmails: React.Dispatch<React.SetStateAction<Record<TabKey, Email[]>>>;
  setPageTokens: React.Dispatch<React.SetStateAction<Record<TabKey, string | undefined>>>;
  setPaginatedEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  handleRefresh: () => Promise<void>;
}

export interface UseEmailFiltersReturn {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchSuggestions: SearchSuggestion[];
  setSearchSuggestions: React.Dispatch<React.SetStateAction<SearchSuggestion[]>>;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  isSearching: boolean;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  activeSearchQuery: string;
  clearSearch: () => void;
  activeCategory: 'primary' | 'updates' | 'promotions' | 'social';
  activeFilters: {
    unread: boolean;
    starred: boolean;
    attachments: boolean;
  };
  fromFilter: string;
  dateRangeFilter: { start: string; end: string };
  buildFilters: () => CategoryFilterOptions;
  handleSearchInput: (value: string) => void;
  handleSuggestionSelect: (suggestion: SearchSuggestion) => void;
  handleSearchSubmit: (e: React.FormEvent) => Promise<void>;
  generateSimpleSearchSuggestions: (query: string) => SearchSuggestion[];
}

export function useEmailFilters(options: UseEmailFiltersOptions): UseEmailFiltersReturn {
  const {
    pageType,
    labelName,
    activeTab,
    allTabEmails,
    emails,
    setAllTabEmails,
    setPageTokens,
    setPaginatedEmails,
    handleRefresh
  } = options;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // Filter state
  const [activeCategory] = useState<'primary' | 'updates' | 'promotions' | 'social'>('primary');
  const [activeFilters] = useState({
    unread: false,
    starred: false,
    attachments: false
  });
  const [fromFilter] = useState('');
  const [dateRangeFilter] = useState({ start: '', end: '' });

  /**
   * Build filters object for category email API calls
   */
  const buildFilters = useCallback((): CategoryFilterOptions => ({
    unread: activeFilters.unread,
    starred: activeFilters.starred,
    attachments: activeFilters.attachments,
    from: fromFilter || undefined,
    dateRange: dateRangeFilter.start || dateRangeFilter.end ? dateRangeFilter : undefined,
    searchText: searchQuery || undefined
  }), [activeFilters, fromFilter, dateRangeFilter, searchQuery]);

  /**
   * Generate simple search suggestions based on current emails
   */
  const generateSimpleSearchSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (!query.trim()) return [];
    
    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Get current emails for context
    const currentEmails = (pageType === 'inbox' && !labelName) ? allTabEmails[activeTab] : emails;
    
    // Collect unique senders and subjects from current emails
    const senders = new Set<string>();
    const subjects = new Set<string>();
    
    currentEmails.forEach(email => {
      // Add sender suggestions
      if (email.from.name.toLowerCase().includes(lowerQuery)) {
        senders.add(email.from.name);
      }
      if (email.from.email.toLowerCase().includes(lowerQuery)) {
        senders.add(email.from.email);
      }
      
      // Add subject suggestions
      if (email.subject.toLowerCase().includes(lowerQuery)) {
        subjects.add(email.subject);
      }
    });
    
    // Convert sets to SearchSuggestion format
    let index = 0;
    
    // Add sender suggestions
    Array.from(senders).slice(0, 2).forEach(sender => {
      suggestions.push({
        id: `sender-${index++}`,
        title: sender,
        sender: 'Gmail Search',
        snippet: 'Search by sender',
        timestamp: new Date().toISOString()
      });
    });
    
    // Add subject suggestions
    Array.from(subjects).slice(0, 2).forEach(subject => {
      suggestions.push({
        id: `subject-${index++}`,
        title: subject,
        sender: 'Gmail Search',
        snippet: 'Search by subject',
        timestamp: new Date().toISOString()
      });
    });
    
    // Add Gmail operator suggestions
    const operatorSuggestions = [
      `${query}`,
      `from:${query}`,
      `subject:${query}`,
      `has:attachment ${query}`,
      `is:unread ${query}`,
      `is:important ${query}`,
    ];
    
    operatorSuggestions.slice(0, 4).forEach(op => {
      suggestions.push({
        id: `operator-${index++}`,
        title: op,
        sender: 'Gmail Search',
        snippet: 'Search operator',
        timestamp: new Date().toISOString()
      });
    });
    
    return suggestions.slice(0, 6);
  }, [pageType, labelName, allTabEmails, activeTab, emails]);

  /**
   * Handle search input changes - show suggestions immediately
   */
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      const suggestions = generateSimpleSearchSuggestions(value);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [generateSimpleSearchSuggestions]);

  /**
   * Handle suggestion selection - auto-submit search
   */
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const searchQuery = suggestion.title || suggestion.snippet;
    setSearchQuery(searchQuery);
    setShowSuggestions(false);
    
    // Automatically search when suggestion is selected
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setTimeout(() => handleSearchSubmit(fakeEvent), 100);
  }, []);

  /**
   * Handle search form submission
   */
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      // If empty search, just refresh current tab
      handleRefresh();
      return;
    }

    console.log(`🔍 Searching emails with query: "${searchQuery}"`);
    setIsSearching(true);
    setShowSuggestions(false); // Hide suggestions during search
    
    // Clear current emails to show loading state
    setPaginatedEmails([]);
    
    try {
      // Build Gmail search query with current filters
      const queryParts: string[] = [];
      
      // Add the search text
      queryParts.push(searchQuery.trim());
      
      // Add active filters
      if (activeFilters.unread) queryParts.push('is:unread');
      if (activeFilters.starred) queryParts.push('is:starred');
      if (activeFilters.attachments) queryParts.push('has:attachment');
      if (fromFilter) queryParts.push(`from:${fromFilter}`);
      if (dateRangeFilter.start) queryParts.push(`after:${dateRangeFilter.start.replace(/-/g, '/')}`);
      if (dateRangeFilter.end) queryParts.push(`before:${dateRangeFilter.end.replace(/-/g, '/')}`);
      
      const gmailQuery = queryParts.join(' ');
      
      // Fetch search results from Gmail
      const searchResults = await getEmails(true, gmailQuery, 50);
      
      // Update the current tab emails with search results
      setAllTabEmails(prev => ({
        ...prev,
        [activeTab]: searchResults.emails
      }));
      
      // Update paginated emails directly for immediate display
      setPaginatedEmails(searchResults.emails);
      
      // Update page tokens
      setPageTokens(prev => ({
        ...prev,
        [activeTab]: searchResults.nextPageToken
      }));
      
      console.log(`✅ Search completed: Found ${searchResults.emails.length} emails`);
      
      // Mark this query as active
      setActiveSearchQuery(searchQuery.trim());
      
    } catch (error) {
      console.error('❌ Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, activeFilters, fromFilter, dateRangeFilter, activeTab, setAllTabEmails, setPageTokens, setPaginatedEmails, handleRefresh]);

  /**
   * Clear search and return to normal inbox view
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setShowSuggestions(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    setSearchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    activeCategory,
    activeFilters,
    fromFilter,
    dateRangeFilter,
    buildFilters,
    handleSearchInput,
    handleSuggestionSelect,
    handleSearchSubmit,
    generateSimpleSearchSuggestions,
    activeSearchQuery,
    clearSearch
  };
}
