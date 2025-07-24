import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Search, ChevronDown, Settings, X } from 'lucide-react';
import EmailListItem from '../components/EmailListItem';
import { Email } from '../types';
import { getEmails, PaginatedEmailServiceResponse, applyLabelsToEmail } from '../services/emailService';
import { checkAndUpdatePriceRequestStatuses } from '../services/backendApi';
import { useAuth } from '../contexts/AuthContext';
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

function Inbox() {
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
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Email pagination settings
  const EMAIL_PAGE_SIZE = 50; // Increased from 20 to reduce API calls but still manageable

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Configure to require a small drag distance to activate
      activationConstraint: {
        distance: 8, // 8px
      },
    }),
    useSensor(TouchSensor, {
      // Configure to allow short press for touch devices
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const fetchEmails = async (forceRefresh = false, loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Get URL parameters
      const searchParams = new URLSearchParams(location.search);
      const fromEmail = searchParams.get('from');
      const labelName = searchParams.get('labelName');
      const gmailQuery = searchParams.get('q'); // Gmail search query format
      
      // Construct query based on URL parameters
      let query = 'in:inbox';
      
      // If there's a direct Gmail query, use it
      if (gmailQuery) {
        query = gmailQuery;
      }
      // Add label filter if present - use labelName instead of labelId for better compatibility
      else if (labelName) {
        query = `label:"${labelName}"`;
      }
      
      // Add from filter if present
      if (fromEmail) {
        query = gmailQuery ? `${query} from:${fromEmail}` : (labelName ? `${query} from:${fromEmail}` : `from:${fromEmail} in:inbox`);
      }
      
      // Add search query if provided
      if (searchQuery.trim()) {
        query = `${searchQuery} ${query}`;
      }
      
      // Use pageToken for pagination if loading more
      const pageToken = loadMore ? currentPageToken : undefined;
      
      const response: PaginatedEmailServiceResponse = await getEmails(
        forceRefresh, 
        query, 
        EMAIL_PAGE_SIZE, 
        pageToken
      );
      
      if (loadMore) {
        // Append new emails to existing list
        setEmails(prevEmails => [...prevEmails, ...response.emails]);
      } else {
        // Replace email list
        setEmails(response.emails);
      }
      
      // Update pagination state
      setCurrentPageToken(response.nextPageToken);
      setHasMoreEmails(!!response.nextPageToken);
      
      if (response.resultSizeEstimate !== undefined) {
        setResultSizeEstimate(response.resultSizeEstimate);
      }

      // Check for email activity and update price request statuses (only on non-paginated requests)
      if (!loadMore && !pageToken) {
        try {
          console.log('Checking email activity for price request updates after inbox refresh...');
          await checkAndUpdatePriceRequestStatuses();
          console.log('Email activity check completed from inbox');
        } catch (error) {
          console.error('Error checking email activity from inbox:', error);
          // Don't throw - this is a background operation
        }
      }
      
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Only fetch emails if Gmail is signed in
    if (isGmailSignedIn) {
      // Reset pagination when search params change
      setCurrentPageToken(undefined);
      setHasMoreEmails(false);
      fetchEmails();
    } else {
      setLoading(false);
    }
  }, [location.search, isGmailSignedIn]); // Re-fetch when the search params change or Gmail sign-in status changes

  useEffect(() => {
    // Reset pagination when search query changes
    if (searchQuery.trim() === '' && isGmailSignedIn) {
      setCurrentPageToken(undefined);
      setHasMoreEmails(false);
      fetchEmails();
    }
  }, [searchQuery, isGmailSignedIn]);

  const handleRefresh = () => {
    if (!isGmailSignedIn) return;
    
    setRefreshing(true);
    setCurrentPageToken(undefined);
    setHasMoreEmails(false);
    fetchEmails(true); // Force refresh to get the latest emails
  };

  const handleLoadMore = () => {
    if (hasMoreEmails && !loadingMore && isGmailSignedIn) {
      fetchEmails(false, true);
    }
  };

  const handleEmailClick = (id: string) => {
    navigate(`/email/${id}`);
  };

  const handleEmailUpdate = (updatedEmail: Email) => {
    // Update the email in the list
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === updatedEmail.id ? updatedEmail : email
      )
    );
  };

  const handleSearch = async (query: string) => {
    if (!isGmailSignedIn) return;
    
    if (!query.trim()) {
      // Reset search query will trigger useEffect to fetch emails
      return;
    }
    
    try {
      setLoading(true);
      setCurrentPageToken(undefined);
      setHasMoreEmails(false);
      
      const searchParams = new URLSearchParams(location.search);
      const fromEmail = searchParams.get('from');
      const labelName = searchParams.get('labelName');
      
      // Construct query with existing filters
      let fullQuery = 'in:inbox';
      
      if (labelName) {
        fullQuery = `label:"${labelName}"`;
      }
      
      if (fromEmail) {
        fullQuery = labelName ? `${fullQuery} from:${fromEmail}` : `from:${fromEmail} in:inbox`;
      }
      
      // Add the search query
      fullQuery = `${query} ${fullQuery}`;
      
      const response = await getEmails(false, fullQuery, EMAIL_PAGE_SIZE);
      setEmails(response.emails);
      setCurrentPageToken(response.nextPageToken);
      setHasMoreEmails(!!response.nextPageToken);
      
      if (response.resultSizeEstimate !== undefined) {
        setResultSizeEstimate(response.resultSizeEstimate);
      }
    } catch (error) {
      console.error('Error searching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleClearFilters = () => {
    navigate('/inbox');
  };

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    // If the item was dropped on a droppable target
    if (over && over.id.toString().startsWith('droppable-')) {
      // Extract the label ID from the droppable ID (remove "droppable-" prefix)
      const labelId = over.id.toString().replace('droppable-', '');
      const emailId = active.id.toString();
      
      try {
        // Apply the label to the email
        await applyLabelsToEmail(emailId, [labelId]);
        
        // Refresh the email list to reflect the changes
        fetchEmails(true);
        
        // Show a confirmation message
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

  // Get the active email when dragging
  const activeEmail = activeId ? emails.find(email => email.id === activeId) : null;

  // Get the filtered information to display in the heading
  const searchParams = new URLSearchParams(location.search);
  const fromEmail = searchParams.get('from');
  const labelName = searchParams.get('labelName');
  
  let headingText = 'Inbox';
  const activeFilters = [];
  
  if (labelName) {
    activeFilters.push(`Label: ${labelName}`);
  }
  
  if (fromEmail) {
    activeFilters.push(`From: ${fromEmail}`);
  }
  
  if (activeFilters.length > 0) {
    headingText = `Inbox - Filtered by ${activeFilters.join(', ')}`;
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
    <div className="fade-in">
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
          {(fromEmail || labelName) && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearFilters}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
              >
                <X size={14} className="mr-1" />
                Clear all filters
              </button>
            </div>
          )}
          {resultSizeEstimate > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Showing {emails.length} of approximately {resultSizeEstimate.toLocaleString()} emails
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && !refreshing ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : emails.length > 0 ? (
            <>
              {emails.map((email) => (
                <EmailListItem 
                  key={email.id} 
                  email={email} 
                  onClick={handleEmailClick}
                  onEmailUpdate={handleEmailUpdate}
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
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {fromEmail || labelName ? 'No emails found for the current filter' : 'Your inbox is empty'}
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
                />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}

export default Inbox;