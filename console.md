react-dom.development.js:29895 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
LabelContext.tsx:453 📊 System counts derived from labels: Object
deprecations.ts:9 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
warnOnce @ deprecations.ts:9
deprecations.ts:9 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
warnOnce @ deprecations.ts:9
AuthContext.tsx:257 Found existing session, user is authenticated
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
modern-animated-sign-in.tsx:404 Form submitted
AuthContext.tsx:422 🔍 Admin check - Profile data: Object
AuthContext.tsx:423 🔍 Admin check - is_admin: true
AuthContext.tsx:424 🔍 Admin check - name: David
AuthContext.tsx:425 🔍 Admin check - email: david.v@dnddesigncenter.com
AuthContext.tsx:429 🔍 Admin check - Final result: true
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
emailService.ts:339 Clearing email cache for profile switch to: c92397ac-c250-4bc0-94c8-4e17d30da31b
emailService.ts:320 Clearing all email caches (memory + localStorage)
ProfileContext.tsx:191 🔑 Clearing GAPI client token for profile switch
gapiService.ts:361 🔑 Clearing current access token from gapiService
ProfileContext.tsx:195 🔄 Dispatching clear-all-caches event for profile switch
LabelContext.tsx:396 🗑️ LabelContext: Clearing labels cache for profile switch
LabelContext.tsx:307 🗑️ Clearing labels cache
AuthContext.tsx:143 Checking Gmail tokens for profile: Marti
AuthContext.tsx:144 Profile userEmail: info@effidigi.com
AuthContext.tsx:145 Profile object: Object
LabelContext.tsx:453 📊 System counts derived from labels: Object
FoldersColumn.tsx:232 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:279 Inbox unread count: 0 systemCounts: Object
EmailPageLayout.tsx:1666 📧 Current state: Object
EmailPageLayout.tsx:958 📧 EmailPageLayout useEffect triggered: Object
EmailPageLayout.tsx:1666 📧 Current state: Object
gapiService.ts:159 GAPI client and GIS clients initialized successfully
AuthContext.tsx:116 � External user needs to re-authenticate via OAuth
AuthContext.tsx:165 ❌ Failed to get fresh Gmail token
AuthContext.tsx:172 No valid Gmail token available for profile
EmailPageLayout.tsx:1666 📧 Current state: Object
EmailPageLayout.tsx:958 📧 EmailPageLayout useEffect triggered: Object
EmailPageLayout.tsx:974 📧 Not signed in and auth complete - setting loading false
EmailPageLayout.tsx:1666 📧 Current state: Object
EmailPageLayout.tsx:1666 📧 Current state: Object
ProfileContext.tsx:239 🔄 Force refreshing all data after profile switch
LabelContext.tsx:409 🔄 LabelContext: Force refresh data event received
AuthContext.tsx:209 🌐 External user detected - using OAuth flow
cb=gapi.loaded_0?le=scs,fedcm_migration_mod:427 Cross-Origin-Opener-Policy policy would block the window.opener call.
(anonymous) @ cb=gapi.loaded_0?le=scs,fedcm_migration_mod:427
cb=gapi.loaded_0?le=scs,fedcm_migration_mod:427 Cross-Origin-Opener-Policy policy would block the window.opener call.
(anonymous) @ cb=gapi.loaded_0?le=scs,fedcm_migration_mod:427
gapiService.ts:311 OAuth Gmail sign-in successful
emailService.ts:438 No valid cache found, fetching fresh email list with query: in:inbox
emailService.ts:443 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1758196559698-bpcam49c9
emailService.ts:438 No valid cache found, fetching fresh email list with query: in:inbox is:unread
emailService.ts:443 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-is:unread-1758196559700-4axbzgugm
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
LabelContext.tsx:156 ⚠️ Simple 24h count failed (keeping previous values) TypeError: window.gapi.client.gmail.users.messages.list(...).catch is not a function
    at LabelContext.tsx:116:159
    at LabelContext.tsx:161:5
    at LabelContext.tsx:168:5
    at commitHookEffectListMount (react-dom.development.js:23189:26)
    at commitPassiveMountOnFiber (react-dom.development.js:24965:13)
    at commitPassiveMountEffects_complete (react-dom.development.js:24930:9)
    at commitPassiveMountEffects_begin (react-dom.development.js:24917:7)
    at commitPassiveMountEffects (react-dom.development.js:24905:3)
    at flushPassiveEffectsImpl (react-dom.development.js:27078:3)
    at flushPassiveEffects (react-dom.development.js:27023:14)
(anonymous) @ LabelContext.tsx:156
LabelContext.tsx:245 🏷️ Labels cache key: c92397ac-c250-4bc0-94c8-4e17d30da31b-info@effidigi.com
LabelContext.tsx:272 🔄 Fetching fresh Gmail labels for profile: Marti email: info@effidigi.com
gapiService.ts:2159 Fetching Gmail labels...
gmailVacationService.ts:119 Gmail vacation settings retrieved: Object
gapiService.ts:2171  Raw Gmail API response from list: Object
gapiService.ts:2172 � Found 20 labels, now fetching details with counters...
gapiService.ts:2180  Fetching detailed info for 7 key system labels only
gapiService.ts:2204  Fetched details for SENT
gapiService.ts:2204  Fetched details for INBOX
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-is:unread-1758196559700-4axbzgugm
gapiService.ts:2204  Fetched details for IMPORTANT
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1758196559698-bpcam49c9
gapiService.ts:2204  Fetched details for TRASH
gapiService.ts:2204  Fetched details for DRAFT
gapiService.ts:2204  Fetched details for SPAM
gapiService.ts:2204  Fetched details for STARRED
gapiService.ts:2216  Raw label details with counters: (20) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
gapiService.ts:2235 Found 6 labels with message counts
gapiService.ts:2239 KEY SYSTEM LABELS: (3) [{…}, {…}, {…}]
gapiService.ts:2245 Successfully fetched 20 Gmail labels
LabelContext.tsx:208 🔄 Labels loaded successfully at: 1758196563628
LabelContext.tsx:279 Labels with counts: (6) [{…}, {…}, {…}, {…}, {…}, {…}]
LabelContext.tsx:453 📊 System counts derived from labels: {INBOX: 12, IMPORTANT: 5, TRASH: 6}
FoldersColumn.tsx:232 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 12, IMPORTANT: 5, TRASH: 6, …} recentCounts: {inboxUnread24h: 0, draftTotal: 0, lastUpdated: null, isRefreshing: false}
FoldersColumn.tsx:279 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 12, IMPORTANT: 5, TRASH: 6, …}
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:958 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, authLoading: false, isGmailInitializing: false}
EmailPageLayout.tsx:963 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:397 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:293 🚀 STEP 1: Loading critical inbox data (unread metadata only)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['CATEGORY_PERSONAL', 'INBOX', 'UNREAD']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX,UNREAD], maxResults=25
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['INBOX', 'CATEGORY_PERSONAL']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['CATEGORY_PERSONAL', 'INBOX']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX], maxResults=25
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:151 📦 Fetching metadata for 2 messages with rate limiting...
optimizedInitialLoad.ts:151 📦 Fetching metadata for 25 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 2/2 message metadata
optimizedInitialLoad.ts:224 ✅ Successfully processed 25/25 message metadata
optimizedInitialLoad.ts:312 📧 Lists loaded: 2 unread IDs, 0 additional recent IDs (cached)
optimizedInitialLoad.ts:151 📦 Fetching metadata for 2 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 2/2 message metadata
optimizedInitialLoad.ts:347 ✅ Critical data loaded: 2 unread with metadata, 0 recent cached, unread count: 2
optimizedInitialLoad.ts:243 📋 Fetching labels (optimized)
optimizedInitialLoad.ts:273 📋 Cached 20 labels
EmailPageLayout.tsx:417 📧 Critical data loaded: 2 unread, 2 recent, unread count: 2, 20 labels
optimizedInitialLoad.ts:380 Processing 2 unread primary emails for auto-reply (using cached data)
emailService.ts:422 Fetching fresh email list (forced refresh) with query: -in:sent -in:trash -in:spam
emailService.ts:443 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails--in:sent--in:trash--in:spam-1758196573149-x0cg3xoa5
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 2, loading: true, authLoading: false, isGmailInitializing: false, …}
react-dom.development.js:86 Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?

Check the render method of `Primitive.button.SlotClone`.
    at Tooltip (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=a0eeb0a3:111:5)
    at http://localhost:5173/node_modules/.vite/deps/chunk-5PWB6DBI.js?v=a0eeb0a3:79:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-5PWB6DBI.js?v=a0eeb0a3:56:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-EROJCWMJ.js?v=a0eeb0a3:43:13
    at http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-dialog.js?v=a0eeb0a3:464:13
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-A7CCAWKL.js?v=a0eeb0a3:38:15)
    at Dialog (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-dialog.js?v=a0eeb0a3:428:5)
    at TutorialsDialog (http://localhost:5173/src/components/common/TutorialsDialog.tsx:24:3)
    at div
    at nav
    at aside
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-A7CCAWKL.js?v=a0eeb0a3:38:15)
    at TooltipProvider (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=a0eeb0a3:67:5)
    at Sidebar (http://localhost:5173/src/components/layout/Sidebar.tsx:29:18)
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx?t=1758196516294:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx?t=1758196516294:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1758196516294:86:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=a0eeb0a3:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=a0eeb0a3:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1758196516294:123:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx?t=1758196516294:27:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx:30:32)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=a0eeb0a3:4501:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=a0eeb0a3:5247:5)
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
validateFunctionComponentInDev @ react-dom.development.js:20222
mountIndeterminateComponent @ react-dom.development.js:20189
beginWork @ react-dom.development.js:21626
beginWork$1 @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopSync @ react-dom.development.js:26505
renderRootSync @ react-dom.development.js:26473
performSyncWorkOnRoot @ react-dom.development.js:26124
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 2, loading: true, authLoading: false, isGmailInitializing: false, …}
requestQueue.ts:73 ✅ Completed queued request: fetch-emails--in:sent--in:trash--in:spam-1758196573149-x0cg3xoa5
optimizedInitialLoad.ts:403 🔄 STEP 2: Prefetching essential folder IDs (metadata on-demand)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[SENT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[IMPORTANT], maxResults=15
EmailPageLayout.tsx:511 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 12, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:151 📦 Fetching metadata for 15 messages with rate limiting...
optimizedInitialLoad.ts:151 📦 Fetching metadata for 15 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:224 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:418 ✅ Essential folder IDs cached: 15 sent, 0 drafts, 15 important
EmailPageLayout.tsx:474 📧 Essential folders loaded: 15 sent, 0 drafts, 15 important
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'unread', filteredEmailsLength: 12, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:397 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:527 🧹 Clearing optimized caches
optimizedInitialLoad.ts:293 🚀 STEP 1: Loading critical inbox data (unread metadata only)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (3) ['CATEGORY_PERSONAL', 'INBOX', 'UNREAD']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX,UNREAD], maxResults=25
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['INBOX', 'CATEGORY_PERSONAL']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: (2) ['CATEGORY_PERSONAL', 'INBOX']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[CATEGORY_PERSONAL,INBOX], maxResults=25
FoldersColumn.tsx:232 useMemo systemFolders - systemCounts: {CHAT: 0, SENT: 0, INBOX: 12, IMPORTANT: 5, TRASH: 6, …} recentCounts: {inboxUnread24h: 0, draftTotal: 0, lastUpdated: null, isRefreshing: false}
FoldersColumn.tsx:279 Inbox unread count: 0 systemCounts: {CHAT: 0, SENT: 0, INBOX: 12, IMPORTANT: 5, TRASH: 6, …}
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: true, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:151 📦 Fetching metadata for 2 messages with rate limiting...
optimizedInitialLoad.ts:151 📦 Fetching metadata for 25 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 2/2 message metadata
optimizedInitialLoad.ts:224 ✅ Successfully processed 25/25 message metadata
optimizedInitialLoad.ts:312 📧 Lists loaded: 2 unread IDs, 0 additional recent IDs (cached)
optimizedInitialLoad.ts:151 📦 Fetching metadata for 2 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 2/2 message metadata
optimizedInitialLoad.ts:347 ✅ Critical data loaded: 2 unread with metadata, 0 recent cached, unread count: 2
optimizedInitialLoad.ts:243 📋 Fetching labels (optimized)
optimizedInitialLoad.ts:273 📋 Cached 20 labels
EmailPageLayout.tsx:417 📧 Critical data loaded: 2 unread, 2 recent, unread count: 2, 20 labels
optimizedInitialLoad.ts:380 Processing 2 unread primary emails for auto-reply (using cached data)
emailService.ts:422 Fetching fresh email list (forced refresh) with query: -in:sent -in:trash -in:spam
emailService.ts:443 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails--in:sent--in:trash--in:spam-1758196581576-sxm5yhhey
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'all', filteredEmailsLength: 2, loading: true, authLoading: false, isGmailInitializing: false, …}
requestQueue.ts:73 ✅ Completed queued request: fetch-emails--in:sent--in:trash--in:spam-1758196581576-sxm5yhhey
optimizedInitialLoad.ts:403 🔄 STEP 2: Prefetching essential folder IDs (metadata on-demand)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['SENT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[SENT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['IMPORTANT']
optimizedInitialLoad.ts:103 📧 Optimized fetch: labelIds=[IMPORTANT], maxResults=15
EmailPageLayout.tsx:511 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1178 📂 Filtered to: inbox (tab: all)
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:151 📦 Fetching metadata for 15 messages with rate limiting...
optimizedInitialLoad.ts:151 📦 Fetching metadata for 15 messages with rate limiting...
optimizedInitialLoad.ts:224 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:224 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:418 ✅ Essential folder IDs cached: 15 sent, 0 drafts, 15 important
EmailPageLayout.tsx:474 📧 Essential folders loaded: 15 sent, 0 drafts, 15 important
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1666 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmbeddedViewEmail.tsx:247 🔍 Starting to fetch email: 1994cf290285b284
EmbeddedViewEmail.tsx:165 🔍 fetchEmailOptimized called for email ID: 1994cf290285b284
optimizedEmailService.ts:189 🔍 Checking if optimized email service is available...
optimizedEmailService.ts:208 ✅ Optimized email service is available and responding!
optimizedEmailService.ts:95 🚀 OptimizedEmailService: Fetching thread 1994cf290285b284 via server-side processing
optimizedEmailService.ts:102 🔑 Got access token: ya29.a0AQQ_BDSoeUWs6...
optimizedEmailService.ts:103 🔑 Token length: 254
optimizedEmailService.ts:104 🔑 Token starts with: ya29.a0AQQ
optimizedEmailService.ts:124 ✅ OptimizedEmailService: Successfully processed 1 emails server-side
EmbeddedViewEmail.tsx:254 ✅ Successfully fetched email: Found
EmbeddedViewEmail.tsx:264 📧 Email details: {id: '1994cf290285b284', subject: 'Automaatvastus Vegan Restoran V', threadId: '1994cf290285b284', hasThreadId: true}
optimizedEmailService.ts:189 🔍 Checking if optimized email service is available...
optimizedEmailService.ts:208 ✅ Optimized email service is available and responding!
optimizedEmailService.ts:95 🚀 OptimizedEmailService: Fetching thread 1994cf290285b284 via server-side processing
optimizedEmailService.ts:102 🔑 Got access token: ya29.a0AQQ_BDSoeUWs6...
optimizedEmailService.ts:103 🔑 Token length: 254
optimizedEmailService.ts:104 🔑 Token starts with: ya29.a0AQQ
optimizedEmailService.ts:124 ✅ OptimizedEmailService: Successfully processed 1 emails server-side
EmbeddedViewEmail.tsx:214 📧 Single email thread, no processing needed
EmbeddedViewEmail.tsx:522 EmbeddedViewEmail DEBUG: {processedThreadMessages: 1, messagesToShow: 1, email: '1994cf290285b284'}
OutlookThreadView.tsx:56 Thread messages: 1 Expanded messages: 1
OutlookThreadView.tsx:73 Rendering message 0: 1994cf290285b284 expanded: true
OutlookMessageCard.tsx:219 Rendering message card: 1994cf290285b284 isExpanded: true snippet: Tere
about:srcdoc:1 Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
