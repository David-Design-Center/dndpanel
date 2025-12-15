import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Settings,
  X,
  Trash2,
  Mail,
  MailOpen,
  FolderInput,
  MessageSquareWarning} from 'lucide-react';
import { useCompose } from '@/contexts/ComposeContext';
import { useEmailDnd } from '@/contexts/EmailDndContext';
import { useLabel } from '@/contexts/LabelContext';
import EmailListItem from './EmailListItem';
import MoveToFolderDialog from './MoveToFolderDialog';
import ThreeColumnLayout from '../layout/ThreeColumnLayout';
import { Email } from '../../types';
import {
  getSentEmails, 
  getDraftEmails, 
  deleteEmail,
  clearEmailCache
} from '../../services/emailService';
import { emailRepository } from '../../services/emailRepository';
import { useAuth } from '../../contexts/AuthContext';
import { useLayoutState } from '../../contexts/LayoutStateContext';
import { toast } from 'sonner';
// Import custom hooks
import { usePagination, useEmailFetch, useEmailSelection, useEmailFilters, useEmailCounts, useTabManagement } from './EmailPageLayout/hooks';
import { Table, TableBody } from '@/components/ui/table';

type EmailPageType = 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';

interface EmailPageLayoutProps {
  pageType: EmailPageType;
  title: string;
}

function EmailPageLayout({ pageType, title }: EmailPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGmailSignedIn, loading: authLoading, isGmailInitializing } = useAuth();
  const { selectEmail, setSystemFolderFilterHandler, selectedEmailId, clearSelection: clearViewSelection } = useLayoutState();
  const { openCompose } = useCompose();
  const { refreshLabels, incrementLabelUnreadCount } = useLabel();

  // Ref to preserve scroll position during state updates
  const emailListRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Handle pagination for Show All views - fetch more if needed
  const handleUnreadShowAllNextPage = async () => {
    const nextPage = unreadShowAllPage + 1;
    const startIdx = nextPage * SECTION_PAGE_SIZE;
    
    // Only fetch if we don't have enough emails for this page
    if (startIdx >= splitUnread.length && !isLoadingUnreadShowAll) {
      setIsLoadingUnreadShowAll(true);
      try {
        await loadMoreForTab('all');
      } finally {
        setIsLoadingUnreadShowAll(false);
      }
    }
    
    setUnreadShowAllPage(nextPage);
  };

  const handleReadShowAllNextPage = async () => {
    const nextPage = readShowAllPage + 1;
    const startIdx = nextPage * SECTION_PAGE_SIZE;
    
    // Only fetch if we don't have enough emails for this page
    if (startIdx >= splitRead.length && !isLoadingReadShowAll) {
      setIsLoadingReadShowAll(true);
      try {
        await loadMoreForTab('all');
      } finally {
        setIsLoadingReadShowAll(false);
      }
    }
    
    setReadShowAllPage(nextPage);
  };

  // Extract label name from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const labelName = urlParams.get('labelName');
  const labelQueryParam = urlParams.get('labelQuery');
  const labelIdParam = urlParams.get('labelId');
  const effectiveLabelQuery = labelQueryParam || labelName || undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  // const [searchQuery, setSearchQuery] = useState(''); // NOW FROM useEmailFilters
  // const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]); // NOW FROM useEmailFilters
  // const [showSuggestions, setShowSuggestions] = useState(false); // NOW FROM useEmailFilters
  // const [isSearching, setIsSearching] = useState(false); // NOW FROM useEmailFilters
  // const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail'>('all'); // NOW FROM useTabManagement
  const [hasEverLoaded, setHasEverLoaded] = useState(false); // Track if we've ever successfully loaded
  // Inbox split view mode: show Unread and Everything Else side-by-side vertically, or expand one
  // const [inboxViewMode, setInboxViewMode] = useState<'split' | 'unread' | 'read'>('split'); // NOW FROM useTabManagement
  // Layout preference: 'list' (single column) or 'split' (unread/read sections)
  const [layoutMode] = useState<'list' | 'split'>('list');
  
  // Placeholder for tab management (initialized after emailFetch for loadMoreForTab dependency)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail'>('all');
  const [inboxViewMode, setInboxViewMode] = useState<'split' | 'unread' | 'read'>('split');
  
  // ========== PAGINATION (Extracted to usePagination hook) ==========
  const pagination = usePagination({
    isGmailSignedIn,
    isGmailInitializing,
    activeTab,
    labelName,
    labelQueryParam,
    labelIdParam,
    pageType,
    setLoading,
    emailListRef
  });
  
  // Destructure for backwards compatibility
  const {
    paginatedEmails,
    setPaginatedEmails,
    nextPageToken,
    setNextPageToken,
    isLoadingMore,
    loadPaginatedEmails,
    handleLoadMore
  } = pagination;


  // Feature flags – client wants all under Inbox, no category tabs, no Focused/Other
  const CATEGORIES_ENABLED = false;
  const FOCUSED_TOGGLE_ENABLED = false;
  
  // Temp placeholders for cross-dependent hooks
  const handleRefreshPlaceholder = async () => {};
  const buildFiltersPlaceholder = () => ({});

  const emailFetch = useEmailFetch({
    isGmailSignedIn,
    authLoading,
    isGmailInitializing,
    pageType,
    labelName,
    labelQueryParam,
    labelIdParam,
    setLoading,
    setHasEverLoaded,
    buildFilters: buildFiltersPlaceholder,
    CATEGORIES_ENABLED
  });
  
  // Destructure for backwards compatibility
  const {
    allTabEmails,
    setAllTabEmails,
    tabLoaded,
    emailCounts,
    setEmailCounts,
    categoryEmails,
    setCategoryEmails,
    setPageTokens,
    hasMoreForTabs,
    setHasMoreForTabs,
    emails,
    setEmails,
    fetchLabelEmails,
    loadMoreForTab
  } = emailFetch;
  
  // ========== EMAIL FILTERS (Extracted to useEmailFilters hook) ==========
  const emailFilters = useEmailFilters({
    pageType,
    labelName,
    activeTab,
    allTabEmails,
    emails,
    setAllTabEmails,
    setPageTokens,
    setPaginatedEmails,
    handleRefresh: handleRefreshPlaceholder
  });
  
  // Destructure for backwards compatibility
  const {
    searchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    activeCategory,
    activeFilters,
    handleSearchInput,
    handleSuggestionSelect,
    handleSearchSubmit,
    activeSearchQuery,
    clearSearch
  } = emailFilters;
  
  // ========== EMAIL COUNTS (Extracted to useEmailCounts hook) ==========
  const emailCountsHook = useEmailCounts({
    pageType,
    labelName,
    allTabEmails,
    paginatedEmails,
    emailCounts,
    setEmailCounts
  });
  
  // Destructure for backwards compatibility
  const {
    unreadCount,
    draftsCount,
    trashCount
  } = emailCountsHook;
  
  // ========== EMAIL SELECTION (Extracted to useEmailSelection hook) ==========
  const emailSelection = useEmailSelection({
    pageType,
    labelName,
    labelIdParam,
    emails,
    allTabEmails,
    setAllTabEmails,
    setCategoryEmails,
    setEmails,
    // 🔧 BULK DELETE FIX (Dec 2025): Additional options for complete bulk delete behavior
    setPaginatedEmails,
    paginatedEmails,
    incrementLabelUnreadCount,
    selectedEmailId,
    clearViewSelection,
    navigate
  });
  
  // Destructure for backwards compatibility
  const {
    selectedEmails,
    setSelectedEmails,
    sectionSelectedEmails,
    setSectionSelectedEmails,
    handleToggleSelectEmail,
    handleDeleteSelected,
    handleMarkReadSelected,
    handleMarkUnreadSelected,
    handleMoveSelected,
    clearSelection
  } = emailSelection;
  
  // ========== TAB MANAGEMENT (Extracted to useTabManagement hook) ==========
  const tabManagement = useTabManagement({
    pageType,
    labelName,
    inboxViewMode,
    setInboxViewMode,
    setActiveTab,
    tabLoaded,
    setSystemFolderFilterHandler,
    loadMoreForTab,
    clearSelection
  });
  
  // Destructure tab management utilities
  const {
    switchInboxViewMode
  } = tabManagement;
  
  // Toolbar filter state
  const [] = useState(false);
  // const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set()); // NOW FROM useEmailSelection
  const [] = useState({
    from: '',
    hasAttachment: false,
    dateRange: { start: '', end: '' }
  });
  
  // Move to folder dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Focused/Other partitioning logic
  const calculateFocusedScore = (email: Email): number => {
    let score = 0;

    // From frequent contacts / in Contacts → +3
    // For now, we'll use heuristics based on email patterns
    const senderEmail = email.from.email.toLowerCase();
    const senderDomain = senderEmail.split('@')[1] || '';
    
    // Personal domains and common email providers get higher score
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];
    if (personalDomains.includes(senderDomain)) {
      score += 1;
    }

    // Avoid no-reply and automated senders
    if (!senderEmail.includes('noreply') && !senderEmail.includes('no-reply') && 
        !senderEmail.includes('support') && !senderEmail.includes('notification')) {
      score += 1;
    }

    // label:IMPORTANT → +2
    if (email.labelIds?.includes('IMPORTANT')) {
      score += 2;
    }

    // Starred emails are likely important → +2
    if (email.labelIds?.includes('STARRED')) {
      score += 2;
    }

    // To me only (not bulk) → +2
    // Check if it's likely a personal email (single recipient, not marketing)
    if (email.to && email.to.length === 1) {
      score += 1;
    }

    // Not category:promotions|social → +1
    // We can infer category from the current active category
  const isPromotionsOrSocial = CATEGORIES_ENABLED && (activeCategory === 'promotions' || activeCategory === 'social');
    if (!isPromotionsOrSocial) {
      score += 1;
    }

    // Contains "unsubscribe" → −2
    const bodyText = email.body?.toLowerCase() || '';
    const subjectText = email.subject?.toLowerCase() || '';
    if (bodyText.includes('unsubscribe') || subjectText.includes('unsubscribe')) {
      score -= 2;
    }

    // Additional negative signals for bulk/marketing emails
    const marketingKeywords = ['newsletter', 'promotion', 'sale', 'offer', 'deal', 'discount', 'limited time', 'act now'];
    const hasMarketingKeywords = marketingKeywords.some(keyword => 
      bodyText.includes(keyword) || subjectText.includes(keyword)
    );
    if (hasMarketingKeywords) {
      score -= 1;
    }

    // Automated emails get lower score
    const automatedKeywords = ['automated', 'automatic', 'noreply', 'do not reply', 'system generated'];
    const isAutomated = automatedKeywords.some(keyword => 
      bodyText.includes(keyword) || subjectText.includes(keyword) || senderEmail.includes(keyword.replace(' ', ''))
    );
    if (isAutomated) {
      score -= 1;
    }

    // Long recipient lists suggest bulk emails → −1
    if (email.to && email.to.length > 5) {
      score -= 1;
    }

    return score;
  };

  const partitionEmailsByFocus = (emails: Email[]): { focused: Email[], other: Email[] } => {
    const focused: Email[] = [];
    const other: Email[] = [];

    emails.forEach(email => {
      const score = calculateFocusedScore(email);
      if (score >= 1) { // Lowered threshold to be less restrictive
        focused.push(email);
      } else {
        other.push(email);
      }
    });

    return { focused, other };
  };

  // Focused/Other counts removed (feature disabled)
  
  // Inbox filtering mode removed (always 'all')

  // DND Setup
  // Track explicit tab-level loading (distinct from global optimized first paint)
  const [tabLoading, setTabLoading] = useState<string | null>(null);

  // Register email source with DnD context for drag-to-folder functionality
  const { registerEmailSource } = useEmailDnd();
  
  // Memoize getters to prevent infinite re-registration
  // Use paginatedEmails which is the actual displayed list
  const getEmailsForDnd = useCallback(() => {
    return paginatedEmails.length > 0 ? paginatedEmails : emails;
  }, [paginatedEmails, emails]);
  
  const getSelectedIdsForDnd = useCallback(() => selectedEmails, [selectedEmails]);
  
  // Register with DnD context
  useEffect(() => {
    registerEmailSource(getEmailsForDnd, getSelectedIdsForDnd);
  }, [registerEmailSource, getEmailsForDnd, getSelectedIdsForDnd]);

  const handleRefresh = async () => {
    if (!isGmailSignedIn || refreshCooldown) return;
    
    setRefreshing(true);
    setRefreshCooldown(true);
    setIsRefreshLoading(true);
    
    // Clear pagination to fetch fresh emails
    setPaginatedEmails([]);
    setNextPageToken(undefined);
    
    // Clear email cache to ensure fresh data
    clearEmailCache();
    
    // ✅ Use pagination for all cases (labels and inbox)
    await loadPaginatedEmails(undefined, false); // Reload first page
    
    // ✅ Also refresh label counts (Inbox, Drafts, etc.) to sync counters
    // systemOnly=true to preserve custom label counters
    await refreshLabels(true, true);
    
    setRefreshing(false);
    setIsRefreshLoading(false);
    
    // 2 second cooldown before allowing another refresh
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 2000);
  };

  const handleRefreshCurrentTab = async () => {
    if (!isGmailSignedIn || refreshing || refreshCooldown) return;
    
    setRefreshing(true);
    setRefreshCooldown(true);
    
    try {
      // Clear relevant caches to ensure fresh data
      clearEmailCache();
      
      // Clear pagination to fetch fresh emails
      setPaginatedEmails([]);
      setNextPageToken(undefined);
      
      // ✅ Use pagination for all cases - single source of truth
      console.log(`🔄 Refreshing: ${labelName ? `label "${labelName}"` : `tab "${activeTab}"`}`);
      await loadPaginatedEmails(undefined, false);
      
      // ✅ Also refresh label counts (Inbox, Drafts, etc.) to sync counters
      // systemOnly=true to preserve custom label counters
      await refreshLabels(true, true);
      
      // Show success message
      toast.success('Refreshed successfully', {
        description: `${labelName ? `Folder "${labelName}"` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} emails updated`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('Error refreshing current tab:', error);
      toast.error('Failed to refresh', {
        description: 'Please check your connection and try again',
        duration: 4000
      });
    } finally {
      setRefreshing(false);
      
      // 2 second cooldown before allowing another refresh
      setTimeout(() => {
        setRefreshCooldown(false);
      }, 2000);
    }
  };
  // Fallback: when activeTab changes to sent/drafts and list is still empty after initial attempts, force a fetch
  // Also refresh drafts when switching to drafts tab to ensure latest state
  useEffect(() => {
    // Throttle repeated empty-drafts fallback fetches
    const lastDraftFetchRef = (EmailPageLayout as any)._lastDraftFallbackRef || { current: 0 };
    if (!(EmailPageLayout as any)._lastDraftFallbackRef) {
      (EmailPageLayout as any)._lastDraftFallbackRef = lastDraftFetchRef;
    }
    const run = async () => {
      if (pageType !== 'inbox' || labelName) return;
      if (activeTab === 'sent' && allTabEmails.sent.length === 0 && !tabLoading) {
        setTabLoading('sent');
        try {
          const sentResp = await getSentEmails(true, 50);
          setAllTabEmails(prev => ({ ...prev, sent: sentResp.emails || [] }));
          setPageTokens(prev => ({ ...prev, sent: sentResp.nextPageToken }));
          setHasMoreForTabs(prev => ({ ...prev, sent: !!sentResp.nextPageToken }));
        } finally {
          setTabLoading(null);
        }
      }
      // Always refresh drafts when switching to drafts tab (not just when empty)
      if (activeTab === 'drafts' && !tabLoading) {
        const now = Date.now();
        if (now - lastDraftFetchRef.current < 5000) { // 5s cooldown to prevent rapid refreshes
          return;
        }
        lastDraftFetchRef.current = now;
        setTabLoading('drafts');
        try {
          console.log('🔄 Refreshing drafts list...');
          const draftList = await getDraftEmails(true);
          setAllTabEmails(prev => ({ ...prev, drafts: draftList || [] }));
          setHasMoreForTabs(prev => ({ ...prev, drafts: (draftList?.length || 0) > 20 }));
          console.log('✅ Drafts refreshed:', draftList?.length || 0, 'drafts');
        } finally {
          setTabLoading(null);
        }
      }
    };
    run();
  }, [activeTab, pageType, labelName, tabLoading]);

  // Listen for draft events from Compose window
  useEffect(() => {
    const handleDraftCreated = async (event: CustomEvent) => {
      console.log('📨 Draft created event received:', event.detail);
      const { draftId } = event.detail;
      
      // Always add draft to state (regardless of current tab)
      try {
        // Fetch the draft details
        const response = await window.gapi.client.gmail.users.drafts.get({
          userId: 'me',
          id: draftId,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        
        if (response.result?.message) {
          const message = response.result.message;
          const headers = message.payload?.headers || [];
          
          // Convert to Email format
          const getHeader = (name: string) => {
            const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
            return header?.value || '';
          };
          
          const draftEmail: Email = {
            id: message.id,
            threadId: message.threadId || message.id,
            subject: getHeader('Subject') || '(No Subject)',
            from: { name: getHeader('From'), email: getHeader('From') },
            to: [{ name: getHeader('To'), email: getHeader('To') }],
            cc: [],
            date: new Date(parseInt(message.internalDate || '0')).toISOString(),
            internalDate: message.internalDate || '0',
            body: '',
            preview: '',
            isRead: false,
            labelIds: message.labelIds || ['DRAFT'],
            attachments: []
          };
          
          // Add to repository
          emailRepository.addEmail(draftEmail);
          
          // Update drafts list (always, not just when viewing drafts)
          setAllTabEmails(prev => ({
            ...prev,
            drafts: [draftEmail, ...prev.drafts]
          }));
          
          // If currently viewing drafts (not a custom label), add to paginated list too
          if ((activeTab === 'drafts' || pageType === 'drafts') && !labelName) {
            setPaginatedEmails(prev => [draftEmail, ...prev]);
            console.log('📨 Draft added to paginated list (viewing drafts)');
          }
          
          console.log('✅ Draft added to UI:', draftId);
        }
      } catch (error) {
        console.error('❌ Failed to fetch draft:', error);
        // Fallback: clear cache to trigger refresh when user navigates to drafts
        clearEmailCache();
      }
    };

    const handleDraftUpdated = (event: CustomEvent) => {
      const { oldDraftId, newDraftId } = event.detail;
      console.log('📨 Draft updated event received:', oldDraftId, '->', newDraftId);
      
      // If Gmail changed the draft ID, we need to update our UI
      if (oldDraftId !== newDraftId) {
        // Remove old draft from repository
        emailRepository.deleteEmail(oldDraftId);
        // Remove from UI
        setAllTabEmails(prev => ({
          ...prev,
          drafts: prev.drafts.filter(d => d.id !== oldDraftId)
        }));
        // The new draft will appear on next refresh/fetch
        clearEmailCache();
      }
    };

    window.addEventListener('draft-created', handleDraftCreated as any);
    window.addEventListener('draft-updated', handleDraftUpdated as any);

    return () => {
      window.removeEventListener('draft-created', handleDraftCreated as any);
      window.removeEventListener('draft-updated', handleDraftUpdated as any);
    };
  }, [activeTab, pageType]);

  // Separate effect for email deletion to ensure fresh state access
  useEffect(() => {
    const handleDraftDeleted = (event: CustomEvent<{ emailId: string }>) => {
      const { emailId } = event.detail;
      console.log('🗑️ Draft deleted event received:', emailId);
      
      // Remove from all tabs
      setAllTabEmails(prev => {
        const filterEmail = (emails: Email[]) => emails.filter(e => e.id !== emailId);
        return {
          all: filterEmail(prev.all),
          unread: filterEmail(prev.unread),
          trash: filterEmail(prev.trash),
          drafts: filterEmail(prev.drafts),
          sent: filterEmail(prev.sent || []),
          important: filterEmail(prev.important || []),
          starred: filterEmail(prev.starred || []),
          spam: filterEmail(prev.spam || []),
          allmail: filterEmail(prev.allmail || [])
        };
      });
      
      // Remove from paginated emails (immediate UI update)
      setPaginatedEmails(prev => {
        console.log('🔍 Removing email ID:', emailId);
        console.log('🔍 Current emails:', prev.map(e => e.id));
        const filtered = prev.filter(e => e.id !== emailId);
        console.log('🔍 Filtered:', filtered.length, 'emails (removed:', prev.length - filtered.length, ')');
        return filtered;
      });
      
      // Clear cache
      clearEmailCache();
      
      console.log('✅ Draft removed from UI');
    };

    window.addEventListener('email-deleted', handleDraftDeleted as any);

    return () => {
      window.removeEventListener('email-deleted', handleDraftDeleted as any);
    };
  }, []); // No dependencies - always has fresh state via functional updates

  // Handle label deletion - navigate away if viewing deleted label
  useEffect(() => {
    const handleLabelDeleted = (event: CustomEvent<{ labelId: string; labelName: string }>) => {
      const { labelId, labelName: deletedLabelName } = event.detail;
      console.log('🗑️ Label deleted event received:', labelId, deletedLabelName);
      
      // Check if we're currently viewing this label
      if (labelIdParam === labelId || labelName === deletedLabelName) {
        console.log('📍 Currently viewing deleted label, navigating to inbox...');
        
        // Clear the email list
        setPaginatedEmails([]);
        setEmails([]);
        
        // Navigate to inbox
        navigate('/inbox');
      }
    };

    window.addEventListener('label-deleted', handleLabelDeleted as any);

    return () => {
      window.removeEventListener('label-deleted', handleLabelDeleted as any);
    };
  }, [labelIdParam, labelName, navigate, setPaginatedEmails, setEmails]);

  // Handle emails moved via drag & drop - immediate UI update
  useEffect(() => {
    const handleEmailsMoved = (event: CustomEvent<{ emailIds: string[]; targetFolder: string; targetFolderName: string }>) => {
      const { emailIds } = event.detail;
      console.log('📦 Emails moved event received:', emailIds.length, 'emails');
      
      // Remove moved emails from paginated list (optimistic UI update)
      setPaginatedEmails(prev => {
        const filtered = prev.filter(e => !emailIds.includes(e.id));
        console.log(`📦 Removed ${prev.length - filtered.length} emails from list`);
        return filtered;
      });
      
      // Also remove from allTabEmails
      setAllTabEmails(prev => {
        const filterEmails = (emails: Email[]) => emails.filter(e => !emailIds.includes(e.id));
        return {
          all: filterEmails(prev.all),
          unread: filterEmails(prev.unread),
          trash: filterEmails(prev.trash),
          drafts: filterEmails(prev.drafts),
          sent: filterEmails(prev.sent || []),
          important: filterEmails(prev.important || []),
          starred: filterEmails(prev.starred || []),
          spam: filterEmails(prev.spam || []),
          allmail: filterEmails(prev.allmail || [])
        };
      });
    };

    const handleClearSelection = () => {
      console.log('📦 Clear selection event received');
      setSelectedEmails(new Set());
    };

    window.addEventListener('emails-moved', handleEmailsMoved as any);
    window.addEventListener('clear-email-selection', handleClearSelection);

    return () => {
      window.removeEventListener('emails-moved', handleEmailsMoved as any);
      window.removeEventListener('clear-email-selection', handleClearSelection);
    };
  }, [setPaginatedEmails, setAllTabEmails, setSelectedEmails]);

  // Pagination settings & state for toolbar chevrons
  const PAGE_SIZE = 25;
  const [pageIndex, setPageIndex] = useState(0);

  // Section expansion state for Show All mode
  // const [sectionSelectedEmails, setSectionSelectedEmails] = useState<Set<string>>(new Set()); // NOW FROM useEmailSelection
  
  // Separate pagination for each expanded section (Show All)
  const [unreadShowAllPage, setUnreadShowAllPage] = useState(0);
  const [readShowAllPage, setReadShowAllPage] = useState(0);
  const [isLoadingUnreadShowAll, setIsLoadingUnreadShowAll] = useState(false);
  const [isLoadingReadShowAll, setIsLoadingReadShowAll] = useState(false);
  const [isRefreshLoading, setIsRefreshLoading] = useState(false);
  const SECTION_PAGE_SIZE = 25; // Show 25 emails per page
  
  // Old handleLoadMore removed; pagination now via toolbar chevrons fetching more when needed.

  // const lastUnread24hRef = useRef<number>(-1); // NOW IN useEmailCounts

  const supportsCategoryTabs = CATEGORIES_ENABLED && ['all', 'spam', 'trash'].includes(activeTab);
  const folderContextForTab: 'all' | 'spam' | 'trash' = (() => {
    switch (activeTab) {
      case 'spam':
        return 'spam';
      case 'trash':
        return 'trash';
      default:
        return 'all';
    }
  })();

  // Get current emails based on active tab and category selection
  const getCurrentEmails = (): Email[] => {
    // For label pages, use the emails array
    if (pageType !== 'inbox' || labelName) {
      return emails;
    }

    const folderContext = folderContextForTab;

  // For category-enabled tabs (all/inbox, archive, spam, trash), show category emails if available
    
    let currentEmails: Email[] = [];
    if (supportsCategoryTabs && categoryEmails[folderContext][activeCategory]?.length > 0) {
      // Show category emails if they exist
      currentEmails = categoryEmails[folderContext][activeCategory];
    } else {
      // Fall back to folder emails
      currentEmails = allTabEmails[activeTab];
    }

    // Defensive gating: ensure each tab only renders items matching its semantics
    const hasLabel = (e: Email, label: string) => (e.labelIds || []).includes(label);
    switch (activeTab) {
      case 'all':
        // Inbox All should never show Sent/Spam/Trash even if arrays mixed
        currentEmails = currentEmails.filter(e => !hasLabel(e, 'SENT') && !hasLabel(e, 'SPAM') && !hasLabel(e, 'TRASH'));
        break;
      case 'important':
        currentEmails = currentEmails.filter(e => e.isImportant || hasLabel(e, 'IMPORTANT'));
        break;
      case 'starred':
        currentEmails = currentEmails.filter(e => e.isStarred || hasLabel(e, 'STARRED'));
        break;
      case 'sent':
        currentEmails = currentEmails.filter(e => hasLabel(e, 'SENT'));
        break;
      case 'trash':
        currentEmails = currentEmails.filter(e => hasLabel(e, 'TRASH'));
        break;
      case 'spam':
        currentEmails = currentEmails.filter(e => hasLabel(e, 'SPAM'));
        break;
      case 'allmail':
        // All Mail = exclude Spam/Trash
        currentEmails = currentEmails.filter(e => !hasLabel(e, 'SPAM') && !hasLabel(e, 'TRASH'));
        break;
      default:
        break;
    }

    // Apply focused/other partitioning if category tabs are supported
  if (FOCUSED_TOGGLE_ENABLED && supportsCategoryTabs && currentEmails.length > 0) {
      const { focused } = partitionEmailsByFocus(currentEmails);
      return focused; // default to focused list when toggle is disabled
    }

    return currentEmails;
  };

  // Always use paginated emails now (split view disabled)
  const filteredEmails = paginatedEmails.length > 0 ? paginatedEmails : getCurrentEmails();
  
  // For infinite scroll list view, use paginatedEmails directly
  // ✅ Always use paginatedEmails for list view (layoutMode hardcoded to 'list')
  const emailsToDisplay = paginatedEmails;
  
  // Apply Unread/Starred/Attachments chips as client-side filters
  const applyChipFilters = (items: Email[]): Email[] => {
    return items.filter(email => {
      if (activeFilters.unread && email.isRead) return false;
      if (activeFilters.starred && !(email.labelIds || []).includes('STARRED')) return false;
      if (activeFilters.attachments && !(email.attachments && email.attachments.length > 0)) return false;
      return true;
    });
  };

  const chipFilteredEmails = applyChipFilters(filteredEmails);
  // Only apply chips in Inbox "all" tab; show raw lists for other tabs
  // Also respect layoutMode preference
  const isSplitInbox = pageType === 'inbox' && !labelName && activeTab === 'all' && layoutMode === 'split';
  const baseVisible = isSplitInbox ? chipFilteredEmails : filteredEmails;

  // Split source should only be used for Inbox > All; other tabs should not use inbox "all" data
  const splitSourceRaw = isSplitInbox ? (allTabEmails.all || []) : baseVisible;
  const splitSource = isSplitInbox
    ? splitSourceRaw.filter(e => !(e.labelIds || []).some(id => id === 'SENT' || id === 'SPAM' || id === 'TRASH'))
    : splitSourceRaw;

  // Split inbox lists for split view (Unread vs Everything else)
  const twentyFourHoursAgoMs = Date.now() - 24 * 60 * 60 * 1000;
  const getEmailTimeMs = (email: Email): number => {
    const internal = (email as any)?.internalDate;
    if (internal != null) {
      const numeric = typeof internal === 'string' ? Number.parseInt(internal, 10) : Number(internal);
      if (!Number.isNaN(numeric)) return numeric;
    }
    if (email.date) {
      const parsed = new Date(email.date).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
  };
  const isWithin24h = (email: Email): boolean => getEmailTimeMs(email) >= twentyFourHoursAgoMs;

  const splitUnread = useMemo(() => {
    // Unread section: only unread emails from last 24h
    return splitSource.filter(e => !e.isRead && isWithin24h(e));
  }, [splitSource, twentyFourHoursAgoMs]);

  const splitRead = useMemo(() => {
    // Everything else: all read emails + old unread (older than 24h)
    const result = splitSource.filter(e => e.isRead || (e.isRead === false && !isWithin24h(e)));
    return result;
  }, [splitSource, twentyFourHoursAgoMs]);

  const totalLoadedEmails = baseVisible.length;
  const maxPageIndex = Math.max(0, Math.floor(Math.max(0, totalLoadedEmails - 1) / PAGE_SIZE));
  useEffect(() => {
    if (pageIndex > maxPageIndex) setPageIndex(maxPageIndex);
  }, [pageIndex, maxPageIndex]);

  useEffect(() => {
    setPageIndex(0);
  }, [pageType, labelName, activeTab, activeFilters.unread, activeFilters.attachments, activeFilters.starred, searchQuery, activeCategory]);

  const visibleEmails = baseVisible.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const allVisibleSelected = useMemo(() => (
    visibleEmails.length > 0 && visibleEmails.every(email => selectedEmails.has(email.id))
  ), [visibleEmails, selectedEmails]);
  const anyVisibleSelected = useMemo(() => (
    visibleEmails.some(email => selectedEmails.has(email.id))
  ), [visibleEmails, selectedEmails]);

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    selectAllCheckboxRef.current.indeterminate = anyVisibleSelected && !allVisibleSelected;
  }, [anyVisibleSelected, allVisibleSelected]);

  // Get current has more status - consider both folder and category pagination
  // getCurrentHasMore temporarily removed with toolbar extraction

  // const currentHasMore = getCurrentHasMore(); // no longer needed directly in render; used implicitly for next-page fetch

  console.log('📧 Current state:', {
    activeTab,
    filteredEmailsLength: filteredEmails.length,
    loading,
    authLoading,
    isGmailInitializing,
    isGmailSignedIn,
    hasEverLoaded,
    isSearching,
    unreadCount,
    draftsCount,
    trashCount
  });

  // Draft counter now uses Gmail API labels directly (via LabelContext)
  // No need to emit events - FoldersColumn reads from label.messagesTotal

  const handleEmailClick = (id: string) => {
    // Drafts: check if it's a reply draft (has threadId) or new draft
    // Note: Only treat as draft when NOT viewing a custom label (labelName is null)
    if ((pageType === 'drafts' || activeTab === 'drafts') && !labelName) {
      // Find the draft email to check if it has a threadId
      const draftEmail = filteredEmails.find(e => e.id === id);
      
      // Check if it's a reply draft by verifying the thread has other messages
      const hasRealThread = draftEmail?.threadId && draftEmail.threadId !== draftEmail.id;
      
      if (hasRealThread) {
        // Verify the thread actually has more than just the draft
        (async () => {
          try {
            const threadResponse = await window.gapi.client.gmail.users.threads.get({
              userId: 'me',
              id: draftEmail.threadId,
              format: 'metadata'
            });
            
            const messages = threadResponse.result?.messages || [];
            const nonDraftMessages = messages.filter((msg: any) => 
              !msg.labelIds?.includes('DRAFT')
            );
            
            if (nonDraftMessages.length > 0) {
              // Real thread with previous messages - open thread view
              console.log('📝 Reply draft detected (thread has', nonDraftMessages.length, 'messages), opening thread view');
              navigate(`/inbox/email/${draftEmail.threadId}?draft=${id}`);
              if (draftEmail.threadId) {
                selectEmail(draftEmail.threadId);
              }
            } else {
              // Thread only contains this draft - open compose
              console.log('📝 Standalone draft detected (thread only has draft), opening compose:', id);
              openCompose(id);
            }
          } catch (error) {
            console.error('Error checking thread:', error);
            // On error, assume it's standalone and open compose
            console.log('📝 Error checking thread, opening compose as fallback:', id);
            openCompose(id);
          }
        })();
        return;
      } else {
        // Standalone draft (new email) - open compose modal
        console.log('📝 Standalone draft detected (no thread or thread=id), opening compose:', id);
        openCompose(id);
        return;
      }
    } else if (labelName) {
      // For label emails, navigate to inbox with label-specific parameters
      const params = new URLSearchParams({ labelName });
      if (labelQueryParam) {
        params.set('labelQuery', labelQueryParam);
      }
      if (labelIdParam) {
        params.set('labelId', labelIdParam);
      }
      navigate(`/inbox/email/${id}?${params.toString()}`);
    } else {
      navigate(`/${pageType}/email/${id}`);
    }
    selectEmail(id);
  };

  const handleEmailUpdate = (updatedEmail: Email) => {
    console.log(`🔄 EmailPageLayout: updating email ${updatedEmail.id} - isRead: ${updatedEmail.isRead}`);
    
    // Preserve scroll position before updating state
    if (emailListRef.current) {
      scrollPositionRef.current = emailListRef.current.scrollTop;
    }

    // UPDATE PAGINATED EMAILS (for list view)
    setPaginatedEmails(prev => 
      prev.map(e => e.id === updatedEmail.id ? updatedEmail : e)
    );

    if (pageType === 'inbox' && !labelName) {
      // Update in all relevant tab arrays
      setAllTabEmails(prev => {
        const isReadNow = updatedEmail.isRead;
        return {
          ...prev,
          unread: isReadNow
            ? prev.unread.filter(e => e.id !== updatedEmail.id)
            : prev.unread.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          all: prev.all.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          sent: prev.sent.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          drafts: prev.drafts.map(e => e.id === updatedEmail.id ? updatedEmail : e),
            trash: prev.trash.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          important: prev.important.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          starred: prev.starred.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          spam: prev.spam.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          allmail: prev.allmail.map(e => e.id === updatedEmail.id ? updatedEmail : e)
        };
      });
      
      // Also update category emails
      setCategoryEmails((prev: any) => ({
        all: {
          primary: prev.all.primary.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          updates: prev.all.updates.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          promotions: prev.all.promotions.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          social: prev.all.social.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email)
        },
        spam: {
          primary: prev.spam.primary.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          updates: prev.spam.updates.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          promotions: prev.spam.promotions.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          social: prev.spam.social.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email)
        },
        trash: {
          primary: prev.trash.primary.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          updates: prev.trash.updates.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          promotions: prev.trash.promotions.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email),
          social: prev.trash.social.map((email: Email) => email.id === updatedEmail.id ? updatedEmail : email)
        }
      }));
      
      // Update unread count if an email was marked as read/unread
      const currentEmail = allTabEmails.unread.find(email => email.id === updatedEmail.id);
      if (currentEmail && !currentEmail.isRead && updatedEmail.isRead) {
        setEmailCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      } else if ((!currentEmail || currentEmail.isRead) && !updatedEmail.isRead) {
        setEmailCounts(prev => ({
          ...prev,
          unread: prev.unread + 1
        }));
      }
    } else {
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === updatedEmail.id ? updatedEmail : email
        )
      );
    }

    // Restore scroll position after state update (only in single-list view)
    setTimeout(() => {
      if (inboxViewMode !== 'split' && emailListRef.current && scrollPositionRef.current > 0) {
        emailListRef.current.scrollTop = scrollPositionRef.current;
      }
    }, 0);
  };

  const handleEmailDelete = async (emailId: string) => {
    try {
      // Get the email details for the toast before deletion
      let emailSubject = 'Email';
      if (pageType === 'inbox' && !labelName) {
        // Find the email in the current tab to get the subject
        const currentEmails = allTabEmails[activeTab];
        const emailToDelete = currentEmails.find(email => email.id === emailId);
        if (emailToDelete) {
          emailSubject = emailToDelete.subject || 'Email';
        }
      } else {
        const emailToDelete = emails.find(email => email.id === emailId);
        if (emailToDelete) {
          emailSubject = emailToDelete.subject || 'Email';
        }
      }

      // Delete the email via API
      await deleteEmail(emailId);

      // ✨ FIX: Also remove from repository (single source of truth)
      emailRepository.deleteEmail(emailId);

      // REMOVE FROM PAGINATED EMAILS (for list view)
      setPaginatedEmails(prev => prev.filter(email => email.id !== emailId));

      // Remove from local state
      if (pageType === 'inbox' && !labelName) {
        // Remove from all relevant tab arrays
        setAllTabEmails(prev => ({
          all: prev.all.filter(email => email.id !== emailId),
          unread: prev.unread.filter(email => email.id !== emailId),
          sent: prev.sent.filter(email => email.id !== emailId),
          drafts: prev.drafts.filter(email => email.id !== emailId),
          trash: prev.trash.filter(email => email.id !== emailId),
          important: prev.important.filter(email => email.id !== emailId),
          starred: prev.starred.filter(email => email.id !== emailId),
          spam: prev.spam.filter(email => email.id !== emailId),
          allmail: prev.allmail.filter(email => email.id !== emailId)
        }));
        
        // Also remove from category emails
        setCategoryEmails((prev: any) => ({
          all: {
            primary: prev.all.primary.filter((email: Email) => email.id !== emailId),
            updates: prev.all.updates.filter((email: Email) => email.id !== emailId),
            promotions: prev.all.promotions.filter((email: Email) => email.id !== emailId),
            social: prev.all.social.filter((email: Email) => email.id !== emailId)
          },
          spam: {
            primary: prev.spam.primary.filter((email: Email) => email.id !== emailId),
            updates: prev.spam.updates.filter((email: Email) => email.id !== emailId),
            promotions: prev.spam.promotions.filter((email: Email) => email.id !== emailId),
            social: prev.spam.social.filter((email: Email) => email.id !== emailId)
          },
          trash: {
            primary: prev.trash.primary.filter((email: Email) => email.id !== emailId),
            updates: prev.trash.updates.filter((email: Email) => email.id !== emailId),
            promotions: prev.trash.promotions.filter((email: Email) => email.id !== emailId),
            social: prev.trash.social.filter((email: Email) => email.id !== emailId)
          }
        }));
      } else {
        setEmails(prevEmails => 
          prevEmails.filter(email => email.id !== emailId)
        );
      }

      // Show success toast
      toast.success('Email deleted', {
        description: `"${emailSubject.length > 50 ? emailSubject.substring(0, 50) + '...' : emailSubject}" was moved to trash`,
        duration: 4000,
        action: {
          label: 'Undo',
          onClick: () => {
            // TODO: Implement undo functionality if needed
            toast.info('Undo functionality coming soon');
          }
        }
      });
      
    } catch (error) {
      console.error('Error deleting email:', error);
      
      // Show error toast
      toast.error('Failed to delete email', {
        description: 'Please try again or check your connection',
        duration: 4000
      });
    }
  };

  // Handle create filter from context menu
  const handleCreateFilter = (email: Email) => {
    // Navigate to settings filters page
    navigate('/settings', {
      state: { 
        createFilter: true,
        emailData: {
          from: email.from.email,
          subject: email.subject,
        }
      }
    });
  };

  // If authentication is still loading or Gmail is initializing, show loading state
  if (authLoading || isGmailInitializing) {
    return (
      <div className="fade-in">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-1xl font-semibold text-gray-800">{title}</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isGmailInitializing ? 'Connecting to Gmail' : 'Loading'}
              </h3>
              <p className="text-gray-600 mb-6">
                {isGmailInitializing 
                  ? 'Setting up your connection, please wait...'
                  : 'Please wait while we load your data...'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If Gmail is not signed in, show connection prompt
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in">
        <div className="flex items-center justify-between mb-28"></div>
        <div className="bg-white rounded-lg shadow-lg mr-8 ml-8 p-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="flex items-center justify-center mx-auto mb-4">
                <MessageSquareWarning className="w-8 h-8 text-grey-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Not Connected</h3>
              <p className="text-gray-600 mb-6">
                To view and manage your emails, please connect your Gmail account in the settings.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="btn btn-primary flex items-center mx-auto"
              >
                <Settings size={18} className="mr-2" />
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThreeColumnLayout onEmailUpdate={handleEmailUpdate} onEmailDelete={handleEmailDelete}>
      <div className="h-full flex flex-col min-h-0">
        {/* Search Bar - Always Visible */}
        <div className="flex-shrink-0 bg-[#F9FAFB] border-b border-gray-200 p-2.5 space-y-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => {
                handleSearchInput(e.target.value);
              }}
              onFocus={() => {
                if (searchQuery.trim() && searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              disabled={isSearching}
              className="w-full pl-10 pr-32 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            
            {/* Filter Button */}
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] mt-1">
                <div className="py-2">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur event
                        handleSuggestionSelect(suggestion);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start space-x-3">
                        <Search size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {suggestion.sender && (
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {suggestion.sender}
                              </span>
                            )}
                            {suggestion.timestamp && (
                              <span className="text-xs text-gray-500">
                                {new Date(suggestion.timestamp).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 truncate font-medium mb-1">
                            {suggestion.title}
                          </div>
                          {suggestion.snippet && (
                            <div className="text-xs text-gray-500 truncate">
                              {suggestion.snippet}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Toolbar - Only show in split view, hide in Show All mode */}
          {(!isSplitInbox || inboxViewMode === 'split') && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {/* Select All Button */}
              <button
                onClick={() => {
                  setSelectedEmails(prev => {
                    const next = new Set(prev);
                    
                    if (isSplitInbox) {
                      // ✅ Split view: only select/deselect VISIBLE emails (first 25 from each section)
                      const visibleUnread = splitUnread.slice(0, 25);
                      const visibleRead = splitRead.slice(0, 25);
                      
                      const allVisibleSelected = 
                        (visibleUnread.length === 0 || visibleUnread.every(e => next.has(e.id))) &&
                        (visibleRead.length === 0 || visibleRead.every(e => next.has(e.id)));
                      
                      if (allVisibleSelected) {
                        // Deselect all visible
                        visibleUnread.forEach(email => next.delete(email.id));
                        visibleRead.forEach(email => next.delete(email.id));
                      } else {
                        // Select all visible
                        visibleUnread.forEach(email => next.add(email.id));
                        visibleRead.forEach(email => next.add(email.id));
                      }
                    } else {
                      // Regular view, select/deselect visible page
                      if (allVisibleSelected) {
                        visibleEmails.forEach(email => next.delete(email.id));
                      } else {
                        visibleEmails.forEach(email => next.add(email.id));
                      }
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  checked={isSplitInbox ? 
                    // Check if all VISIBLE emails in both sections are selected
                    (splitUnread.slice(0, 25).length > 0 || splitRead.slice(0, 25).length > 0) &&
                    splitUnread.slice(0, 25).every(e => selectedEmails.has(e.id)) && 
                    splitRead.slice(0, 25).every(e => selectedEmails.has(e.id))
                    : allVisibleSelected}
                  readOnly
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none w-3 h-3"
                />
                <span>Select All</span>
              </button>
              
              <button
                onClick={handleDeleteSelected}
                disabled={selectedEmails.size === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
              
              <button
                onClick={() => setShowMoveDialog(true)}
                disabled={selectedEmails.size === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FolderInput size={12} />
                <span>Move</span>
              </button>
              
              <button
                onClick={() => {
                  // Get selected email objects to check their read status
                  const allEmails = isSplitInbox 
                    ? [...splitUnread, ...splitRead]
                    : (paginatedEmails || []);
                  const selectedEmailsList = allEmails.filter(e => selectedEmails.has(e.id));
                  
                  // If any selected email is unread, mark all as read; otherwise mark as unread
                  const hasUnread = selectedEmailsList.some(e => !e.isRead);
                  
                  if (hasUnread) {
                    handleMarkReadSelected();
                  } else {
                    handleMarkUnreadSelected();
                  }
                }}
                disabled={selectedEmails.size === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {(() => {
                  // Get selected email objects to determine icon
                  const allEmails = isSplitInbox 
                    ? [...splitUnread, ...splitRead]
                    : (paginatedEmails || []);
                  const selectedEmailsList = allEmails.filter(e => selectedEmails.has(e.id));
                  const hasUnread = selectedEmailsList.some(e => !e.isRead);
                  
                  return (
                    <>
                      {hasUnread ? <MailOpen size={12} /> : <Mail size={12} />}
                      <span>{hasUnread ? 'Mark Read' : 'Mark Unread'}</span>
                    </>
                  );
                })()}
              </button>
              
              <button
                onClick={handleRefreshCurrentTab}
                disabled={refreshing || refreshCooldown}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              
              {selectedEmails.size > 0 && (
                <span className="text-[10px] text-gray-600">
                  {selectedEmails.size} selected
                </span>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-white flex-1 flex flex-col min-w-[480px] max-w-full min-h-0 relative">
            {/* Filter Chips (no categories, no Focused/Other) */}
            {pageType === 'inbox' && !labelName && (
              <div className="flex-shrink-0 px-0 py-0">
              </div>
            )}

            {/* Header with refresh button for non-inbox pages or label pages */}
            {(pageType !== 'inbox' || labelName || activeSearchQuery) && (
              <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                {labelName ? (
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-800">Folder: {labelName}</h2>
                    <button
                      onClick={() => {
                        // Navigate back to inbox and clear label parameters
                        navigate('/inbox');
                      }}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                      title="Back to inbox"
                    >
                      <X size={16} className="text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                ) : activeSearchQuery ? (
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-800">Search: {activeSearchQuery}</h2>
                    <button
                      onClick={async () => {
                        // Clear search and reload inbox
                        clearSearch();
                        await handleRefresh();
                      }}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                      title="Clear search"
                    >
                      <X size={16} className="text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-3">
                  {/* Empty Trash button - only in trash tab */}
                  {pageType === 'trash' && filteredEmails.length > 0 && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to permanently delete all ${filteredEmails.length} email${filteredEmails.length > 1 ? 's' : ''} from trash? This action cannot be undone.`)) {
                          const loadingToastId = toast.loading(`Emptying trash (${filteredEmails.length} emails)...`);
                          try {
                            // Delete all emails in trash
                            await Promise.all(filteredEmails.map(email => deleteEmail(email.id)));
                            
                            toast.dismiss(loadingToastId);
                            toast.success('Trash emptied successfully!');
                            
                            // Refresh the view
                            await handleRefresh();
                          } catch (error) {
                            console.error('Error emptying trash:', error);
                            toast.dismiss(loadingToastId);
                            toast.error('Failed to empty trash. Please try again.');
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                      title="Permanently delete all emails in trash"
                    >
                      <Trash2 size={16} />
                      Empty Trash
                    </button>
                  )}
                  
                  {/* Refresh button */}
                  <button 
                    onClick={handleRefresh}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                    disabled={refreshing || refreshCooldown || isSearching}
                    title={refreshCooldown && !refreshing ? 'Please wait...' : 'Refresh emails'}
                  >
                    <RefreshCw size={16} className={`text-gray-500 hover:text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Email List Content - Scrollable Area */}
            {(!hasEverLoaded || loading || authLoading || isGmailInitializing) && !refreshing ? (
              <div className="flex-1 flex justify-center items-center min-h-0">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                  <p className="text-sm text-gray-500">
                    {authLoading || isGmailInitializing ? 'Connecting to Gmail...' : 'Loading emails...'}
                  </p>
                </div>
              </div>
            ) : (isSplitInbox) ? (
              // Split Inbox view: Unread vs Everything else with expand/collapse
              <div className="flex-1 flex flex-col min-h-0">
                {inboxViewMode === 'split' && (
                  <div className="flex-1 min-h-0 flex flex-col divide-y divide-gray-200">
                    {/* Unread section - flexible height based on content */}
                    <div className={`flex flex-col min-h-0 ${splitUnread.length > 0 ? 'flex-shrink-0' : ''}`} style={{ 
                      maxHeight: splitUnread.length > 0 ? `${Math.min(splitUnread.slice(0, 25).length * 60 + 50, 400)}px` : '120px'
                    }}>
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-800">
                          Unread ({Math.min(25, splitUnread.length)} of {splitUnread.length})
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                            title="Show all unread emails"
                            onClick={() => switchInboxViewMode('unread')}
                          >
                            Show All
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto" ref={emailListRef}>
                        {isRefreshLoading ? (
                          <div className="p-6 text-center text-gray-500">
                            <div className="text-sm font-medium">Loading unread emails...</div>
                          </div>
                        ) : (
                          <Table>
                            <TableBody>
                              {splitUnread.slice(0, 25).map(email => (
                                <EmailListItem
                                  key={email.id}
                                  email={email}
                                  onClick={handleEmailClick}
                                  onEmailUpdate={handleEmailUpdate}
                                  onEmailDelete={handleEmailDelete}
                                  onCreateFilter={handleCreateFilter}
                                  isSelected={selectedEmails.has(email.id)}
                                  onToggleSelect={handleToggleSelectEmail}
                                  renderAsTableRow
                                />
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {!isRefreshLoading && splitUnread.length === 0 && (
                          <div className="p-6 text-center text-gray-500 text-sm">All done for now 🎉</div>
                        )}
                      </div>
                    </div>

                    {/* Everything else section - takes remaining space */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-800">
                          Everything else ({Math.min(25, splitRead.length)} of many)
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                            title="Show all read emails"
                            onClick={() => switchInboxViewMode('read')}
                          >
                            Show All
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        {isRefreshLoading ? (
                          <div className="p-6 text-center text-gray-500">
                            <div className="text-sm font-medium">Loading emails...</div>
                          </div>
                        ) : (
                          <Table>
                            <TableBody>
                              {splitRead.slice(0, 25).map(email => (
                                <EmailListItem
                                  key={email.id}
                                  email={email}
                                  onClick={handleEmailClick}
                                  onEmailUpdate={handleEmailUpdate}
                                  onEmailDelete={handleEmailDelete}
                                  onCreateFilter={handleCreateFilter}
                                  isSelected={selectedEmails.has(email.id)}
                                  onToggleSelect={handleToggleSelectEmail}
                                  renderAsTableRow
                                />
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {!isRefreshLoading && splitRead.length === 0 && (
                          <div className="p-6 text-center text-gray-500 text-sm">No read emails</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {inboxViewMode === 'unread' && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    {/* Unread section toolbar */}
                    <div className="flex-shrink-0 bg-[#F9FAFB] border-b border-gray-200 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-200" title="Back to split" onClick={() => switchInboxViewMode('split')}>
                            <ArrowLeft size={14} className="text-gray-600" />
                          </button>
                          <div className="text-sm font-medium text-gray-800">Unread ({splitUnread.length})</div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Pagination */}
                          <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white rounded border border-gray-300">
                            <button 
                              onClick={() => setUnreadShowAllPage(Math.max(0, unreadShowAllPage - 1))}
                              disabled={unreadShowAllPage === 0}
                              className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                              title="Previous page"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs">{unreadShowAllPage + 1} / {Math.ceil(splitUnread.length / SECTION_PAGE_SIZE)}</span>
                            {isLoadingUnreadShowAll && <span className="text-xs text-blue-600 animate-pulse">Loading...</span>}
                            <button 
                              onClick={handleUnreadShowAllNextPage}
                              disabled={
                                isLoadingUnreadShowAll || 
                                (unreadShowAllPage >= Math.ceil(splitUnread.length / SECTION_PAGE_SIZE) - 1 && !hasMoreForTabs.unread)
                              }
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Next page"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          {/* Select all */}
                          <label className="flex items-center px-2 py-1 hover:bg-gray-100 rounded" title="Select all visible in this page">
                            <input
                              type="checkbox"
                              checked={
                                splitUnread
                                  .slice(unreadShowAllPage * SECTION_PAGE_SIZE, (unreadShowAllPage + 1) * SECTION_PAGE_SIZE)
                                  .length > 0 &&
                                splitUnread
                                  .slice(unreadShowAllPage * SECTION_PAGE_SIZE, (unreadShowAllPage + 1) * SECTION_PAGE_SIZE)
                                  .every(e => sectionSelectedEmails.has(e.id))
                              }
                              onChange={(e) => {
                                const visibleEmails = splitUnread.slice(
                                  unreadShowAllPage * SECTION_PAGE_SIZE,
                                  (unreadShowAllPage + 1) * SECTION_PAGE_SIZE
                                );
                                if (e.target.checked) {
                                  setSectionSelectedEmails(new Set([...sectionSelectedEmails, ...visibleEmails.map(e => e.id)]));
                                } else {
                                  const newSet = new Set(sectionSelectedEmails);
                                  visibleEmails.forEach(e => newSet.delete(e.id));
                                  setSectionSelectedEmails(newSet);
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-600">
                              {sectionSelectedEmails.size > 0 ? `${sectionSelectedEmails.size} selected` : 'All'}
                            </span>
                          </label>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              sectionSelectedEmails.forEach(id => handleEmailDelete(id));
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Delete selected"
                          >
                            <Trash2 size={14} className="text-gray-600" />
                          </button>

                          {/* Mark Unread */}
                          <button
                            onClick={() => {
                              handleMarkUnreadSelected();
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Mark as unread"
                          >
                            <Mail size={14} className="text-gray-600" />
                          </button>

                          {/* Mark Read */}
                          <button
                            onClick={() => {
                              handleMarkReadSelected();
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Mark as read"
                          >
                            <MailOpen size={14} className="text-gray-600" />
                          </button>

                          {/* Refresh */}
                          <button
                            onClick={handleRefreshCurrentTab}
                            disabled={refreshing || refreshCooldown}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title={refreshCooldown && !refreshing ? 'Please wait...' : 'Refresh this section'}
                          >
                            <RefreshCw size={14} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unread emails */}
                    <div className="flex-1 min-h-0 overflow-y-auto" ref={emailListRef}>
                      <Table>
                        <TableBody>
                          {splitUnread
                            .slice(unreadShowAllPage * SECTION_PAGE_SIZE, (unreadShowAllPage + 1) * SECTION_PAGE_SIZE)
                            .map(email => (
                            <EmailListItem
                              key={email.id}
                              email={email}
                              onClick={handleEmailClick}
                              onEmailUpdate={handleEmailUpdate}
                              onEmailDelete={handleEmailDelete}
                              onCreateFilter={handleCreateFilter}
                              isSelected={sectionSelectedEmails.has(email.id)}
                              onToggleSelect={() => {
                                const newSet = new Set(sectionSelectedEmails);
                                if (newSet.has(email.id)) {
                                  newSet.delete(email.id);
                                } else {
                                  newSet.add(email.id);
                                }
                                setSectionSelectedEmails(newSet);
                              }}
                              renderAsTableRow
                            />
                          ))}
                        </TableBody>
                      </Table>
                      {splitUnread.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">No unread emails</div>
                      )}
                    </div>
                  </div>
                )}

                {inboxViewMode === 'read' && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    {/* Everything else section toolbar */}
                    <div className="flex-shrink-0 bg-[#F9FAFB] border-b border-gray-200 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-200" title="Back to split" onClick={() => switchInboxViewMode('split')}>
                            <ArrowLeft size={14} className="text-gray-600" />
                          </button>
                          <div className="text-sm font-medium text-gray-800">Everything else ({splitRead.length})</div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Pagination */}
                          <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white rounded border border-gray-300">
                            <button 
                              onClick={() => setReadShowAllPage(Math.max(0, readShowAllPage - 1))}
                              disabled={readShowAllPage === 0}
                              className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                              title="Previous page"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs">{readShowAllPage + 1} / {Math.ceil(splitRead.length / SECTION_PAGE_SIZE)}</span>
                            {isLoadingReadShowAll && <span className="text-xs text-blue-600 animate-pulse">Loading...</span>}
                            <button 
                              onClick={handleReadShowAllNextPage}
                              disabled={isLoadingReadShowAll}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Next page"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          {/* Select all */}
                          <label className="flex items-center px-2 py-1 hover:bg-gray-100 rounded" title="Select all visible in this page">
                            <input
                              type="checkbox"
                              checked={
                                splitRead
                                  .slice(readShowAllPage * SECTION_PAGE_SIZE, (readShowAllPage + 1) * SECTION_PAGE_SIZE)
                                  .length > 0 &&
                                splitRead
                                  .slice(readShowAllPage * SECTION_PAGE_SIZE, (readShowAllPage + 1) * SECTION_PAGE_SIZE)
                                  .every(e => sectionSelectedEmails.has(e.id))
                              }
                              onChange={(e) => {
                                const visibleEmails = splitRead.slice(
                                  readShowAllPage * SECTION_PAGE_SIZE,
                                  (readShowAllPage + 1) * SECTION_PAGE_SIZE
                                );
                                if (e.target.checked) {
                                  setSectionSelectedEmails(new Set([...sectionSelectedEmails, ...visibleEmails.map(e => e.id)]));
                                } else {
                                  const newSet = new Set(sectionSelectedEmails);
                                  visibleEmails.forEach(e => newSet.delete(e.id));
                                  setSectionSelectedEmails(newSet);
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-600">
                              {sectionSelectedEmails.size > 0 ? `${sectionSelectedEmails.size} selected` : 'All'}
                            </span>
                          </label>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              sectionSelectedEmails.forEach(id => handleEmailDelete(id));
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Delete selected"
                          >
                            <Trash2 size={14} className="text-gray-600" />
                          </button>

                          {/* Mark Unread */}
                          <button
                            onClick={() => {
                              handleMarkUnreadSelected();
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Mark as unread"
                          >
                            <Mail size={14} className="text-gray-600" />
                          </button>

                          {/* Mark Read */}
                          <button
                            onClick={() => {
                              handleMarkReadSelected();
                              setSectionSelectedEmails(new Set());
                            }}
                            disabled={sectionSelectedEmails.size === 0}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title="Mark as read"
                          >
                            <MailOpen size={14} className="text-gray-600" />
                          </button>

                          {/* Refresh */}
                          <button
                            onClick={handleRefreshCurrentTab}
                            disabled={refreshing || refreshCooldown}
                            className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
                            title={refreshCooldown && !refreshing ? 'Please wait...' : 'Refresh this section'}
                          >
                            <RefreshCw size={14} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Everything else emails */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <Table>
                        <TableBody>
                          {splitRead
                            .slice(readShowAllPage * SECTION_PAGE_SIZE, (readShowAllPage + 1) * SECTION_PAGE_SIZE)
                            .map(email => (
                            <EmailListItem
                              key={email.id}
                              email={email}
                              onClick={handleEmailClick}
                              onEmailUpdate={handleEmailUpdate}
                              onEmailDelete={handleEmailDelete}
                              onCreateFilter={handleCreateFilter}
                              isSelected={sectionSelectedEmails.has(email.id)}
                              onToggleSelect={() => {
                                const newSet = new Set(sectionSelectedEmails);
                                if (newSet.has(email.id)) {
                                  newSet.delete(email.id);
                                } else {
                                  newSet.add(email.id);
                                }
                                setSectionSelectedEmails(newSet);
                              }}
                              renderAsTableRow
                            />
                          ))}
                        </TableBody>
                      </Table>
                      {splitRead.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">No read emails</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : loading || isSearching || emailsToDisplay.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0 relative">
                <div ref={emailListRef} className="flex-1 overflow-y-auto max-w-full min-h-0" style={{ height: '0' }}>
                  {(loading || isSearching) && emailsToDisplay.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                        <p className="text-sm text-gray-500">{isSearching ? 'Searching emails...' : 'Loading emails...'}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableBody>
                          {emailsToDisplay.map((email) => (
                            <EmailListItem 
                              key={email.id} 
                              email={email} 
                              onClick={handleEmailClick}
                              onEmailUpdate={handleEmailUpdate}
                              onEmailDelete={handleEmailDelete}
                              onCreateFilter={handleCreateFilter}
                              isSelected={selectedEmails.has(email.id)}
                              onToggleSelect={handleToggleSelectEmail}
                              isDraft={activeTab === 'drafts' && !labelName}
                              renderAsTableRow
                            />
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Loading more indicator - shown inside scroll area */}
                      {isLoadingMore && (
                        <div className="py-8 flex items-center justify-center">
                          <div className="flex items-center gap-3 text-sm text-gray-600 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                            <RefreshCw className="w-5 h-5 animate-spin text-primary-500" />
                            <span className="font-medium">Loading more emails...</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Load More button - shown when there are more emails to load */}
                      {nextPageToken && !isLoadingMore && !loading && paginatedEmails.length > 0 && (
                        <div className="py-6 flex items-center justify-center">
                          <button
                            onClick={() => handleLoadMore()}
                            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm hover:shadow-md"
                          >
                            Load More Emails
                          </button>
                        </div>
                      )}
                      
                      {/* End of list indicator */}
                      {!nextPageToken && !isLoadingMore && !loading && paginatedEmails.length > 0 && (
                        <div className="py-6 flex items-center justify-center">
                          <div className="text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
                            All emails loaded • {paginatedEmails.length} total
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {pageType === 'drafts' ? 'No drafts' :
                   pageType === 'sent' ? 'No sent emails' : 
                   pageType === 'trash' ? 'Trash is empty' : 
                   pageType === 'unread' ? 'No unread emails' : 
                   labelName ? `No emails found for folder "${labelName}"` :
                   activeTab === 'drafts' ? 'No drafts' :
                   activeTab === 'unread' ? 'No unread emails' :
                   activeTab === 'important' ? 'No important emails' :
                   'No emails'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        selectedCount={selectedEmails.size}
        onMove={handleMoveSelected}
      />
    </ThreeColumnLayout>
  );
}

export default EmailPageLayout;
