import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Search,
  Trash2,
  MailOpen,
  Mail,
} from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { Email } from '@/types';
import { Table, TableBody } from '@/components/ui/table';
import { useCompose } from '@/contexts/ComposeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInboxLayout } from '@/contexts/InboxLayoutContext';
import { useFoldersColumn } from '@/contexts/FoldersColumnContext';

import ThreeColumnLayout from '../layout/ThreeColumnLayout';
import EmailListItem from './EmailListItem';

import {
  createInitialState,
  TAB_KEYS,
  type EmailPageLayoutState,
  type TabKey,
} from './EmailPageLayout';
import {
  fetchAllEmailTypes,
  fetchLabelEmails,
  handleDeleteEmail,
  handleDeleteSelectedEmails,
  handleMarkEmailAsRead,
  handleMarkSelectedAsRead,
  handleMarkSelectedAsUnread,
} from './EmailPageLayout';
import {
  getCurrentEmails,
  getTabDisplayName,
  getTabBadgeCount,
  shouldShowEmptyState,
  getEmptyStateMessage,
  getSelectionDisplayText,
} from './EmailPageLayout';
import { emailRepository } from '@/services/emailRepository';

const FOLDER_TO_TAB: Record<string, TabKey> = {
  inbox: 'all',
  sent: 'sent',
  drafts: 'drafts',
  trash: 'trash',
  spam: 'spam',
  starred: 'starred',
  important: 'important',
};

const NON_INBOX_ROUTE_TO_TAB: Record<string, TabKey> = {
  unread: 'unread',
  sent: 'sent',
  drafts: 'drafts',
  trash: 'trash',
};

const computeCountsFromRepository = (): Record<TabKey, number> => ({
  all: emailRepository.getInboxEmails().length,
  unread: emailRepository.getUnreadEmails().length,
  sent: emailRepository.getSentEmails().length,
  drafts: emailRepository.getDraftEmails().length,
  trash: emailRepository.getTrashEmails().length,
  important: emailRepository.getImportantEmails().length,
  starred: emailRepository.getStarredEmails().length,
  spam: emailRepository.getSpamEmails().length,
  allmail: emailRepository.getAllMailEmails().length,
});

const getEmailsForTab = (tab: TabKey): Email[] => {
  switch (tab) {
    case 'all':
      return emailRepository.getInboxEmails();
    case 'unread':
      return emailRepository.getUnreadEmails();
    case 'sent':
      return emailRepository.getSentEmails();
    case 'drafts':
      return emailRepository.getDraftEmails();
    case 'trash':
      return emailRepository.getTrashEmails();
    case 'important':
      return emailRepository.getImportantEmails();
    case 'starred':
      return emailRepository.getStarredEmails();
    case 'spam':
      return emailRepository.getSpamEmails();
    case 'allmail':
      return emailRepository.getAllMailEmails();
    default:
      return [];
  }
};

type EmailPageType = 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';

interface EmailPageLayoutProps {
  pageType: EmailPageType;
  title: string;
}

function EmailPageLayout({ pageType, title }: EmailPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGmailSignedIn, loading: authLoading, isGmailInitializing } = useAuth();
  const { selectEmail, clearSelection: clearInboxSelection } = useInboxLayout();
  const { setSystemFolderFilterHandler } = useFoldersColumn();
  const { openCompose } = useCompose();

  const [viewState, setViewState] = useState<EmailPageLayoutState>(() => createInitialState());
  const [repositoryVersion, setRepositoryVersion] = useState(0);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const urlParams = new URLSearchParams(location.search);
  const labelName = urlParams.get('labelName');
  const labelQueryParam = urlParams.get('labelQuery');
  const labelIdParam = urlParams.get('labelId');
  const effectiveLabelQuery = labelQueryParam || labelName || undefined;
  const isLabelView = Boolean(labelName);

  const setState = useCallback((updater: (prev: EmailPageLayoutState) => EmailPageLayoutState) => {
    setViewState(prev => updater(prev));
  }, []);

  const bumpRepositoryVersion = useCallback(() => {
    setRepositoryVersion(prev => prev + 1);
  }, []);

  const refreshFromRepository = useCallback(() => {
    setState(prev => ({
      ...prev,
      emailCounts: computeCountsFromRepository(),
    }));
    bumpRepositoryVersion();
  }, [bumpRepositoryVersion, setState]);

  const refreshData = useCallback(async (force = false) => {
    if (!isGmailSignedIn || authLoading || isGmailInitializing) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      if (isLabelView && labelIdParam) {
        const result = await fetchLabelEmails(labelIdParam, undefined, force);
        setState(prev => ({
          ...prev,
          labelEmails: result.emails,
          labelPageToken: result.nextPageToken,
          labelHasMoreEmails: Boolean(result.nextPageToken),
          hasEverLoaded: true,
          loading: false,
        }));
        refreshFromRepository();
      } else {
        await fetchAllEmailTypes(force);
        setState(prev => ({
          ...prev,
          emailCounts: computeCountsFromRepository(),
          hasEverLoaded: true,
          loading: false,
        }));
        bumpRepositoryVersion();
      }
    } catch (error) {
      console.error('Failed to refresh inbox', error);
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [authLoading, bumpRepositoryVersion, isGmailInitializing, isGmailSignedIn, isLabelView, labelIdParam, refreshFromRepository, setState]);

  useEffect(() => {
    if (!isGmailSignedIn || authLoading || isGmailInitializing) {
      return;
    }

    refreshData(false).catch(() => {
      toast.error('Unable to load emails. Please try again.');
    });
  }, [authLoading, isGmailInitializing, isGmailSignedIn, refreshData]);

  useEffect(() => {
    if (pageType !== 'inbox') {
      const mappedTab = NON_INBOX_ROUTE_TO_TAB[pageType];
      if (mappedTab && mappedTab !== viewState.activeTab) {
        setState(prev => ({
          ...prev,
          activeTab: mappedTab,
          selectedEmails: new Set(),
        }));
      }
    }
  }, [pageType, setState, viewState.activeTab]);

  useEffect(() => {
    const handler = (folderType: string) => {
      const tab = FOLDER_TO_TAB[folderType] || 'all';
      setState(prev => ({
        ...prev,
        activeTab: tab,
        selectedEmails: new Set(),
      }));
    };

    setSystemFolderFilterHandler(handler);
  }, [setSystemFolderFilterHandler, setState]);

  const visibleEmails = useMemo(() => {
    const base = isLabelView ? viewState.labelEmails : getEmailsForTab(viewState.activeTab);
    return getCurrentEmails(base, viewState.activeTab, viewState.searchQuery, viewState.inboxViewMode);
  }, [isLabelView, repositoryVersion, viewState.activeTab, viewState.inboxViewMode, viewState.labelEmails, viewState.searchQuery]);

  const selectionText = getSelectionDisplayText(viewState.selectedEmails.size, visibleEmails.length);
  const showEmptyState = shouldShowEmptyState(visibleEmails, viewState.loading);

  const handleManualRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    try {
      await refreshData(true);
      toast.success('Inbox refreshed');
    } catch {
      toast.error('Failed to refresh inbox');
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [refreshData, setState]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState(prev => ({ ...prev, searchQuery: value }));
  };

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedEmails: new Set() }));
    clearInboxSelection();
  }, [clearInboxSelection, setState]);

  const toggleSelectEmail = useCallback((emailId: string) => {
    setState(prev => {
      const next = new Set(prev.selectedEmails);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return { ...prev, selectedEmails: next };
    });
  }, [setState]);

  const handleSelectAll = () => {
    setState(prev => ({
      ...prev,
      selectedEmails: new Set(visibleEmails.map(email => email.id)),
    }));
  };

  const handleDeleteSelected = async () => {
    if (viewState.selectedEmails.size === 0) return;
    try {
      await handleDeleteSelectedEmails(viewState.selectedEmails);
      clearSelection();
      refreshFromRepository();
      toast.success('Deleted selected emails');
    } catch (error) {
      console.error('Failed to delete selected emails', error);
      toast.error('Failed to delete selected emails');
    }
  };

  const handleMarkSelectedAsReadAction = async () => {
    if (viewState.selectedEmails.size === 0) return;
    try {
      await handleMarkSelectedAsRead(viewState.selectedEmails);
      clearSelection();
      refreshFromRepository();
      toast.success('Marked selected emails as read');
    } catch (error) {
      console.error('Failed to mark as read', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkSelectedAsUnreadAction = async () => {
    if (viewState.selectedEmails.size === 0) return;
    try {
      await handleMarkSelectedAsUnread(viewState.selectedEmails);
      clearSelection();
      refreshFromRepository();
      toast.success('Marked selected emails as unread');
    } catch (error) {
      console.error('Failed to mark as unread', error);
      toast.error('Failed to mark as unread');
    }
  };

  const handleEmailOpen = useCallback((id: string) => {
    if (pageType === 'drafts' || viewState.activeTab === 'drafts') {
      openCompose(id);
      return;
    }

    if (labelName) {
      const params = new URLSearchParams();
      if (labelName) params.set('labelName', labelName);
      if (labelQueryParam) params.set('labelQuery', labelQueryParam);
      if (labelIdParam) params.set('labelId', labelIdParam);
      navigate(`/inbox/email/${id}?${params.toString()}`);
    } else {
      navigate(`/${pageType}/email/${id}`);
    }
    selectEmail(id);
  }, [labelIdParam, labelName, labelQueryParam, navigate, openCompose, pageType, selectEmail, viewState.activeTab]);

  const handleEmailDeleteLocal = useCallback(async (emailId: string) => {
    try {
      await handleDeleteEmail(emailId);
      if (isLabelView) {
        setState(prev => ({
          ...prev,
          labelEmails: prev.labelEmails.filter(email => email.id !== emailId),
        }));
      }
      refreshFromRepository();
      setState(prev => ({
        ...prev,
        selectedEmails: new Set([...prev.selectedEmails].filter(id => id !== emailId)),
      }));
      toast.success('Email deleted');
    } catch (error) {
      console.error('Failed to delete email', error);
      toast.error('Failed to delete email');
    }
  }, [isLabelView, refreshFromRepository, setState]);

  const handleEmailUpdate = useCallback((updatedEmail: Email) => {
    emailRepository.addEmails([updatedEmail]);
    if (isLabelView) {
      setState(prev => ({
        ...prev,
        labelEmails: prev.labelEmails.map(email => email.id === updatedEmail.id ? updatedEmail : email),
      }));
    }
    refreshFromRepository();
  }, [isLabelView, refreshFromRepository, setState]);

  const handleLoadMoreLabel = async () => {
    if (!isLabelView || !labelIdParam || !viewState.labelHasMoreEmails || viewState.loadingMore) {
      return;
    }

    setState(prev => ({ ...prev, loadingMore: true }));
    try {
      const result = await fetchLabelEmails(labelIdParam, viewState.labelPageToken, true);
      setState(prev => ({
        ...prev,
        labelEmails: [...prev.labelEmails, ...result.emails],
        labelPageToken: result.nextPageToken,
        labelHasMoreEmails: Boolean(result.nextPageToken),
        loadingMore: false,
      }));
      refreshFromRepository();
    } catch (error) {
      console.error('Failed to load more label emails', error);
      setState(prev => ({ ...prev, loadingMore: false }));
      toast.error('Failed to load more emails');
    }
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const email = visibleEmails.find(item => item.id === event.active.id);
    setActiveEmail(email ?? null);
  }, [visibleEmails]);

  const handleDragEnd = useCallback((_: DragEndEvent) => {
    setActiveEmail(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveEmail(null);
  }, []);

  return (
    <ThreeColumnLayout onEmailUpdate={handleEmailUpdate} onEmailDelete={handleEmailDeleteLocal}>
      <div className="flex h-full flex-col">
        <header className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {selectionText && (
                <p className="text-sm text-gray-500">{selectionText}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Refresh"
                disabled={viewState.refreshing || viewState.loading}
              >
                <RefreshCw className={`h-4 w-4 ${viewState.refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={viewState.searchQuery}
                onChange={handleSearchChange}
                placeholder="Search mail"
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={viewState.selectedEmails.size === 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleMarkSelectedAsReadAction}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={viewState.selectedEmails.size === 0}
              >
                <MailOpen className="h-4 w-4" />
                Mark read
              </button>
              <button
                type="button"
                onClick={handleMarkSelectedAsUnreadAction}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={viewState.selectedEmails.size === 0}
              >
                <Mail className="h-4 w-4" />
                Mark unread
              </button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {TAB_KEYS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setState(prev => ({ ...prev, activeTab: tab, selectedEmails: new Set() }))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  viewState.activeTab === tab
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getTabDisplayName(tab)}
                <span className="ml-2 text-xs text-gray-500">
                  {getTabBadgeCount(getEmailsForTab(tab), tab)}
                </span>
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-hidden">
          {viewState.loading && !viewState.hasEverLoaded ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Loading inbox...
            </div>
          ) : showEmptyState ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              {getEmptyStateMessage(viewState.activeTab)}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis]}
            >
              <div className="h-full overflow-y-auto" data-testid="email-list">
                <Table>
                  <TableBody>
                    {visibleEmails.map(email => (
                      <EmailListItem
                        key={email.id}
                        email={email}
                        onClick={handleEmailOpen}
                        onEmailUpdate={handleEmailUpdate}
                        onEmailDelete={handleEmailDeleteLocal}
                        currentTab={viewState.activeTab}
                        isSelected={viewState.selectedEmails.has(email.id)}
                        onToggleSelect={toggleSelectEmail}
                      />
                    ))}
                  </TableBody>
                </Table>
                {isLabelView && viewState.labelHasMoreEmails && (
                  <div className="flex justify-center py-4">
                    <button
                      type="button"
                      onClick={handleLoadMoreLabel}
                      className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      disabled={viewState.loadingMore}
                    >
                      {viewState.loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
              {createPortal(
                <DragOverlay>
                  {activeEmail ? (
                    <EmailListItem
                      email={activeEmail}
                      onClick={handleEmailOpen}
                      onEmailUpdate={handleEmailUpdate}
                      onEmailDelete={handleEmailDeleteLocal}
                      currentTab={viewState.activeTab}
                      isSelected={viewState.selectedEmails.has(activeEmail.id)}
                      onToggleSelect={toggleSelectEmail}
                      renderAsTableRow={false}
                    />
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          )}
        </div>
      </div>
    </ThreeColumnLayout>
  );
}

export default EmailPageLayout;
