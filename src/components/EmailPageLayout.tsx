import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Search, ChevronDown, Settings } from 'lucide-react';
import EmailListItem from '../components/EmailListItem';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import { Email } from '../types';
import { 
  getEmails, 
  getUnreadEmails, 
  getSentEmails, 
  getDraftEmails, 
  getTrashEmails,
  PaginatedEmailServiceResponse, 
  applyLabelsToEmail 
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
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(undefined);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
  const [resultSizeEstimate, setResultSizeEstimate] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { isGmailSignedIn } = useAuth();
  const { selectEmail } = useInboxLayout();
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Email pagination settings
  const EMAIL_PAGE_SIZE = 50;

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Get the appropriate email service function
  const getEmailsFunction = () => {
    switch (pageType) {
      case 'unread':
        return getUnreadEmails;
      case 'sent':
        return getSentEmails;
      case 'drafts':
        return getDraftEmails;
      case 'trash':
        return getTrashEmails;
      default:
        return (forceRefresh: boolean = false, searchQuery?: string, pageToken?: string) => 
          getEmails(forceRefresh, searchQuery, pageToken);
    }
  };

  useEffect(() => {
    fetchEmails(true);
  }, [pageType]);

  const fetchEmails = async (forceRefresh = false, loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const searchParams = new URLSearchParams(location.search);
      const fromEmail = searchParams.get('from');
      const labelName = searchParams.get('labelName');
      
      let query = '';
      if (fromEmail) {
        query += `from:${fromEmail}`;
      }
      if (labelName) {
        query += ` label:${labelName}`;
      }

      const emailFunction = getEmailsFunction();
      let response: PaginatedEmailServiceResponse;

      if (pageType === 'inbox') {
        response = await emailFunction(forceRefresh, query || undefined, loadMore ? currentPageToken : undefined);
      } else {
        // For other page types, call the function with forceRefresh only
        const emailsData = await emailFunction(forceRefresh);
        response = {
          emails: emailsData,
          resultSizeEstimate: emailsData.length,
          nextPageToken: undefined
        };
      }

      if (loadMore && currentPageToken) {
        setEmails(prevEmails => [...prevEmails, ...response.emails]);
      } else {
        setEmails(response.emails);
      }

      setCurrentPageToken(response.nextPageToken);
      setHasMoreEmails(!!response.nextPageToken);
      setResultSizeEstimate(response.resultSizeEstimate || 0);
    } catch (error) {
      console.error(`Error fetching ${pageType} emails:`, error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails(true);
  };

  const handleLoadMore = () => {
    if (hasMoreEmails && !loadingMore) {
      fetchEmails(false, true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleEmailClick = (id: string) => {
    // Update URL to show selected email
    navigate(`/${pageType}/email/${id}`);
    // Select email in context
    selectEmail(id);
  };

  const handleEmailUpdate = (updatedEmail: Email) => {
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === updatedEmail.id ? updatedEmail : email
      )
    );
  };

  const handleEmailDelete = (emailId: string) => {
    // Remove the email from the list immediately
    setEmails(prevEmails => 
      prevEmails.filter(email => email.id !== emailId)
    );
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (over && over.id.toString().startsWith('droppable-')) {
      const labelId = over.id.toString().replace('droppable-', '');
      const emailId = active.id.toString();
      
      try {
        await applyLabelsToEmail(emailId, [labelId]);
        fetchEmails(true);
        alert(`Label applied successfully`);
      } catch (error) {
        console.error('Error applying label during drag and drop:', error);
        alert('Failed to apply label. Please try again.');
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeEmail = activeId ? emails.find(email => email.id === activeId) : null;

  // Get the filtered information to display in the heading
  const searchParams = new URLSearchParams(location.search);
  const fromEmail = searchParams.get('from');
  const labelName = searchParams.get('labelName');
  
  let headingText = title;
  const activeFilters = [];
  
  if (labelName) {
    activeFilters.push(`Label: ${labelName}`);
  }
  
  if (fromEmail) {
    activeFilters.push(`From: ${fromEmail}`);
  }
  
  if (activeFilters.length > 0) {
    headingText = `${title} - Filtered by ${activeFilters.join(', ')}`;
  }

  // If Gmail is not signed in, show connection prompt
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">{headingText}</h1>
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
      <div className="fade-in h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-semibold text-gray-800">{headingText}</h1>
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
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
            </div>
            {resultSizeEstimate > 0 && (
              <p className="text-sm text-gray-600">
                {resultSizeEstimate} email{resultSizeEstimate === 1 ? '' : 's'} found
              </p>
            )}
          </div>
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary flex items-center ml-4"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          modifiers={[restrictToVerticalAxis]}
        >
          <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            {loading && !refreshing ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : emails.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                {emails.map((email) => (
                  <EmailListItem 
                    key={email.id} 
                    email={email} 
                    onClick={handleEmailClick}
                    onEmailUpdate={handleEmailUpdate}
                    onEmailDelete={handleEmailDelete}
                  />
                ))}
                
                {/* Load More Button */}
                {hasMoreEmails && (
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
                
                {/* End of results message */}
                {!hasMoreEmails && emails.length >= EMAIL_PAGE_SIZE && (
                  <div className="border-t border-gray-200 p-4 text-center">
                    <p className="text-sm text-gray-500">
                      You've reached the end of the emails
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {fromEmail || labelName ? `No ${pageType} emails found for the current filter` : `Your ${pageType} is empty`}
                </p>
              </div>
            )}
          </div>
          
          {/* Drag overlay */}
          {createPortal(
            <DragOverlay>
              {activeId && activeEmail ? (
                <div className="bg-white rounded border shadow-md w-80">
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
