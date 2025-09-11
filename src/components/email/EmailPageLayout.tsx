import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  RefreshCw, 
  Search, 
  ChevronDown, 
  Settings, 
  X, 
  Trash2, 
  Archive, 
  Mail, 
  MailOpen, 
  Filter, 
  Paperclip,
  Star
} from 'lucide-react';
import { type SearchSuggestion } from '../../services/searchService';
import EmailListItem from './EmailListItem';
import ThreeColumnLayout from '../layout/ThreeColumnLayout';
// TODO: Re-integrate InboxToolbar with pagination after cleanup
import { Email } from '../../types';
import {
  getEmails,
  getCategoryEmailsForFolder,
  CategoryFilterOptions,
  getAllInboxEmails,
  getSentEmails, 
  getDraftEmails, 
  getTrashEmails,
  getImportantEmails,
  getStarredEmails,
  getSpamEmails,
  getArchiveEmails,
  getAllMailEmails,
  getLabelEmails,
  deleteEmail,
  markAsRead,
  markAsUnread,
  clearEmailCache
} from '../../services/emailService';
import { useAuth } from '../../contexts/AuthContext';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { useFoldersColumn } from '../../contexts/FoldersColumnContext';
import { toast } from 'sonner';

// Import optimized initial load service
import {
  loadCriticalInboxData,
  loadLabelsBasic,
  processAutoReplyOptimized,
  prefetchEssentialFolders,
  loadOnDemandFolder,
  clearOptimizedCaches
} from '../../services/optimizedInitialLoad';
// Import DND packages
import { 
  DndContext, 
  DragOverlay,
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor, 
  closestCenter,
  DragEndEvent 
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { createPortal } from 'react-dom';

type EmailPageType = 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';

interface EmailPageLayoutProps {
  pageType: EmailPageType;
  title: string;
}

function EmailPageLayout({ pageType, title }: EmailPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGmailSignedIn, loading: authLoading, isGmailInitializing } = useAuth();
  const { selectEmail } = useInboxLayout();
  const { setSystemFolderFilterHandler } = useFoldersColumn();

  // Ref to preserve scroll position during state updates
  const emailListRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Extract label name from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const labelName = urlParams.get('labelName');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail'>('unread');
  const [hasEverLoaded, setHasEverLoaded] = useState(false); // Track if we've ever successfully loaded
  
  // Toolbar filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [filterCriteria, setFilterCriteria] = useState({
    from: '',
    hasAttachment: false,
    dateRange: { start: '', end: '' }
  });
  
  // Gmail category tabs and filter chips state (categories disabled by client request)
  const [activeCategory] = useState<'primary' | 'updates' | 'promotions' | 'social'>('primary');
  const [activeFilters, setActiveFilters] = useState({
    unread: false,
    starred: false,
    attachments: false
  });
  // Focused/Other feature disabled

  // Feature flags – client wants all under Inbox, no category tabs, no Focused/Other
  const CATEGORIES_ENABLED = false;
  const FOCUSED_TOGGLE_ENABLED = false;

  // Additional filter state for special chips
  const [fromFilter] = useState('');
  const [dateRangeFilter] = useState({ start: '', end: '' });

  // Helper function to build filters object for category emails
  const buildFilters = (): CategoryFilterOptions => ({
    unread: activeFilters.unread,
    starred: activeFilters.starred,
    attachments: activeFilters.attachments,
    from: fromFilter || undefined,
    dateRange: dateRangeFilter.start || dateRangeFilter.end ? dateRangeFilter : undefined,
    searchText: searchQuery || undefined
  });

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
  
  // Inbox filtering mode - determines which emails show up in "Inbox"
  const [inboxMode] = useState<'primary' | 'all'>('all'); // default to ALL inbox emails

  // For label emails only
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(undefined);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);

  // Email storage for each tab type - always maintained separately
  const [allTabEmails, setAllTabEmails] = useState({
    all: [] as Email[],
    unread: [] as Email[],
    sent: [] as Email[],
    drafts: [] as Email[],
    trash: [] as Email[],
    important: [] as Email[],
    starred: [] as Email[],
    spam: [] as Email[],
    archive: [] as Email[],
    allmail: [] as Email[]
  });

  // Category email storage for each folder context
  const [categoryEmails, setCategoryEmails] = useState({
    all: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    },
    archive: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    },
    spam: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    },
    trash: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    }
  });

  // Page tokens for each tab type
  const [pageTokens, setPageTokens] = useState({
    all: undefined as string | undefined,
    unread: undefined as string | undefined,
    sent: undefined as string | undefined,
    drafts: undefined as string | undefined,
    trash: undefined as string | undefined,
    important: undefined as string | undefined,
    starred: undefined as string | undefined,
  spam: undefined as string | undefined,
    archive: undefined as string | undefined,
    allmail: undefined as string | undefined
  });

  // Category page tokens for each folder context
  const [categoryPageTokens, setCategoryPageTokens] = useState({
    all: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    },
    archive: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    },
    spam: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    },
    trash: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    }
  });

  // Has more emails for each tab type
  const [hasMoreForTabs, setHasMoreForTabs] = useState({
    all: false,
    unread: false,
    sent: false,
    drafts: false,
    trash: false,
    important: false,
    starred: false,
    spam: false,
    archive: false,
    allmail: false
  });

  // Has more category emails for each folder context
  const [hasMoreCategoryEmails, setHasMoreCategoryEmails] = useState({
    all: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    },
    archive: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    },
    spam: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    },
    trash: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    }
  });

  // Email counts for all tabs - always maintained
  const [emailCounts, setEmailCounts] = useState({
    unread: 0,
    drafts: 0,
    trash: 0
  });

  // DND Setup
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  // Track explicit tab-level loading (distinct from global optimized first paint)
  const [tabLoading, setTabLoading] = useState<string | null>(null);

  // OPTIMIZED: Fetch all email types using performance-optimized approach
  const fetchAllEmailTypes = async (forceRefresh = false) => {
    if (!isGmailSignedIn || labelName) return;

    try {
      console.log('� Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...');
      setLoading(true);

      // Clear caches if force refresh
      if (forceRefresh) {
        clearOptimizedCaches();
      }

  // STEP 1: Critical first paint - minimal calls for instant UI (2 API calls)
      const criticalData = await loadCriticalInboxData();
      
      // Extract data from optimized structure
      const primaryUnread = criticalData.unreadList.emails;
      const primaryRecent = criticalData.recentList.emails;
      const inboxUnreadCount = criticalData.inboxUnreadCount;
      
      // Load labels separately (1 API call)
      const labels = await loadLabelsBasic();
      
      // Show unread emails immediately - this is what users want to see first
      console.log(`📧 Critical data loaded: ${primaryUnread.length} unread, ${primaryRecent.length} recent, unread count: ${inboxUnreadCount}, ${labels.length} labels`);
      
  // Update UI immediately with critical data - user sees content instantly
      setAllTabEmails(prev => ({
        ...prev,
        all: primaryRecent,
        unread: primaryUnread
      }));

      // Update counts immediately using the API's resultSizeEstimate
      setEmailCounts({
        unread: Math.min(inboxUnreadCount, 99),
        drafts: 0, // Will be updated in step 2
        trash: 0   // Will be updated in step 2
      });

      // Process auto-reply using cached data (no additional API calls)
      processAutoReplyOptimized(criticalData).catch(error => {
        console.error('Auto-reply processing failed:', error);
      });

      // Quick step: replace primary-only with unified inbox (All Mail except Sent/Trash/Spam) for accuracy
      try {
        const unified = await getAllInboxEmails(true, 25);
        setAllTabEmails(prev => ({
          ...prev,
          all: unified.emails || [],
          unread: (unified.emails || []).filter(e => !e.isRead)
        }));

        setPageTokens(prev => ({
          ...prev,
          all: unified.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: !!unified.nextPageToken,
          unread: !!unified.nextPageToken
        }));
      } catch (e) {
        console.warn('Unified inbox warm replacement failed; staying on critical primary set', e);
      }

      // STEP 2: Background prefetch - load commonly accessed folders (3 API calls)  
      prefetchEssentialFolders().then(({ sent, drafts, important }) => {
        console.log(`📧 Essential folders loaded: ${sent.length} sent, ${drafts.length} drafts, ${important.length} important`);
        
        // Note: These are IDs only - actual Email objects will be loaded when user clicks tabs
        // So we don't update setAllTabEmails here to avoid TypeScript errors
        // The IDs will be used for on-demand loading when tabs are accessed

        // Update draft count using the ID count
        setEmailCounts(prev => ({
          ...prev,
          drafts: drafts.length
        }));

        // Update page tokens and has more flags
        setPageTokens(prev => ({
          ...prev,
          all: primaryRecent.length === 25 ? 'has-more' : undefined,
          sent: sent.length === 15 ? 'has-more' : undefined,
          important: important.length === 15 ? 'has-more' : undefined
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: primaryRecent.length === 25,
          unread: primaryUnread.length >= 10,
          sent: sent.length === 15,
          drafts: drafts.length > 10,
          important: important.length === 15
        }));

      }).catch(error => {
        console.error('❌ Failed to prefetch essential folders:', error);
      });

      // Mark as loaded after critical data is shown
      setHasEverLoaded(true);
      setLoading(false);
      
      console.log('✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!');
      
    } catch (error) {
      console.error('❌ Error in optimized email fetch:', error);
      setLoading(false);
    }
  };

  // Fetch category emails for all folder contexts
  const fetchCategoryEmails = async (forceRefresh = false) => {
    if (typeof CATEGORIES_ENABLED !== 'undefined' && !CATEGORIES_ENABLED) {
      return; // categories disabled
    }
    if (!isGmailSignedIn || labelName) return;

    try {
      console.log('📧 Fetching category emails for all folder contexts...');
      
      // Get current filters
      const currentFilters = buildFilters();
      
      // Fetch categories for inbox/all context
      const [primaryInbox, updatesInbox, promotionsInbox, socialInbox] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'all', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Fetch categories for archive context
      const [primaryArchive, updatesArchive, promotionsArchive, socialArchive] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'archive', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'archive', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'archive', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'archive', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Fetch categories for spam context
      const [primarySpam, updatesSpam, promotionsSpam, socialSpam] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'spam', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Fetch categories for trash context
      const [primaryTrash, updatesTrash, promotionsTrash, socialTrash] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'trash', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Update category emails state
      setCategoryEmails({
        all: {
          primary: primaryInbox.emails || [],
          updates: updatesInbox.emails || [],
          promotions: promotionsInbox.emails || [],
          social: socialInbox.emails || []
        },
        archive: {
          primary: primaryArchive.emails || [],
          updates: updatesArchive.emails || [],
          promotions: promotionsArchive.emails || [],
          social: socialArchive.emails || []
        },
        spam: {
          primary: primarySpam.emails || [],
          updates: updatesSpam.emails || [],
          promotions: promotionsSpam.emails || [],
          social: socialSpam.emails || []
        },
        trash: {
          primary: primaryTrash.emails || [],
          updates: updatesTrash.emails || [],
          promotions: promotionsTrash.emails || [],
          social: socialTrash.emails || []
        }
      });

      // Update category page tokens
      setCategoryPageTokens({
        all: {
          primary: primaryInbox.nextPageToken,
          updates: updatesInbox.nextPageToken,
          promotions: promotionsInbox.nextPageToken,
          social: socialInbox.nextPageToken
        },
        archive: {
          primary: primaryArchive.nextPageToken,
          updates: updatesArchive.nextPageToken,
          promotions: promotionsArchive.nextPageToken,
          social: socialArchive.nextPageToken
        },
        spam: {
          primary: primarySpam.nextPageToken,
          updates: updatesSpam.nextPageToken,
          promotions: promotionsSpam.nextPageToken,
          social: socialSpam.nextPageToken
        },
        trash: {
          primary: primaryTrash.nextPageToken,
          updates: updatesTrash.nextPageToken,
          promotions: promotionsTrash.nextPageToken,
          social: socialTrash.nextPageToken
        }
      });

      // Update has more category emails flags
      setHasMoreCategoryEmails({
        all: {
          primary: !!primaryInbox.nextPageToken,
          updates: !!updatesInbox.nextPageToken,
          promotions: !!promotionsInbox.nextPageToken,
          social: !!socialInbox.nextPageToken
        },
        archive: {
          primary: !!primaryArchive.nextPageToken,
          updates: !!updatesArchive.nextPageToken,
          promotions: !!promotionsArchive.nextPageToken,
          social: !!socialArchive.nextPageToken
        },
        spam: {
          primary: !!primarySpam.nextPageToken,
          updates: !!updatesSpam.nextPageToken,
          promotions: !!promotionsSpam.nextPageToken,
          social: !!socialSpam.nextPageToken
        },
        trash: {
          primary: !!primaryTrash.nextPageToken,
          updates: !!updatesTrash.nextPageToken,
          promotions: !!promotionsTrash.nextPageToken,
          social: !!socialTrash.nextPageToken
        }
      });

      console.log('✅ Category emails fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching category emails:', error);
    }
  };

  // Load more category emails for specific category and folder context
  const loadMoreCategoryEmails = async (
    category: 'primary' | 'updates' | 'promotions' | 'social',
    folderContext: 'all' | 'archive' | 'spam' | 'trash'
  ) => {
    if (!isGmailSignedIn || labelName) return;

    try {
      setLoadingMore(true);
      
      const pageToken = categoryPageTokens[folderContext][category];
      const currentFilters = buildFilters();
      const response = await getCategoryEmailsForFolder(category, folderContext, false, 20, pageToken, currentFilters);
      const newEmails = response.emails || [];

      // Update category emails
      setCategoryEmails(prev => ({
        ...prev,
        [folderContext]: {
          ...prev[folderContext],
          [category]: [...prev[folderContext][category], ...newEmails]
        }
      }));

      // Update category page tokens
      setCategoryPageTokens(prev => ({
        ...prev,
        [folderContext]: {
          ...prev[folderContext],
          [category]: response.nextPageToken
        }
      }));

      // Update has more flags
      setHasMoreCategoryEmails(prev => ({
        ...prev,
        [folderContext]: {
          ...prev[folderContext],
          [category]: !!response.nextPageToken
        }
      }));

      setLoadingMore(false);
    } catch (error) {
      console.error('❌ Error loading more category emails:', error);
      setLoadingMore(false);
    }
  };

  // Load more emails for specific tab
  const loadMoreForTab = async (tabType: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail') => {
    if (!isGmailSignedIn || labelName) return;

    try {
      setLoadingMore(true);

      if (tabType === 'all') {
        // Load more inbox emails
        const pageToken = pageTokens.all;
  const response = await getAllInboxEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          all: [...prev.all, ...newEmails],
          unread: [...prev.unread, ...newEmails.filter(email => !email.isRead)]
        }));

        setPageTokens(prev => ({
          ...prev,
          all: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: !!response.nextPageToken,
          unread: !!response.nextPageToken
        }));
      } else if (tabType === 'unread') {
        // Unread tab is filtered from "all", so load more from "all" and filter
        const pageToken = pageTokens.all;
  const response = await getAllInboxEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          all: [...prev.all, ...newEmails],
          unread: [...prev.unread, ...newEmails.filter(email => !email.isRead)]
        }));

        setPageTokens(prev => ({
          ...prev,
          all: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: !!response.nextPageToken,
          unread: !!response.nextPageToken
        }));
      } else if (tabType === 'important') {
        // Important has its own pagination
        const pageToken = pageTokens.important;
        const response = await getImportantEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          important: [...prev.important, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          important: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          important: !!response.nextPageToken
        }));
      } else if (tabType === 'sent') {
        // Load more sent emails using pagination
        const pageToken = pageTokens.sent === 'has-more' ? undefined : pageTokens.sent;
        const response = await getSentEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          sent: [...prev.sent, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          sent: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          sent: !!response.nextPageToken
        }));
      } else if (tabType === 'drafts') {
        // Load more drafts
        const currentCount = allTabEmails.drafts.length;
        const allDraftsEmails = await getDraftEmails(false);
        const nextBatch = allDraftsEmails?.slice(currentCount, currentCount + 20) || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          drafts: [...prev.drafts, ...nextBatch]
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          drafts: (allDraftsEmails?.length || 0) > currentCount + 20
        }));
      } else if (tabType === 'trash') {
        // Load more trash emails using pagination
        const pageToken = pageTokens.trash;
        const response = await getTrashEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          trash: [...prev.trash, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          trash: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          trash: !!response.nextPageToken
        }));
      } else if (tabType === 'starred') {
        // Load more starred emails using pagination
        const pageToken = pageTokens.starred;
        const response = await getStarredEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          starred: [...prev.starred, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          starred: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          starred: !!response.nextPageToken
        }));
      } else if (tabType === 'spam') {
        // Load more spam emails using pagination
        const pageToken = pageTokens.spam;
        const response = await getSpamEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          spam: [...prev.spam, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          spam: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          spam: !!response.nextPageToken
        }));
      } else if (tabType === 'archive') {
        // Load more archive emails using pagination
        const pageToken = pageTokens.archive;
        const response = await getArchiveEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          archive: [...prev.archive, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          archive: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          archive: !!response.nextPageToken
        }));
      } else if (tabType === 'allmail') {
        // Load more all mail emails using pagination
        const pageToken = pageTokens.allmail;
        const response = await getAllMailEmails(false, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          allmail: [...prev.allmail, ...newEmails]
        }));

        setPageTokens(prev => ({
          ...prev,
          allmail: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          allmail: !!response.nextPageToken
        }));
      }

      setLoadingMore(false);
    } catch (error) {
      console.error(`Error loading more ${tabType} emails:`, error);
      setLoadingMore(false);
    }
  };

  // Register cache clearing on profile switches  
  useEffect(() => {
    const handleClearCache = () => {
      console.log('🧹 Clearing optimized caches for profile switch');
      clearOptimizedCaches();
      
      // Reset all email state
      setAllTabEmails({
        all: [],
        unread: [],
        sent: [],
        drafts: [],
        trash: [],
        important: [],
        starred: [],
        spam: [],
        archive: [],
        allmail: []
      });
      
      setCategoryEmails({
        all: { primary: [], updates: [], promotions: [], social: [] },
        archive: { primary: [], updates: [], promotions: [], social: [] },
        spam: { primary: [], updates: [], promotions: [], social: [] },
        trash: { primary: [], updates: [], promotions: [], social: [] }
      });
      
      // Reset pagination and loading states
      setHasEverLoaded(false);
      setLoading(false);
      setEmailCounts({ unread: 0, drafts: 0, trash: 0 });
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('📧 EmailPageLayout useEffect triggered:', { isGmailSignedIn, pageType, labelName, authLoading, isGmailInitializing });
    if (authLoading || isGmailInitializing) return; // skip until ready

    if (isGmailSignedIn && pageType === 'inbox' && !labelName) {
      // ✅ OPTIMIZED: Use new optimized fetch only - no legacy prefetch during critical path
      console.log('📧 Starting OPTIMIZED fetchAllEmailTypes...');
      fetchAllEmailTypes();
      
      // 🚫 DISABLED: Legacy category prefetch causes the ~38 API calls problem
      // fetchCategoryEmails(); // This will be handled by lazy loading when user clicks tabs
    } else if (isGmailSignedIn && labelName) {
      // For label emails, use old logic
      console.log('📧 Starting fetchLabelEmails...');
      fetchLabelEmails();
    } else if (!isGmailSignedIn && !authLoading && !isGmailInitializing) {
      // Only set loading to false if we're sure auth is complete and not signed in
      console.log('📧 Not signed in and auth complete - setting loading false');
      setHasEverLoaded(true); // Consider this as "loaded" since there's nothing to load
      setLoading(false);
    }
  }, [isGmailSignedIn, pageType, labelName, authLoading, isGmailInitializing, inboxMode, activeFilters]);

  // Fetch label emails (separate logic for labels)
  const fetchLabelEmails = async (forceRefresh = false, loadMore = false) => {
    if (!isGmailSignedIn || !labelName) return;

    try {
      console.log(`📧 Fetching emails for label: ${labelName}${loadMore ? ' (loading more)' : ''}`);
      
      if (loadMore) {
        setLoadingMore(true);
        const response = await getLabelEmails(labelName, false, 10, currentPageToken);
        setEmails(prevEmails => [...prevEmails, ...(response.emails || [])]);
        setCurrentPageToken(response.nextPageToken);
        setHasMoreEmails(!!response.nextPageToken);
        setLoadingMore(false);
      } else {
        setLoading(true);
        const response = await getLabelEmails(labelName, forceRefresh, 10, undefined);
        setEmails(response.emails);
        setCurrentPageToken(response.nextPageToken);
        setHasMoreEmails(!!response.nextPageToken);
        setHasEverLoaded(true); // Mark that we've successfully loaded emails
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching label emails:', error);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    if (!isGmailSignedIn) return;
    setRefreshing(true);
    
    if (labelName) {
      // For labels, refresh label emails
      await fetchLabelEmails(true);
    } else {
      // For inbox, refresh all email types and categories
      await Promise.all([
        fetchAllEmailTypes(true),
        fetchCategoryEmails(true)
      ]);
    }
    
    setRefreshing(false);
  };

  const handleRefreshCurrentTab = async () => {
    if (!isGmailSignedIn || refreshing) return;
    setRefreshing(true);
    
    try {
      // Clear relevant caches to ensure fresh data
      clearEmailCache();
      
      if (labelName) {
        // For label pages, refresh only the current label
        console.log(`🔄 Refreshing label: ${labelName}`);
        await fetchLabelEmails(true);
      } else if (pageType === 'inbox') {
        // For inbox, refresh based on current tab
        console.log(`🔄 Refreshing current tab: ${activeTab}`);
        
        // Determine what needs to be refreshed based on current tab
        switch (activeTab) {
          case 'all':
            // Refresh main inbox data and current category
            await fetchAllEmailTypes(true);
            if (activeCategory && ['all', 'archive', 'spam', 'trash'].includes(activeTab)) {
              await fetchCategoryEmails(true);
            }
            break;
          case 'unread':
          case 'sent':
          case 'drafts':
          case 'important':
          case 'starred':
          case 'allmail':
            // Refresh specific tab data
            await fetchAllEmailTypes(true);
            break;
          case 'archive':
          case 'spam':
          case 'trash':
            // Refresh both the tab data and categories for these special folders
            await fetchAllEmailTypes(true);
            if (activeCategory) {
              await fetchCategoryEmails(true);
            }
            break;
          default:
            // Fallback - refresh everything
            await Promise.all([
              fetchAllEmailTypes(true),
              fetchCategoryEmails(true)
            ]);
        }
      } else {
        // For other page types (sent, drafts, etc.), refresh the specific page
        console.log(`🔄 Refreshing page type: ${pageType}`);
        await fetchAllEmailTypes(true);
      }
      
      // Show success message
      toast.success('Refreshed successfully', {
        description: `${labelName ? `Label "${labelName}"` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} emails updated`,
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
    }
  };

  const handleSystemFolderFilter = async (folderType: string) => {
    // Map folder types to activeTab values
    const folderToTabMap: { [key: string]: typeof activeTab } = {
      'inbox': 'all', // Show all inbox emails
      'sent': 'sent',
      'drafts': 'drafts', 
      'trash': 'trash',
      'spam': 'spam', // Use dedicated spam tab
      'starred': 'starred', // Use dedicated starred tab
      'important': 'important', // Important is separate from starred
      'archive': 'archive' // Archived emails
    };

    const newTab = folderToTabMap[folderType] || 'all';
    
    // Set the active tab to show the filtered emails
    setActiveTab(newTab);
    
    // OPTIMIZED: On-demand loading for spam/trash, existing logic for others
    if ((newTab === 'spam' || newTab === 'trash') && allTabEmails[newTab].length === 0) {
      console.log(`🗑️ Loading ${newTab} folder on-demand...`);
      
      try {
        const folderData = await loadOnDemandFolder(newTab as 'spam' | 'trash');
        
        setAllTabEmails(prev => ({
          ...prev,
          [newTab]: folderData
        }));
        
        // Update counts for trash
        if (newTab === 'trash') {
          setEmailCounts(prev => ({
            ...prev,
            trash: Math.min(folderData.length, 99)
          }));
        }
        
        console.log(`✅ On-demand loaded ${folderData.length} ${newTab} emails`);
      } catch (error) {
        console.error(`❌ Failed to load ${newTab} on-demand:`, error);
      }
    } else if (allTabEmails[newTab].length === 0) {
      // On-demand load for tabs not loaded during initial fetch
      try {
        if (['sent','drafts','important','starred','archive','allmail'].includes(newTab)) {
          // Trigger first page fetch for the selected tab
          if (newTab === 'sent') {
            setTabLoading('sent');
            try {
              const sentResp = await getSentEmails(true, 50);
              setAllTabEmails(prev => ({ ...prev, sent: sentResp.emails || [] }));
              setPageTokens(prev => ({ ...prev, sent: sentResp.nextPageToken }));
              setHasMoreForTabs(prev => ({ ...prev, sent: !!sentResp.nextPageToken }));
            } finally {
              setTabLoading(null);
            }
          } else if (newTab === 'drafts') {
            setTabLoading('drafts');
            try {
              const draftList = await getDraftEmails(true);
              setAllTabEmails(prev => ({ ...prev, drafts: draftList || [] }));
              setHasMoreForTabs(prev => ({ ...prev, drafts: (draftList?.length || 0) > 20 }));
            } finally {
              setTabLoading(null);
            }
          } else {
            await loadMoreForTab(newTab as any);
          }
        } else {
          await fetchAllEmailTypes(true);
        }
      } catch (e) {
        console.error(`❌ Failed to load tab ${newTab}:`, e);
      }
    }
    
    console.log(`📂 Filtered to: ${folderType} (tab: ${newTab})`);
  };

  // Register system folder filter handler with context
  useEffect(() => {
    setSystemFolderFilterHandler(handleSystemFolderFilter);
  }, [setSystemFolderFilterHandler]);

  // Fallback: when activeTab changes to sent/drafts and list is still empty after initial attempts, force a fetch
  useEffect(() => {
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
      if (activeTab === 'drafts' && allTabEmails.drafts.length === 0 && !tabLoading) {
        setTabLoading('drafts');
        try {
          const draftList = await getDraftEmails(true);
            setAllTabEmails(prev => ({ ...prev, drafts: draftList || [] }));
            setHasMoreForTabs(prev => ({ ...prev, drafts: (draftList?.length || 0) > 20 }));
        } finally {
          setTabLoading(null);
        }
      }
    };
    run();
  }, [activeTab, pageType, labelName, allTabEmails.sent.length, allTabEmails.drafts.length, tabLoading]);

  // Toolbar action handlers
  // Email selection handlers
  const handleToggleSelectEmail = (emailId: string) => {
    setSelectedEmails(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(emailId)) {
        newSelected.delete(emailId);
      } else {
        newSelected.add(emailId);
      }
      return newSelected;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedEmails.size === 0) return;
    
    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;
    
    try {
      // Show loading toast
      toast.loading(`Deleting ${emailCount} email${emailCount > 1 ? 's' : ''}...`, {
        duration: 2000
      });

      // Delete all selected emails
      await Promise.all(emailIds.map(emailId => deleteEmail(emailId)));

      // Remove from local state
      if (pageType === 'inbox' && !labelName) {
        // Remove from all relevant tab arrays
        setAllTabEmails(prev => ({
          all: prev.all.filter(email => !emailIds.includes(email.id)),
          unread: prev.unread.filter(email => !emailIds.includes(email.id)),
          sent: prev.sent.filter(email => !emailIds.includes(email.id)),
          drafts: prev.drafts.filter(email => !emailIds.includes(email.id)),
          trash: prev.trash.filter(email => !emailIds.includes(email.id)),
          important: prev.important.filter(email => !emailIds.includes(email.id)),
          starred: prev.starred.filter(email => !emailIds.includes(email.id)),
          spam: prev.spam.filter(email => !emailIds.includes(email.id)),
          archive: prev.archive.filter(email => !emailIds.includes(email.id)),
          allmail: prev.allmail.filter(email => !emailIds.includes(email.id))
        }));
        
        // Also remove from category emails
        setCategoryEmails(prev => {
          const updatedCategories = { ...prev };
          Object.keys(updatedCategories).forEach(folderKey => {
            const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
            Object.keys(folder).forEach(categoryKey => {
              folder[categoryKey as keyof typeof folder] = 
                folder[categoryKey as keyof typeof folder].filter(email => !emailIds.includes(email.id));
            });
          });
          return updatedCategories;
        });
      } else {
        setEmails(prevEmails => 
          prevEmails.filter(email => !emailIds.includes(email.id))
        );
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} deleted`, {
        description: `Moved to trash successfully`,
        duration: 4000
      });
      
    } catch (error) {
      console.error('Error deleting emails:', error);
      
      // Show error toast
      toast.error('Failed to delete emails', {
        description: 'Please try again or check your connection',
        duration: 4000
      });
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;

    try {
      // Show loading toast
      toast.loading(`Archiving ${emailCount} email${emailCount > 1 ? 's' : ''}...`, {
        duration: 2000
      });

      // Archive all selected emails using Gmail API
      // For now, we'll simulate this by adding archive label and removing inbox
      for (const emailId of emailIds) {
        await window.gapi?.client.gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            addLabelIds: ['ARCHIVED'],
            removeLabelIds: ['INBOX']
          }
        });
      }

      // Remove from local state
      if (pageType === 'inbox' && !labelName) {
        // Remove from all relevant tab arrays
        setAllTabEmails(prev => ({
          all: prev.all.filter(email => !emailIds.includes(email.id)),
          unread: prev.unread.filter(email => !emailIds.includes(email.id)),
          sent: prev.sent.filter(email => !emailIds.includes(email.id)),
          drafts: prev.drafts.filter(email => !emailIds.includes(email.id)),
          trash: prev.trash.filter(email => !emailIds.includes(email.id)),
          important: prev.important.filter(email => !emailIds.includes(email.id)),
          starred: prev.starred.filter(email => !emailIds.includes(email.id)),
          spam: prev.spam.filter(email => !emailIds.includes(email.id)),
          archive: prev.archive.filter(email => !emailIds.includes(email.id)),
          allmail: prev.allmail.filter(email => !emailIds.includes(email.id))
        }));
        
        // Also remove from category emails
        setCategoryEmails(prev => {
          const updatedCategories = { ...prev };
          Object.keys(updatedCategories).forEach(folderKey => {
            const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
            Object.keys(folder).forEach(categoryKey => {
              folder[categoryKey as keyof typeof folder] = 
                folder[categoryKey as keyof typeof folder].filter(email => !emailIds.includes(email.id));
            });
          });
          return updatedCategories;
        });
      } else {
        setEmails(prevEmails => 
          prevEmails.filter(email => !emailIds.includes(email.id))
        );
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} archived`, {
        description: `Moved to archive successfully`,
        duration: 4000
      });

    } catch (error) {
      console.error('Error archiving emails:', error);
      
      // Show error toast
      toast.error('Failed to archive emails', {
        description: 'Please try again or check your connection',
        duration: 4000
      });
    }
  };

  const handleMarkReadSelected = async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;

    try {
      // Show loading toast
      toast.loading(`Marking ${emailCount} email${emailCount > 1 ? 's' : ''} as read...`, {
        duration: 2000
      });

      // Mark all selected emails as read
      await Promise.all(emailIds.map(emailId => markAsRead(emailId)));

      // Update local state
      const updateEmailsReadStatus = (emails: Email[]) => 
        emails.map(email => 
          emailIds.includes(email.id) ? { ...email, isRead: true } : email
        );

      if (pageType === 'inbox' && !labelName) {
        // Update all relevant tab arrays
        setAllTabEmails(prev => ({
          all: updateEmailsReadStatus(prev.all),
          unread: prev.unread.filter(email => !emailIds.includes(email.id)), // Remove from unread
          sent: updateEmailsReadStatus(prev.sent),
          drafts: updateEmailsReadStatus(prev.drafts),
          trash: updateEmailsReadStatus(prev.trash),
          important: updateEmailsReadStatus(prev.important),
          starred: updateEmailsReadStatus(prev.starred),
          spam: updateEmailsReadStatus(prev.spam),
          archive: updateEmailsReadStatus(prev.archive),
          allmail: updateEmailsReadStatus(prev.allmail)
        }));
        
        // Also update category emails
        setCategoryEmails(prev => {
          const updatedCategories = { ...prev };
          Object.keys(updatedCategories).forEach(folderKey => {
            const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
            Object.keys(folder).forEach(categoryKey => {
              folder[categoryKey as keyof typeof folder] = 
                updateEmailsReadStatus(folder[categoryKey as keyof typeof folder]);
            });
          });
          return updatedCategories;
        });
      } else {
        setEmails(prevEmails => updateEmailsReadStatus(prevEmails));
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} marked as read`, {
        duration: 4000
      });

    } catch (error) {
      console.error('Error marking emails as read:', error);
      
      // Show error toast
      toast.error('Failed to mark emails as read', {
        description: 'Please try again or check your connection',
        duration: 4000
      });
    }
  };

  const handleMarkUnreadSelected = async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;

    try {
      // Show loading toast
      toast.loading(`Marking ${emailCount} email${emailCount > 1 ? 's' : ''} as unread...`, {
        duration: 2000
      });

      // Mark all selected emails as unread
      await Promise.all(emailIds.map(emailId => markAsUnread(emailId)));

      // Update local state
      const updateEmailsUnreadStatus = (emails: Email[]) => 
        emails.map(email => 
          emailIds.includes(email.id) ? { ...email, isRead: false } : email
        );

      if (pageType === 'inbox' && !labelName) {
        // Update all relevant tab arrays
        setAllTabEmails(prev => ({
          all: updateEmailsUnreadStatus(prev.all),
          unread: [
            ...prev.unread,
            ...prev.all.filter(email => emailIds.includes(email.id)).map(email => ({ ...email, isRead: false }))
          ], // Add back to unread
          sent: updateEmailsUnreadStatus(prev.sent),
          drafts: updateEmailsUnreadStatus(prev.drafts),
          trash: updateEmailsUnreadStatus(prev.trash),
          important: updateEmailsUnreadStatus(prev.important),
          starred: updateEmailsUnreadStatus(prev.starred),
          spam: updateEmailsUnreadStatus(prev.spam),
          archive: updateEmailsUnreadStatus(prev.archive),
          allmail: updateEmailsUnreadStatus(prev.allmail)
        }));
        
        // Also update category emails
        setCategoryEmails(prev => {
          const updatedCategories = { ...prev };
          Object.keys(updatedCategories).forEach(folderKey => {
            const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
            Object.keys(folder).forEach(categoryKey => {
              folder[categoryKey as keyof typeof folder] = 
                updateEmailsUnreadStatus(folder[categoryKey as keyof typeof folder]);
            });
          });
          return updatedCategories;
        });
      } else {
        setEmails(prevEmails => updateEmailsUnreadStatus(prevEmails));
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} marked as unread`, {
        duration: 4000
      });

    } catch (error) {
      console.error('Error marking emails as unread:', error);
      
      // Show error toast
      toast.error('Failed to mark emails as unread', {
        description: 'Please try again or check your connection',
        duration: 4000
      });
    }
  };


  const applyFilters = () => {
    let query = searchQuery;
    
    if (filterCriteria.from) {
      query += ` from:${filterCriteria.from}`;
    }
    
    if (filterCriteria.hasAttachment) {
      query += ` has:attachment`;
    }
    
    if (filterCriteria.dateRange.start) {
      query += ` after:${filterCriteria.dateRange.start}`;
    }
    
    if (filterCriteria.dateRange.end) {
      query += ` before:${filterCriteria.dateRange.end}`;
    }
    
    setSearchQuery(query);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSearchSubmit(fakeEvent);
    setShowFilterDropdown(false);
  };

  // Category tabs removed – no handler needed

  // Filter chip handlers
  const toggleFilter = (filterType: 'unread' | 'attachments') => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
    console.log('Toggled filter:', filterType);
    
    // Refetch category emails with new filters
    if (pageType === 'inbox' && !labelName) {
      fetchCategoryEmails(true);
    }
  };

  // Focused mode toggle removed (feature disabled)

  // Pagination settings & state for toolbar chevrons
  const PAGE_SIZE = 50;
  const [pageIndex, setPageIndex] = useState(0);

  // Old handleLoadMore removed; pagination now via toolbar chevrons fetching more when needed.

  // Get current emails based on active tab and category selection
  const getCurrentEmails = (): Email[] => {
    // For label pages, use the emails array
    if (pageType !== 'inbox' || labelName) {
      return emails;
    }

    // Determine which folder context we're in based on activeTab
    let folderContext: 'all' | 'archive' | 'spam' | 'trash';
    switch (activeTab) {
      case 'archive':
        folderContext = 'archive';
        break;
      case 'spam':
        folderContext = 'spam';
        break;
      case 'trash':
        folderContext = 'trash';
        break;
      default:
        folderContext = 'all'; // inbox context
        break;
    }

    // For category-enabled tabs (all/inbox, archive, spam, trash), show category emails if available
  const supportsCategoryTabs = CATEGORIES_ENABLED && ['all', 'archive', 'spam', 'trash'].includes(activeTab);
    
    let currentEmails: Email[] = [];
    if (supportsCategoryTabs && categoryEmails[folderContext][activeCategory]?.length > 0) {
      // Show category emails if they exist
      currentEmails = categoryEmails[folderContext][activeCategory];
    } else {
      // Fall back to folder emails
      currentEmails = allTabEmails[activeTab];
    }

    // Apply focused/other partitioning if category tabs are supported
  if (FOCUSED_TOGGLE_ENABLED && supportsCategoryTabs && currentEmails.length > 0) {
      const { focused } = partitionEmailsByFocus(currentEmails);
      return focused; // default to focused list when toggle is disabled
    }

    return currentEmails;
  };

  const filteredEmails = getCurrentEmails();
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
  const baseVisible = (pageType === 'inbox' && !labelName && activeTab === 'all')
    ? chipFilteredEmails
    : filteredEmails;
  const totalLoadedEmails = baseVisible.length;
  const maxPageIndex = Math.max(0, Math.floor(Math.max(0, totalLoadedEmails - 1) / PAGE_SIZE));
  useEffect(() => {
    if (pageIndex > maxPageIndex) setPageIndex(maxPageIndex);
  }, [pageIndex, maxPageIndex]);
  const visibleEmails = baseVisible.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  // Loading overlay conditions: when current tab has no items yet and a fetch is in flight
  const currentListEmpty = (pageType === 'inbox' && !labelName)
    ? (allTabEmails[activeTab]?.length || 0) === 0
    : (emails.length === 0);
  const showLoadingOverlay = currentListEmpty && (loading || loadingMore || isSearching || !!tabLoading);

  // Get current has more status - consider both folder and category pagination
  // getCurrentHasMore temporarily removed with toolbar extraction

  // const currentHasMore = getCurrentHasMore(); // no longer needed directly in render; used implicitly for next-page fetch

  // Use the email counts from state (only show counts for specific tabs)
  const unreadCount = (pageType === 'inbox' && !labelName) ? emailCounts.unread : 0;
  const draftsCount = (pageType === 'inbox' && !labelName) ? emailCounts.drafts : 0;
  const trashCount = (pageType === 'inbox' && !labelName) ? emailCounts.trash : 0;

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

  const handleEmailClick = (id: string) => {
    // Drafts: open thread panel + auto-open inline reply editor with draft content
    if (pageType === 'drafts' || activeTab === 'drafts') {
      const draftEmail = emails.find(email => email.id === id) || allTabEmails.drafts.find(email => email.id === id);
      // Navigate to a drafts thread route (re-using standard email view mechanics)
  // Reuse existing inbox email route (no dedicated drafts/email/:id route defined)
  navigate(`/inbox/email/${id}?draft=1`);
      // Stash draft content into a shared context or window object for inline editor consumption
      if (draftEmail) {
        (window as any).__pendingInlineDraft = {
          draftId: id,
          to: draftEmail.to?.map(r => r.email) || [],
          cc: draftEmail.cc?.map(r => r.email) || [],
          subject: draftEmail.subject,
          body: draftEmail.body,
          attachments: draftEmail.attachments || []
        };
        // Optionally dispatch a custom event for the thread panel to pick up
        window.dispatchEvent(new CustomEvent('open-inline-draft', { detail: { id } }));
      }
    } else if (labelName) {
      // For label emails, navigate to inbox with label parameter
      navigate(`/inbox/email/${id}?labelName=${encodeURIComponent(labelName)}`);
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
          archive: prev.archive.map(e => e.id === updatedEmail.id ? updatedEmail : e),
          allmail: prev.allmail.map(e => e.id === updatedEmail.id ? updatedEmail : e)
        };
      });
      
      // Also update category emails
      setCategoryEmails(prev => {
        const updatedCategories = { ...prev };
        Object.keys(updatedCategories).forEach(folderKey => {
          const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
          Object.keys(folder).forEach(categoryKey => {
            folder[categoryKey as keyof typeof folder] = 
              folder[categoryKey as keyof typeof folder].map(email => 
                email.id === updatedEmail.id ? updatedEmail : email
              );
          });
        });
        return updatedCategories;
      });
      
      // Update unread count if an email was marked as read
      const currentEmail = allTabEmails.unread.find(email => email.id === updatedEmail.id);
      if (currentEmail && !currentEmail.isRead && updatedEmail.isRead) {
        setEmailCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
    } else {
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === updatedEmail.id ? updatedEmail : email
        )
      );
    }

    // Restore scroll position after state update
    setTimeout(() => {
      if (emailListRef.current && scrollPositionRef.current > 0) {
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
          archive: prev.archive.filter(email => email.id !== emailId),
          allmail: prev.allmail.filter(email => email.id !== emailId)
        }));
        
        // Also remove from category emails
        setCategoryEmails(prev => {
          const updatedCategories = { ...prev };
          Object.keys(updatedCategories).forEach(folderKey => {
            const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
            Object.keys(folder).forEach(categoryKey => {
              folder[categoryKey as keyof typeof folder] = 
                folder[categoryKey as keyof typeof folder].filter(email => email.id !== emailId);
            });
          });
          return updatedCategories;
        });
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

  // Simple and reliable search suggestions
  const generateSimpleSearchSuggestions = (query: string): SearchSuggestion[] => {
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
        senders.add(`from:"${email.from.name}"`);
      }
      if (email.from.email.toLowerCase().includes(lowerQuery)) {
        senders.add(`from:${email.from.email}`);
      }
      
      // Add subject suggestions
      if (email.subject.toLowerCase().includes(lowerQuery)) {
        const shortSubject = email.subject.length > 40 ? email.subject.substring(0, 40) + '...' : email.subject;
        subjects.add(`subject:"${shortSubject}"`);
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
  };

  // Handle search input changes - immediate suggestions
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      const suggestions = generateSimpleSearchSuggestions(value);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    const searchQuery = suggestion.title || suggestion.snippet;
    setSearchQuery(searchQuery);
    setShowSuggestions(false);
    
    // Automatically search when suggestion is selected
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setTimeout(() => handleSearchSubmit(fakeEvent), 100);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      // If empty search, just refresh current tab
      handleRefresh();
      return;
    }

    console.log(`🔍 Searching emails with query: "${searchQuery}"`);
    setIsSearching(true);
    setShowSuggestions(false); // Hide suggestions during search
    
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
      
      // Update page tokens
      setPageTokens(prev => ({
        ...prev,
        [activeTab]: searchResults.nextPageToken
      }));
      
      console.log(`✅ Search completed: Found ${searchResults.emails.length} emails`);
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      // Show error or fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const currentEmails = (pageType === 'inbox' && !labelName) ? allTabEmails[activeTab] : emails;
    const email = currentEmails.find(email => email.id === active.id);
    setActiveEmail(email || null);
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    setActiveEmail(null);
    // Handle drag end logic here
  };

  const handleDragCancel = () => {
    setActiveEmail(null);
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
                  ? 'Setting up your Gmail connection, please wait...'
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
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-yellow-600" />
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
    <ThreeColumnLayout onEmailUpdate={handleEmailUpdate}>
      <div className="h-full flex flex-col min-h-0">
        {/* Search Bar - Always Visible */}
        <div className="flex-shrink-0 bg-[#F9FAFB] border-b border-gray-200 p-2.5 space-y-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search emails..."
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
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <button
                type="button"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Filter size={14} />
                <span>Filter</span>
                <ChevronDown size={12} className={`transform transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                      <input
                        type="text"
                        placeholder="Enter sender email or name"
                        value={filterCriteria.from}
                        onChange={(e) => setFilterCriteria(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filterCriteria.hasAttachment}
                          onChange={(e) => setFilterCriteria(prev => ({ ...prev, hasAttachment: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Has attachment</span>
                        <Paperclip size={14} className="text-gray-400" />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From date</label>
                        <input
                          type="date"
                          value={filterCriteria.dateRange.start}
                          onChange={(e) => setFilterCriteria(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To date</label>
                        <input
                          type="date"
                          value={filterCriteria.dateRange.end}
                          onChange={(e) => setFilterCriteria(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterCriteria({ from: '', hasAttachment: false, dateRange: { start: '', end: '' } });
                          setShowFilterDropdown(false);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={applyFilters}
                        className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {/* Select All Checkbox */}
              <label className="flex items-center mr-3">
                <input
                  type="checkbox"
                  checked={filteredEmails.length > 0 && selectedEmails.size === filteredEmails.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmails(new Set(visibleEmails.map(email => email.id)));
                    } else {
                      setSelectedEmails(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1 text-xs text-gray-600">All</span>
              </label>
              
              <button
                onClick={handleDeleteSelected}
                disabled={selectedEmails.size === 0}
                className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
              
              <button
                onClick={handleArchiveSelected}
                disabled={selectedEmails.size === 0}
                className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
              
              <button
                onClick={handleMarkReadSelected}
                disabled={selectedEmails.size === 0}
                className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MailOpen size={14} />
                <span>Mark Read</span>
              </button>
              
              <button
                onClick={handleMarkUnreadSelected}
                disabled={selectedEmails.size === 0}
                className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mail size={14} />
                <span>Mark Unread</span>
              </button>
              
              <button
                onClick={handleRefreshCurrentTab}
                disabled={refreshing}
                className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh current tab"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
            
            {selectedEmails.size > 0 && (
              <span className="text-xs text-gray-600">
                {selectedEmails.size} selected
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis]}
          >
          <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col mx-4 min-w-[480px] max-w-full min-h-0 relative">
            {/* Filter Chips (no categories, no Focused/Other) */}
            {pageType === 'inbox' && !labelName && (
              <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleFilter('unread')}
                    className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      activeFilters.unread
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Mail size={12} />
                    <span>Unread</span>
                  </button>
                  <button
                    onClick={() => toggleFilter('attachments')}
                    className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      activeFilters.attachments
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Paperclip size={12} />
                    <span>Attachments</span>
                  </button>
                </div>
              </div>
            )}
            {/* Loading Overlay: searching or initial/tab fetch */}
            {showLoadingOverlay && (
              <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-95 backdrop-blur-sm z-30">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading emails...</h3>
                    <p className="text-gray-600">Please wait while we fetch your messages</p>
                  </div>
                </div>
              </div>
            )}

            {/* Header with refresh button for non-inbox pages or label pages */}
            {(pageType !== 'inbox' || labelName) && (
              <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                {labelName ? (
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-800">Label: {labelName}</h2>
                    <button
                      onClick={() => navigate('/inbox')}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                      title="Close label view"
                    >
                      <X size={16} className="text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <div></div>
                )}
                <button 
                  onClick={handleRefresh}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                  disabled={refreshing || isSearching}
                  title="Refresh emails"
                >
                  <RefreshCw size={16} className={`text-gray-500 hover:text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
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
            ) : filteredEmails.length > 0 ? (
              <div ref={emailListRef} className="flex-1 overflow-y-auto max-w-full min-h-0" style={{ height: '0' }}>
                {visibleEmails.map((email) => (
                  <EmailListItem 
                    key={email.id} 
                    email={email} 
                    onClick={handleEmailClick}
                    onEmailUpdate={handleEmailUpdate}
                    onEmailDelete={handleEmailDelete}
                    onCreateFilter={handleCreateFilter}
                    currentTab={pageType === 'inbox' && !labelName ? activeTab : undefined}
                    isSelected={selectedEmails.has(email.id)}
                    onToggleSelect={handleToggleSelectEmail}
                  />
                ))}
                
                {/* Pagination controls moved to toolbar; load more button removed */}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {labelName ? `No emails found for label "${labelName}"` :
                   pageType === 'drafts' ? 'No drafts' : 
                   pageType === 'sent' ? 'No sent emails' : 
                   pageType === 'trash' ? 'Trash is empty' : 
                   pageType === 'unread' ? 'No unread emails' : 
                   activeTab === 'unread' ? 'No unread emails' :
                   activeTab === 'important' ? 'No important emails' :
                   'No emails'}
                </p>
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          {createPortal(
            <DragOverlay>
              {activeEmail ? (
                <div className="opacity-60 bg-white rounded-lg shadow-lg border-2 border-blue-300">
                  <EmailListItem 
                    key={`drag-${activeEmail.id}`}
                    email={activeEmail} 
                    onClick={() => {}}
                    isDraggable={false}
                    onEmailUpdate={() => {}}
                    onEmailDelete={() => {}}
                    onCreateFilter={() => {}}
                    isSelected={false}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
          </DndContext>
        </div>
      </div>
    </ThreeColumnLayout>
  );
}

export default EmailPageLayout;