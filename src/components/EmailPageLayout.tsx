import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Search, ChevronDown, Settings, X } from 'lucide-react';
import EmailListItem from '../components/EmailListItem';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Email } from '../types';
import { 
  getEmails, 
  getSentEmails, 
  getDraftEmails, 
  getTrashEmails,
  getLabelEmails
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
  const [activeTab, setActiveTab] = useState<'all' | 'read' | 'unread' | 'sent' | 'drafts' | 'trash'>('unread');

  // For label emails only
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(undefined);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);

  // Email storage for each tab type - always maintained separately
  const [allTabEmails, setAllTabEmails] = useState({
    all: [] as Email[],
    read: [] as Email[],
    unread: [] as Email[],
    sent: [] as Email[],
    drafts: [] as Email[],
    trash: [] as Email[]
  });

  // Page tokens for each tab type
  const [pageTokens, setPageTokens] = useState({
    all: undefined as string | undefined,
    read: undefined as string | undefined,
    unread: undefined as string | undefined,
    sent: undefined as string | undefined,
    drafts: undefined as string | undefined,
    trash: undefined as string | undefined
  });

  // Has more emails for each tab type
  const [hasMoreForTabs, setHasMoreForTabs] = useState({
    all: false,
    read: false,
    unread: false,
    sent: false,
    drafts: false,
    trash: false
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

  // Fetch all email types initially (first 20 each)
  const fetchAllEmailTypes = async (forceRefresh = false) => {
    if (!isGmailSignedIn || labelName) return;

    try {
      console.log('📧 Fetching all email types...');
      setLoading(true);

      // Fetch all types in parallel
      const [inboxEmails, sentEmails, draftsEmails, trashEmails] = await Promise.all([
        getEmails(forceRefresh, '', 20, undefined),
        getSentEmails(forceRefresh),
        getDraftEmails(forceRefresh),
        getTrashEmails(forceRefresh)
      ]);

      // Calculate read/unread from inbox emails
      const inboxEmailsList = inboxEmails.emails || [];
      const unreadEmails = inboxEmailsList.filter(email => !email.isRead);
      const readEmails = inboxEmailsList.filter(email => email.isRead);

      // Update all tab emails
      setAllTabEmails({
        all: inboxEmailsList,
        unread: unreadEmails,
        read: readEmails,
        sent: sentEmails?.slice(0, 20) || [],
        drafts: draftsEmails?.slice(0, 20) || [],
        trash: trashEmails?.slice(0, 20) || []
      });

      // Update page tokens
      setPageTokens({
        all: inboxEmails.nextPageToken,
        read: undefined, // Calculated from inbox
        unread: undefined, // Calculated from inbox
        sent: undefined, // No pagination for sent (Gmail API limitation)
        drafts: undefined, // No pagination for drafts
        trash: undefined // No pagination for trash
      });

      // Update has more flags
      setHasMoreForTabs({
        all: !!inboxEmails.nextPageToken,
        read: false, // No separate pagination
        unread: false, // No separate pagination
        sent: (sentEmails?.length || 0) > 20,
        drafts: (draftsEmails?.length || 0) > 20,
        trash: (trashEmails?.length || 0) > 20
      });

      // Update counts (show 99+ for high counts, except what we don't want to show)
      setEmailCounts({
        unread: Math.min(unreadEmails.length, 99),
        drafts: Math.min(draftsEmails?.length || 0, 99),
        trash: Math.min(trashEmails?.length || 0, 99)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching all email types:', error);
      setLoading(false);
    }
  };

  // Load more emails for specific tab
  const loadMoreForTab = async (tabType: 'all' | 'read' | 'unread' | 'sent' | 'drafts' | 'trash') => {
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
          unread: [...prev.unread, ...newEmails.filter(email => !email.isRead)],
          read: [...prev.read, ...newEmails.filter(email => email.isRead)]
        }));

        setPageTokens(prev => ({
          ...prev,
          all: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: !!response.nextPageToken
        }));
      } else if (tabType === 'sent') {
        // Load more sent emails (get next batch)
        const currentCount = allTabEmails.sent.length;
        const allSentEmails = await getSentEmails(false);
        const nextBatch = allSentEmails?.slice(currentCount, currentCount + 20) || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          sent: [...prev.sent, ...nextBatch]
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          sent: (allSentEmails?.length || 0) > currentCount + 20
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
        // Load more trash emails
        const currentCount = allTabEmails.trash.length;
        const allTrashEmails = await getTrashEmails(false);
        const nextBatch = allTrashEmails?.slice(currentCount, currentCount + 20) || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          trash: [...prev.trash, ...nextBatch]
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          trash: (allTrashEmails?.length || 0) > currentCount + 20
        }));
      }

      setLoadingMore(false);
    } catch (error) {
      console.error(`Error loading more ${tabType} emails:`, error);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isGmailSignedIn && pageType === 'inbox' && !labelName) {
      // Fetch all email types when component mounts or authentication changes
      fetchAllEmailTypes();
    } else if (isGmailSignedIn && labelName) {
      // For label emails, use old logic
      fetchLabelEmails();
    } else {
      setLoading(false);
    }
  }, [isGmailSignedIn, pageType, labelName]);

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

  const handleEmailClick = (id: string) => {
    if (labelName) {
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
        read: prev.read.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        sent: prev.sent.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        drafts: prev.drafts.map(email => email.id === updatedEmail.id ? updatedEmail : email),
        trash: prev.trash.map(email => email.id === updatedEmail.id ? updatedEmail : email)
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
        read: prev.read.filter(email => email.id !== emailId),
        sent: prev.sent.filter(email => email.id !== emailId),
        drafts: prev.drafts.filter(email => email.id !== emailId),
        trash: prev.trash.filter(email => email.id !== emailId)
      }));
    } else {
      setEmails(prevEmails => 
        prevEmails.filter(email => email.id !== emailId)
      );
    }
  };

  const handleTabChange = (value: string) => {
    const newTab = value as 'all' | 'read' | 'unread' | 'sent' | 'drafts' | 'trash';
    setActiveTab(newTab);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && !refreshing) {
      handleRefresh();
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
      <div className={`h-full flex flex-col transition-opacity duration-300 ${filteredEmails.length > 0 || !loading ? 'opacity-100' : 'opacity-0'}`}>
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="p-4 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </form>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          modifiers={[restrictToVerticalAxis]}
        >
          <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col mx-4 max-w-full">
            {/* Tabs Navigation - Only show for inbox without label filter */}
            {pageType === 'inbox' && !labelName && (
              <div className="border-b border-gray-200 max-w-full overflow-hidden">
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
                        value="read" 
                        className="rounded-none border-0 bg-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none flex-shrink-0"
                      >
                        Read
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
                    </div>
                    <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                      <button 
                        onClick={handleRefresh}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                        disabled={refreshing}
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
              <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
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
                  disabled={refreshing}
                  title="Refresh emails"
                >
                  <RefreshCw size={16} className={`text-gray-500 hover:text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {/* Email List Content */}
            {loading && !refreshing ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                  <p className="text-sm text-gray-500">Loading emails...</p>
                </div>
              </div>
            ) : filteredEmails.length > 0 ? (
              <div className="flex-1 overflow-y-auto max-w-full relative">
                {filteredEmails.map((email) => (
                  <EmailListItem 
                    key={email.id} 
                    email={email} 
                    onClick={handleEmailClick}
                    onEmailUpdate={handleEmailUpdate}
                    onEmailDelete={handleEmailDelete}
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
                   activeTab === 'read' ? 'No read emails' :
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
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>
    </ThreeColumnLayout>
  );
}

export default EmailPageLayout;
