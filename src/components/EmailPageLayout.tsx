import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Search, ChevronDown, Settings, X, Trash2 } from 'lucide-react';
import { type SearchSuggestion } from '../services/searchService';
import EmailListItem from '../components/EmailListItem';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Email } from '../types';
import { 
  getEmails, 
  getSentEmails, 
  getDraftEmails, 
  getTrashEmails,
  getImportantEmails,
  getLabelEmails,
  markAsRead,
  emptyTrash
} from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';
import { useInboxLayout } from '../contexts/InboxLayoutContext';
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
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important'>('unread');
  const [hasEverLoaded, setHasEverLoaded] = useState(false); // Track if we've ever successfully loaded

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
    important: [] as Email[]
  });

  // Page tokens for each tab type
  const [pageTokens, setPageTokens] = useState({
    all: undefined as string | undefined,
    unread: undefined as string | undefined,
    sent: undefined as string | undefined,
    drafts: undefined as string | undefined,
    trash: undefined as string | undefined,
    important: undefined as string | undefined
  });

  // Has more emails for each tab type
  const [hasMoreForTabs, setHasMoreForTabs] = useState({
    all: false,
    unread: false,
    sent: false,
    drafts: false,
    trash: false,
    important: false
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

  // Fetch all email types initially - UX optimized for unread first
  const fetchAllEmailTypes = async (forceRefresh = false) => {
    if (!isGmailSignedIn || labelName) return;

    try {
      console.log('📧 Starting optimized email fetch - unread first...');
      setLoading(true);

      // STEP 1: Load inbox emails and immediately show unread (fastest UX)
      console.log('📧 Fetching inbox emails for unread calculation...');
      const inboxEmails = await getEmails(forceRefresh, '', 25, undefined);
      
      // Calculate and show unread immediately - this is what users want to see first
      const inboxEmailsList = inboxEmails.emails || [];
      const unreadEmails = inboxEmailsList.filter(email => !email.isRead);
      
      console.log(`📧 Unread emails ready: ${unreadEmails.length} unread out of ${inboxEmailsList.length} total`);
      
      // Update UI immediately with unread and all tabs - user sees content instantly
      setAllTabEmails(prev => ({
        ...prev,
        all: inboxEmailsList,
        unread: unreadEmails
      }));

      // STEP 2: Load everything else in parallel for maximum speed
      console.log('📧 Loading remaining email types in parallel...');
      const [sentEmails, draftsEmails, trashEmails, importantEmails] = await Promise.all([
        getSentEmails(forceRefresh, 15, undefined),
        getDraftEmails(forceRefresh),
        getTrashEmails(forceRefresh, 15, undefined),
        getImportantEmails(forceRefresh, 15, undefined)
      ]);

      console.log('📧 Email fetch results:', {
        inbox: inboxEmailsList.length,
        sent: sentEmails.emails?.length || 0,
        drafts: draftsEmails?.length || 0,
        trash: trashEmails.emails?.length || 0,
        important: importantEmails.emails?.length || 0
      });

      // Calculate additional data from fetched emails
      const importantEmailsList = importantEmails.emails || [];
      const sentEmailsList = sentEmails.emails || [];
      const trashEmailsList = trashEmails.emails || [];

      // Update all tab emails (final update with all data)
      setAllTabEmails(prev => ({
        ...prev,
        sent: sentEmailsList,
        drafts: draftsEmails?.slice(0, 10) || [],
        trash: trashEmailsList,
        important: importantEmailsList
      }));

      // Update page tokens
      setPageTokens({
        all: inboxEmails.nextPageToken,
        unread: undefined, // Calculated from inbox
        sent: sentEmails.nextPageToken, // Sent has its own pagination
        drafts: undefined, // No pagination for drafts
        trash: trashEmails.nextPageToken, // Trash has its own pagination
        important: importantEmails.nextPageToken // Important has its own pagination
      });

      // Update has more flags (show load more if there are more emails available)
      setHasMoreForTabs({
        all: !!inboxEmails.nextPageToken,
        unread: !!inboxEmails.nextPageToken && unreadEmails.length >= 10, // Show load more if there might be more unread emails
        sent: !!sentEmails.nextPageToken,
        drafts: (draftsEmails?.length || 0) > 10,
        trash: !!trashEmails.nextPageToken,
        important: !!importantEmails.nextPageToken // Important has its own pagination
      });

      // Update counts (show 99+ for high counts, except what we don't want to show)
      setEmailCounts({
        unread: Math.min(unreadEmails.length, 99),
        drafts: Math.min(draftsEmails?.length || 0, 99),
        trash: Math.min(trashEmailsList.length, 99)
      });

      setHasEverLoaded(true); // Mark that we've successfully loaded emails
      setLoading(false);
    } catch (error) {
      console.error('Error fetching all email types:', error);
      setLoading(false);
    }
  };

  // Load more emails for specific tab
  const loadMoreForTab = async (tabType: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important') => {
    if (!isGmailSignedIn || labelName) return;

    try {
      setLoadingMore(true);

      if (tabType === 'all') {
        // Load more inbox emails
        const pageToken = pageTokens.all;
        const response = await getEmails(false, '', 20, pageToken);
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
        const response = await getEmails(false, '', 20, pageToken);
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
        const pageToken = pageTokens.sent;
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
      }

      setLoadingMore(false);
    } catch (error) {
      console.error(`Error loading more ${tabType} emails:`, error);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    console.log('📧 EmailPageLayout useEffect triggered:', {
      isGmailSignedIn,
      pageType,
      labelName,
      authLoading,
      isGmailInitializing
    });

    // Don't fetch if still loading auth or initializing Gmail
    if (authLoading || isGmailInitializing) {
      console.log('📧 Skipping fetch - auth still loading or Gmail initializing');
      return;
    }

    if (isGmailSignedIn && pageType === 'inbox' && !labelName) {
      // Fetch all email types when component mounts or authentication changes
      console.log('📧 Starting fetchAllEmailTypes...');
      fetchAllEmailTypes();
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
  }, [isGmailSignedIn, pageType, labelName, authLoading, isGmailInitializing]);

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
      // For inbox, refresh all email types
      await fetchAllEmailTypes(true);
    }
    
    setRefreshing(false);
  };

  const handleEmptyTrash = async () => {
    if (!isGmailSignedIn || isEmptyingTrash) return;
    
    // Confirm action with user
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete all emails in trash? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    setIsEmptyingTrash(true);
    
    try {
      await emptyTrash();
      
      // Clear trash emails from local state
      setAllTabEmails(prev => ({
        ...prev,
        trash: []
      }));
      
      // Update trash count
      setEmailCounts(prev => ({
        ...prev,
        trash: 0
      }));
      
      console.log('✅ Trash emptied successfully');
    } catch (error) {
      console.error('❌ Failed to empty trash:', error);
      // You could show a toast notification here
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !isGmailSignedIn) return;

    if (labelName) {
      // For labels, use old load more logic
      if (hasMoreEmails) {
        fetchLabelEmails(false, true);
      }
    } else {
      // For inbox tabs, use new tab-specific load more
      if (hasMoreForTabs[activeTab]) {
        loadMoreForTab(activeTab);
      }
    }
  };

  // Get current emails based on active tab (proper filtering)
  const filteredEmails = (pageType === 'inbox' && !labelName) ? allTabEmails[activeTab] : emails;

  // Get current has more status
  const currentHasMore = (pageType === 'inbox' && !labelName) ? hasMoreForTabs[activeTab] : hasMoreEmails;

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
    // Mark as read if clicked from unread tab (but don't wait for it)
    if (activeTab === 'unread' && pageType === 'inbox' && !labelName) {
      markAsRead(id).catch(error => {
        console.error('Failed to mark email as read:', error);
      });
    }
    
    // Handle drafts differently - open in compose mode for editing
    if (pageType === 'drafts' || activeTab === 'drafts') {
      // Find the draft email to get its details
      const draftEmail = emails.find(email => email.id === id) || 
                        allTabEmails.drafts.find(email => email.id === id);
      
      if (draftEmail) {
        // Convert CC recipients to comma-separated string for the Compose component
        const ccRecipients = draftEmail.cc?.map(cc => cc.email).join(', ') || '';
        
        // Navigate to compose with draft data for editing
        navigate('/compose', {
          state: {
            to: draftEmail.to?.[0]?.email || '',
            cc: ccRecipients, // Add CC support for drafts
            subject: draftEmail.subject || '',
            body: draftEmail.body || '',
            draftId: id,
            isDraft: true,
            // Pass attachments if they exist
            attachments: draftEmail.attachments?.map(att => ({
              name: att.name,
              mimeType: att.mimeType,
              size: att.size,
              attachmentId: att.attachmentId
            }))
          }
        });
      } else {
        // Fallback to regular view if draft not found
        navigate(`/drafts/email/${id}`);
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
    if (pageType === 'inbox' && !labelName) {
      // Update in all relevant tab arrays
      setAllTabEmails(prev => ({
        all: prev.all.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        unread: prev.unread.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        sent: prev.sent.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        drafts: prev.drafts.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        trash: prev.trash.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        important: prev.important.map(email => email.id === updatedEmail.id ? updatedEmail : email)
      }));
    } else {
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === updatedEmail.id ? updatedEmail : email
        )
      );
    }
  };

  const handleEmailDelete = (emailId: string) => {
    if (pageType === 'inbox' && !labelName) {
      // Remove from all relevant tab arrays
      setAllTabEmails(prev => ({
        all: prev.all.filter(email => email.id !== emailId),
        unread: prev.unread.filter(email => email.id !== emailId),
        sent: prev.sent.filter(email => email.id !== emailId),
        drafts: prev.drafts.filter(email => email.id !== emailId),
        trash: prev.trash.filter(email => email.id !== emailId),
        important: prev.important.filter(email => email.id !== emailId)
      }));
    } else {
      setEmails(prevEmails => 
        prevEmails.filter(email => email.id !== emailId)
      );
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

  const handleTabChange = (value: string) => {
    const newTab = value as 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important';
    setActiveTab(newTab);
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
      // Create Gmail search query
      const gmailQuery = searchQuery.trim();
      
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
          <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
        </div>
        
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
        <form onSubmit={handleSearchSubmit} className="flex-shrink-0 p-4 pb-0 bg-white border-b border-gray-200 mb-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            
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
          </div>
        </form>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis]}
          >
          <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col mx-4 max-w-full min-h-0 relative">
            {/* Search Loading Overlay - Only when searching */}
            {isSearching && (
              <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-95 backdrop-blur-sm z-30">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Searching emails...</h3>
                    <p className="text-gray-600">Please wait while we search your emails</p>
                  </div>
                  <div className="w-64 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs Navigation - Only show for inbox without label filter */}
            {pageType === 'inbox' && !labelName && (
              <div className="flex-shrink-0 border-b border-gray-200 max-w-full overflow-hidden">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full email-tabs max-w-full">
                  <TabsList className="h-12 bg-transparent p-0 border-0 rounded-none w-full justify-between max-w-full overflow-hidden">
                    <div className="flex min-w-0 overflow-x-auto">
                      <TabsTrigger 
                        value="unread" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Unread {unreadCount > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{unreadCount >= 99 ? '99+' : unreadCount}</span>}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="all" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger 
                        value="sent" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Sent
                      </TabsTrigger>
                      <TabsTrigger 
                        value="drafts" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Drafts {draftsCount > 0 && <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{draftsCount >= 99 ? '99+' : draftsCount}</span>}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="trash" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Trash {trashCount > 0 && <span className="ml-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{trashCount >= 99 ? '99+' : trashCount}</span>}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="important" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Important
                      </TabsTrigger>
                    </div>
                    <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                      {/* Delete All button for trash tab */}
                      {activeTab === 'trash' && trashCount > 0 && (
                        <button 
                          onClick={handleEmptyTrash}
                          className="px-2 py-2 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center text-red-600 hover:text-red-700"
                          disabled={refreshing || isSearching || isEmptyingTrash}
                          title="Empty trash (permanently delete all)"
                        >
                          <Trash2 size={16} className={`mr-1 ${isEmptyingTrash ? 'animate-pulse' : ''}`} />
                          <span className="text-sm font-medium">Delete all</span>
                        </button>
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
                  </TabsList>
                </Tabs>
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
            {isEmptyingTrash ? (
              <div className="flex-1 flex justify-center items-center min-h-0">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="absolute inset-0 border-4 border-red-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Emptying trash...</h3>
                    <p className="text-gray-600">Permanently deleting all emails in trash</p>
                  </div>
                  <div className="w-64 bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            ) : (!hasEverLoaded || loading || authLoading || isGmailInitializing) && !refreshing ? (
              <div className="flex-1 flex justify-center items-center min-h-0">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                  <p className="text-sm text-gray-500">
                    {authLoading || isGmailInitializing ? 'Connecting to Gmail...' : 'Loading emails...'}
                  </p>
                </div>
              </div>
            ) : filteredEmails.length > 0 ? (
              <div className="flex-1 overflow-y-auto max-w-full min-h-0" style={{ height: '0' }}>
                {filteredEmails.map((email) => (
                  <EmailListItem 
                    key={email.id} 
                    email={email} 
                    onClick={handleEmailClick}
                    onEmailUpdate={handleEmailUpdate}
                    onEmailDelete={handleEmailDelete}
                    onCreateFilter={handleCreateFilter}
                    currentTab={pageType === 'inbox' && !labelName ? activeTab : undefined}
                  />
                ))}
                
                {/* Load More Button */}
                {currentHasMore && (
                  <div className="border-t border-gray-200 p-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full btn btn-secondary flex items-center justify-center"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500 mr-2"></div>
                          Loading more emails...
                        </>
                      ) : (
                        <>
                          <ChevronDown size={18} className="mr-2" />
                          Load More Emails
                        </>
                      )}
                    </button>
                  </div>
                )}
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
                    email={activeEmail} 
                    onClick={() => {}}
                    isDraggable={false}
                    onEmailUpdate={() => {}}
                    onEmailDelete={() => {}}
                    onCreateFilter={() => {}}
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