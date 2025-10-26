modern-animated-sign-in.tsx:404 Form submitted
AuthContext.tsx:422 🔍 Admin check - Profile data: {name: 'David', is_admin: true}
AuthContext.tsx:423 🔍 Admin check - is_admin: true
AuthContext.tsx:424 🔍 Admin check - name: David
AuthContext.tsx:425 🔍 Admin check - email: david.v@dnddesigncenter.com
AuthContext.tsx:429 🔍 Admin check - Final result: true
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
emailService.ts:344 Clearing email cache for profile switch to: f6ca1590-eb6f-4fa6-9da3-304753293c25
emailService.ts:325 Clearing all email caches (memory + localStorage)
ProfileContext.tsx:191 🔑 Clearing GAPI client token for profile switch
gapiService.ts:591 🔑 Clearing current access token from gapiService
ProfileContext.tsx:195 🔄 Dispatching clear-all-caches event for profile switch
LoadingProgressToast.tsx:83 🔄 LoadingProgressToast: Profile switch detected, resetting first trigger flag
LabelContext.tsx:682 🗑️ LabelContext: Clearing labels cache for profile switch
LabelContext.tsx:591 🗑️ Clearing labels cache
ProfileContext.tsx:207 📧 Set current user email: david.v@dnddesigncenter.com
AuthContext.tsx:143 Checking Gmail tokens for profile: David
AuthContext.tsx:144 Profile userEmail: david.v@dnddesigncenter.com
AuthContext.tsx:145 Profile object: {id: 'f6ca1590-eb6f-4fa6-9da3-304753293c25', name: 'David', passcode: 'admin123', avatar: null, created_at: '2025-05-29T19:03:36.699351+00:00', …}
LabelContext.tsx:743 📊 System counts derived from labels: {}
react-dom.development.js:86 Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?

Check the render method of `Primitive.button.SlotClone`.
    at TutorialsDialog (http://localhost:5173/src/components/common/TutorialsDialog.tsx:24:3)
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=3f0e3043:79:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=3f0e3043:56:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-OAHNTYLA.js?v=3f0e3043:43:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=3f0e3043:79:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=3f0e3043:56:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-OAHNTYLA.js?v=3f0e3043:43:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-SI2YLRDE.js?v=3f0e3043:1945:13
    at http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=3f0e3043:203:13
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-N2ODAK4M.js?v=3f0e3043:38:15)
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-N2ODAK4M.js?v=3f0e3043:38:15)
    at Popper (http://localhost:5173/node_modules/.vite/deps/chunk-SI2YLRDE.js?v=3f0e3043:1937:11)
    at Tooltip (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=3f0e3043:111:5)
    at div
    at nav
    at aside
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-N2ODAK4M.js?v=3f0e3043:38:15)
    at TooltipProvider (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=3f0e3043:67:5)
    at Sidebar (http://localhost:5173/src/components/layout/Sidebar.tsx?t=1761478883346:29:18)
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx?t=1761480872211:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx?t=1761480872211:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx?t=1761478531969:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx?t=1761478531969:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1761487462713:89:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1761487462713:126:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx?t=1761478531969:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx?t=1761478531969:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx?t=1761478531969:103:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx?t=1761478531969:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx?t=1761478531969:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx?t=1761478531969:30:32)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4501:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:5247:5)
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
validateFunctionComponentInDev @ react-dom.development.js:20222
mountIndeterminateComponent @ react-dom.development.js:20189
beginWork @ react-dom.development.js:21626
beginWork$1 @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopSync @ react-dom.development.js:26505
renderRootSync @ react-dom.development.js:26473
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: null, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
EmailPageLayout.tsx:1081 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: false, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: 1761487483008, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
gapiService.ts:256 GAPI client and GIS clients initialized successfully
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
gapiService.ts:616 Access token set manually
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1081 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1085 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:457 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:340 🚀 STEP 1: Loading critical inbox data (unread metadata only)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['CATEGORY_PERSONAL', 'INBOX', 'UNREAD']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX,UNREAD], maxResults=20
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[CATEGORY_PERSONAL,INBOX,UNREAD]...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['INBOX', 'CATEGORY_PERSONAL']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['CATEGORY_PERSONAL', 'INBOX']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX], maxResults=20
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[CATEGORY_PERSONAL,INBOX]...
emailService.ts:443 No valid cache found, fetching fresh email list with query: in:inbox
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1761487483667-euekga2ev
gapiCallWrapper.ts:20 📧 Making drafts.list...
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
LabelContext.tsx:514 🏷️ Labels cache key: f6ca1590-eb6f-4fa6-9da3-304753293c25-david.v@dnddesigncenter.com
LabelContext.tsx:545 🔄 Fetching fresh Gmail labels for profile: David email: david.v@dnddesigncenter.com
labels.ts:29 Fetching Gmail labels...
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: 1761487483008, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
emailService.ts:443 No valid cache found, fetching fresh email list with query: label:INBOX is:unread after:1761401083
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-is:unread-after:1761401083-1761487483700-2o0s37bbx
gapiService.ts:369 🔄 Starting automatic token refresh scheduler (every 25 minutes)
ProfileContext.tsx:248 ✅ Token refresh scheduler started for profile: David
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: '', responseBodyPlainText: '', responseBodyHtml: '', restrictToContacts: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:11042726944912861421...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 20 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 20 messages...
labels.ts:40  Raw Gmail API response from list: {labels: Array(645)}
labels.ts:41 Found 645 labels, now fetching details with counters...
labels.ts:48  Fetching detailed info for 7 key system labels only
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-is:unread-after:1761401083-1761487483700-2o0s37bbx
emailService.ts:517 📧 getUnreadEmails using 24h filter: label:INBOX is:unread after:1761401083
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487483921, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for SENT
gapiCallWrapper.ts:20 📧 Making draft.get for s:13435125420903210262...
optimizedInitialLoad.ts:258 ✅ Batch 1/1 completed in 280ms - 20 emails processed so far
optimizedInitialLoad.ts:267 🎉 BATCH API: Fetched 20 messages in 280ms (14ms per message)
optimizedInitialLoad.ts:268 📊 Performance: ~21x faster than individual calls
optimizedInitialLoad.ts:361 📧 Lists loaded: 0 unread IDs, 0 additional recent IDs (cached)
optimizedInitialLoad.ts:136 📦 Fetching metadata for 20 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 20 messages...
optimizedInitialLoad.ts:258 ✅ Batch 1/1 completed in 68ms - 20 emails processed so far
optimizedInitialLoad.ts:267 🎉 BATCH API: Fetched 20 messages in 68ms (3ms per message)
optimizedInitialLoad.ts:268 📊 Performance: ~88x faster than individual calls
optimizedInitialLoad.ts:370 ⚡ INSTANT: Loaded 20 recent emails with full metadata
optimizedInitialLoad.ts:384 ✅ Critical data loaded: 0 unread, 20 total recent, unread count: 0
EmailPageLayout.tsx:505 ⚡ INSTANT: Showing 20 emails immediately (labels loading in background)
optimizedInitialLoad.ts:288 📋 Fetching labels (optimized)
gapiCallWrapper.ts:20 📧 Making labels.list...
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:3192012922783337164...
optimizedInitialLoad.ts:319 📋 Cached 645 labels
EmailPageLayout.tsx:536 📧 Background: Labels loaded (645 labels)
optimizedInitialLoad.ts:413 No unread emails for auto-reply processing
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:395629892137848701...
gapiCallWrapper.ts:20 📧 Making draft.get for s:9347250251198189246...
labels.ts:69  Fetched details for INBOX
ProfileContext.tsx:256 🔄 Force refreshing all data after profile switch
LabelContext.tsx:695 🔄 LabelContext: Force refresh data event received
LabelContext.tsx:700 🛑 Skipping force refresh - recently loaded or already loading
gapiCallWrapper.ts:20 📧 Making draft.get for s:3424296762724875495...
gapiCallWrapper.ts:20 📧 Making draft.get for s:16165176847470514473...
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1761487483667-euekga2ev
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:13217951430499546280...
gapiCallWrapper.ts:20 📧 Making draft.get for s:1832171522541605489...
gapiCallWrapper.ts:20 📧 Making draft.get for s:98511781609512971...
labels.ts:69  Fetched details for IMPORTANT
gapiCallWrapper.ts:20 📧 Making draft.get for s:10590771912894006450...
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1841716258751458057...
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for TRASH
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for DRAFT
labels.ts:69  Fetched details for SPAM
labels.ts:69  Fetched details for STARRED
labels.ts:80  Raw label details with counters: (645) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
labels.ts:98 Found 7 labels with message counts
labels.ts:101 KEY SYSTEM LABELS: (3) [{…}, {…}, {…}]
labels.ts:107 Successfully fetched 645 Gmail labels
LabelContext.tsx:326 🔄 Labels loaded successfully at: 1761487487815
LabelContext.tsx:704 ✅ In-flight request completed, force refresh satisfied
LabelContext.tsx:552 Labels with counts: (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
LabelContext.tsx:376 📬 Hydrating unread counts for 630 user labels...
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487483921, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487483921, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487487926, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487487926, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487487926, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488038, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488038, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488038, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488401, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488401, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488401, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488497, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488497, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488497, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488859, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488859, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487488859, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489020, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489020, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489020, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489384, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489384, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489384, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489579, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489579, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489579, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489994, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489994, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487489994, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490247, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490247, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490247, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490588, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490588, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490588, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490956, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490956, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487490956, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491119, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491119, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491119, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491481, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491481, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491481, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491691, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491691, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487491691, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492079, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492079, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492079, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492200, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492200, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492200, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492529, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492529, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492529, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492691, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492691, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487492691, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493054, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493054, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493054, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493219, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493219, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493219, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493578, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493578, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493578, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493743, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493743, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487493743, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494101, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494101, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494101, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494267, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494267, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494267, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494705, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494705, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494705, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494797, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494797, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487494797, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495151, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 20, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:810 📧 Fetched batch for all/unread: {total: 100, read: 100, unread: 0}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495151, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495151, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495340, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495340, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495340, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495674, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495674, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495674, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 120, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:440 🔄 STEP 2: Prefetching essential folder IDs (metadata on-demand)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[SENT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[SENT]...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[DRAFT]...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[IMPORTANT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[IMPORTANT]...
EmailPageLayout.tsx:616 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495841, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:136 📦 Fetching metadata for 15 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 15 messages...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 15 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 15 messages...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 12 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 12 messages...
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-2 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:447
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-3 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:447
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-6 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:447
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-8 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:447
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-11 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:447
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:258 ✅ Batch 1/1 completed in 71ms - 10 emails processed so far
optimizedInitialLoad.ts:267 🎉 BATCH API: Fetched 10 messages in 71ms (7ms per message)
optimizedInitialLoad.ts:268 📊 Performance: ~63x faster than individual calls
optimizedInitialLoad.ts:258 ✅ Batch 1/1 completed in 91ms - 15 emails processed so far
optimizedInitialLoad.ts:267 🎉 BATCH API: Fetched 15 messages in 91ms (6ms per message)
optimizedInitialLoad.ts:268 📊 Performance: ~49x faster than individual calls
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-5 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:446
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-7 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:446
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-8 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:446
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-10 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
prefetchEssentialFolders @ optimizedInitialLoad.ts:446
fetchAllEmailTypes @ EmailPageLayout.tsx:577
await in fetchAllEmailTypes
(anonymous) @ EmailPageLayout.tsx:1086
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
performSyncWorkOnRoot @ react-dom.development.js:26115
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26998
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:26020
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
optimizedInitialLoad.ts:258 ✅ Batch 1/1 completed in 91ms - 8 emails processed so far
optimizedInitialLoad.ts:267 🎉 BATCH API: Fetched 8 messages in 91ms (11ms per message)
optimizedInitialLoad.ts:268 📊 Performance: ~40x faster than individual calls
optimizedInitialLoad.ts:455 ✅ Essential folder IDs cached: 15 sent, 8 drafts, 10 important
EmailPageLayout.tsx:578 📧 Essential folders loaded: 15 sent, 8 drafts, 10 important
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495841, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487495841, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496260, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
LabelContext.tsx:743 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496260, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496260, isRefreshing: true}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
EmailPageLayout.tsx:1803 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496405, isRefreshing: false}
FoldersColumn.tsx:323 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496405, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496405, isRefreshing: true}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496722, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496722, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496722, isRefreshing: true}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496923, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496923, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487496923, isRefreshing: true}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487497246, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
 📊 System counts derived from labels: {IMPORTANT: 843, TRASH: 1995, DRAFT: 8, SPAM: 693, Label_1106: 2, …}
 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …} recentCounts: {inboxUnreadToday: 1, inboxUnreadOverLimit: false, draftTotal: 12, lastUpdated: 1761487497246, isRefreshing: false}
 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 0, IMPORTANT: 843, TRASH: 1995, …}
 📧 Current state: {activeTab: 'all', filteredEmailsLength: 100, loading: false, authLoading: false, isGmailInitializing: false, …}
