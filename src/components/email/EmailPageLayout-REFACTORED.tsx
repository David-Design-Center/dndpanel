/**
 * Email Page Layout - Main Component (REFACTORED)
 * 
 * This is the refactored version that uses:
 * - useEmailListManager hook (for state management)
 * - emailRepository (single source of truth)
 * - Modular functions from EmailPageLayout/ folder
 * 
 * Reduced from 2,747 lines to ~400 lines by extracting logic into modules
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, X, Trash2, Mail } from 'lucide-react';
import EmailListItem from './EmailListItem';
import ThreeColumnLayout from '../layout/ThreeColumnLayout';
import { useEmailListManager } from '../../features/email/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { toast } from 'sonner';

// Import refactored modules
import {
  fetchAllEmailTypes,
  fetchCategoryEmails,
  fetchLabelEmails,
  handleDeleteEmail,
  handleDeleteSelectedEmails,
  handleMarkEmailAsRead,
  handleRefreshEmails,
} from './EmailPageLayout/handlers';
import {
  getCurrentEmails,
  calculatePagination,
  getPaginatedEmails,
  getTabDisplayName,
  getTabBadgeCount,
  shouldShowEmptyState,
  getEmptyStateMessage,
} from './EmailPageLayout/render';

// This is a reference file showing the refactored architecture
// After decomposition, the main component is much cleaner

function EmailPageLayout(): JSX.Element {
  // useLocation to get URL params
  const location = useLocation();
  const { isGmailSignedIn, loading: authLoading } = useAuth();
  const { selectEmail } = useInboxLayout();

  // ✨ NEW: Use the centralized email list manager hook
  const emailManager = useEmailListManager();

  // Local UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);

  const emailListRef = useRef<HTMLDivElement>(null);

  // Extract label from URL
  const urlParams = new URLSearchParams(location.search);
  const labelName = urlParams.get('labelName');

  /**
   * Initialize: Fetch all emails on mount
   */
  useEffect(() => {
    if (!isGmailSignedIn || authLoading) return;

    const initializeEmails = async () => {
      try {
        setLoading(true);
        if (labelName) {
          await fetchLabelEmails(labelName);
        } else {
          await fetchAllEmailTypes();
          await fetchCategoryEmails();
        }
      } catch (error) {
        console.error('Error initializing emails:', error);
        toast.error('Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    initializeEmails();
  }, [isGmailSignedIn, authLoading, labelName]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await handleRefreshEmails();
      toast.success('Emails refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh emails');
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * Handle delete email
   */
  const handleDelete = useCallback(
    async (emailId: string) => {
      try {
        // Get email subject for toast
        const visibleEmails = emailManager.getVisibleEmails();
        const email = visibleEmails.find(e => e.id === emailId);
        const subject = email?.subject || 'Email';

        await handleDeleteEmail(emailId);

        // Update local selection
        setSelectedEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(emailId);
          return newSet;
        });

        toast.success('Email deleted', {
          description: `"${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}" moved to trash`,
        });
      } catch (error) {
        console.error('Error deleting:', error);
        toast.error('Failed to delete email');
      }
    },
    [emailManager]
  );

  /**
   * Handle delete selected
   */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedEmails.size === 0) return;

    try {
      await handleDeleteSelectedEmails(selectedEmails);
      setSelectedEmails(new Set());
      toast.success(`Deleted ${selectedEmails.size} emails`);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete emails');
    }
  }, [selectedEmails]);

  /**
   * Handle mark as read (for future use)
   */
  useCallback(async (emailId: string) => {
    try {
      await handleMarkEmailAsRead(emailId, true);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  /**
   * Handle toggle select email
   */
  const handleToggleSelect = (emailId: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  /**
   * Get current emails to display
   */
  const visibleEmails = getCurrentEmails(
    emailManager.getVisibleEmails(),
    emailManager.state.activeTab,
    searchQuery,
    'split'
  );

  const paginationInfo = calculatePagination(visibleEmails.length, pageIndex);
  const displayedEmails = getPaginatedEmails(visibleEmails, pageIndex);

  /**
   * Render main content
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2" />
            <p>Loading emails...</p>
          </div>
        </div>
      );
    }

    if (shouldShowEmptyState(displayedEmails, loading)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{getEmptyStateMessage(emailManager.state.activeTab)}</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={emailListRef} className="space-y-1 p-2">
        {displayedEmails.map(email => (
          <EmailListItem
            key={email.id}
            email={email}
            onClick={() => selectEmail(email.id)}
            isDraggable={true}
            renderAsTableRow={false}
            onEmailUpdate={() => {}}
            onEmailDelete={() => handleDelete(email.id)}
            onCreateFilter={() => {}}
            isSelected={selectedEmails.has(email.id)}
            onToggleSelect={() => handleToggleSelect(email.id)}
          />
        ))}

        {/* Pagination controls */}
        {paginationInfo.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4 pb-4">
            <button
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={!paginationInfo.hasPreviousPage}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pageIndex + 1} of {paginationInfo.totalPages}
            </span>
            <button
              onClick={() => setPageIndex(Math.min(paginationInfo.totalPages - 1, pageIndex + 1))}
              disabled={!paginationInfo.hasNextPage}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <ThreeColumnLayout>
      <div className="flex flex-col h-full bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {selectedEmails.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 hover:bg-red-100 text-red-600 rounded"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto bg-gray-50">
          {['all', 'unread', 'sent', 'drafts', 'trash'].map(tab => (
            <button
              key={tab}
              onClick={() => emailManager.switchTab(tab as any)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                emailManager.state.activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border hover:bg-gray-100'
              }`}
            >
              {getTabDisplayName(tab as any)}
              {tab === 'unread' && (
                <span className="ml-1 text-xs bg-red-500 px-2 rounded-full">
                  {getTabBadgeCount(visibleEmails, tab as any)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
    </ThreeColumnLayout>
  );
}

export default EmailPageLayout;
