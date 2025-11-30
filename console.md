LabelContext.tsx:780 Deleting Gmail label: Label_16 (vapi) for profile: Marti
LabelContext.tsx:784 ✅ Label removed from UI immediately
EmailPageLayout.tsx:659 🗑️ Label deleted event received: Label_16 vapi
EmailPageLayout.tsx:663 📍 Currently viewing deleted label, navigating to inbox...
labels.ts:331 Attempting to delete Gmail label with ID: Label_16
LabelContext.tsx:935 📊 System counts derived from labels: {TRASH: 14, SPAM: 1, Label_15: 1}
FoldersColumn.tsx:233 📊 Label unread count: kling - systemCount: 1 labelCount: 1 final: 1
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429421494, isRefreshing: false}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
EmailPageLayout.tsx:855 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:369 📋 Loading first page of emails... (tab/label changed)
usePagination.ts:76 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:435 📦 Using cached email list for query: in:inbox (25 emails)
useEmailFetch.ts:676 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:855 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'vapi', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:369 📋 Loading first page of emails... (tab/label changed)
usePagination.ts:76 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
usePagination.ts:140 📧 Using labelId for filtering: {labelIdParam: 'Label_16', fallbackLabel: 'vapi'}
useEmailFetch.ts:676 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: 'vapi', labelQueryParam: 'vapi', labelIdParam: 'Label_16', …}
useEmailFetch.ts:703 📧 Label emails handled by pagination system
usePagination.ts:193 ✅ Fetched 25 emails using in:inbox in 0ms
usePagination.ts:221 📄 Pagination state: {emailsCount: 25, nextPageToken: '12239341213545733933', isInboxQuery: true, hasActualMore: true, forceMore: true, …}
EmailPageLayout.tsx:855 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'vapi', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:356 📋 Skipping reset - no actual change (just re-render)
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429421494, isRefreshing: true}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
EmailPageLayout.tsx:855 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429453555, isRefreshing: false}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
usePagination.ts:193 ✅ Fetched 1 emails using labelId:Label_16 in 0ms
usePagination.ts:221 📄 Pagination state: {emailsCount: 1, nextPageToken: undefined, isInboxQuery: false, hasActualMore: false, forceMore: false, …}
EmailPageLayout.tsx:855 📧 Current state: {activeTab: 'all', filteredEmailsLength: 1, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'vapi', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:356 📋 Skipping reset - no actual change (just re-render)
labels.ts:338 Gmail API delete response: {result: false, body: '', headers: {…}, status: 204, statusText: null}
labels.ts:339 Successfully deleted Gmail label: Label_16
LabelContext.tsx:584 🏷️ Labels cache key: c92397ac-c250-4bc0-94c8-4e17d30da31b-info@effidigi.com forceRefresh: false
LabelContext.tsx:587 📦 Using cached labels for profile: Marti
LabelContext.tsx:797 Successfully deleted label: Label_16 for profile: Marti
LabelContext.tsx:935 📊 System counts derived from labels: {TRASH: 14, SPAM: 1, Label_15: 1}
FoldersColumn.tsx:233 📊 Label unread count: kling - systemCount: 1 labelCount: 1 final: 1
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429453555, isRefreshing: false}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429453555, isRefreshing: true}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
FoldersColumn.tsx:292 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 0, TRASH: 14, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 1, lastUpdated: 1764429454043, isRefreshing: false}
FoldersColumn.tsx:352 📊 Inbox counter breakdown: {systemCount: 0, labelMessagesUnread: 0, finalUnreadCount: 0, matchingLabel: {…}}
