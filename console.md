🔍 Admin check - email: david.v@dnddesigncenter.com
AuthContext.tsx:429 🔍 Admin check - Final result: true
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
emailService.ts:344 Clearing email cache for profile switch to: f6ca1590-eb6f-4fa6-9da3-304753293c25
emailService.ts:325 Clearing all email caches (memory + localStorage)
ProfileContext.tsx:191 🔑 Clearing GAPI client token for profile switch
gapiService.ts:662 🔑 Clearing current access token from gapiService
ProfileContext.tsx:195 🔄 Dispatching clear-all-caches event for profile switch
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
    at Sidebar (http://localhost:5173/src/components/layout/Sidebar.tsx:29:18)
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1762363610800:89:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1762363610800:126:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx:103:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx:30:32)
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: null, isRefreshing: false}
FoldersColumn.tsx:341 Inbox unread count: 0 override: null systemCounts: {}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
EmailPageLayout.tsx:1269 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: false, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: 1762363678350, isRefreshing: false}
FoldersColumn.tsx:341 Inbox unread count: 0 override: 0 systemCounts: {}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
gapiService.ts:327 GAPI client and GIS clients initialized successfully
gapiService.ts:687 Access token set manually
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1269 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1273 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:656 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:336 🚀 STEP 1: Loading complete inbox data (single reliable fetch)...
optimizedInitialLoad.ts:342 📧 Fetching 30 inbox emails with complete metadata...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[INBOX], maxResults=30
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[INBOX]...
emailService.ts:443 No valid cache found, fetching fresh email list with query: in:inbox
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1762363679164-bkmw6dvxz
gapiCallWrapper.ts:20 📧 Making drafts.list...
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
LabelContext.tsx:514 🏷️ Labels cache key: f6ca1590-eb6f-4fa6-9da3-304753293c25-david.v@dnddesigncenter.com
LabelContext.tsx:545 🔄 Fetching fresh Gmail labels for profile: David email: david.v@dnddesigncenter.com
labels.ts:29 Fetching Gmail labels...
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 0, inboxUnreadOverLimit: false, draftTotal: 0, lastUpdated: 1762363678350, isRefreshing: true}
FoldersColumn.tsx:341 Inbox unread count: 0 override: 0 systemCounts: {}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
emailService.ts:443 No valid cache found, fetching fresh email list with query: label:INBOX is:unread after:1762277279
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-is:unread-after:1762277279-1762363679188-sq4ylpnnc
gapiService.ts:440 🔄 Starting automatic token refresh scheduler (every 25 minutes)
ProfileContext.tsx:248 ✅ Token refresh scheduler started for profile: David
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: '', responseBodyPlainText: '', responseBodyHtml: '', restrictToContacts: false, …}
optimizedInitialLoad.ts:136 📦 Fetching metadata for 30 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 30 messages...
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 4, inboxUnreadOverLimit: false, draftTotal: 14, lastUpdated: 1762363679388, isRefreshing: false}
FoldersColumn.tsx:341 Inbox unread count: 0 override: 0 systemCounts: {}
labels.ts:40  Raw Gmail API response from list: {labels: Array(650)}
labels.ts:41 Found 650 labels, now fetching details with counters...
labels.ts:48  Fetching detailed info for 7 key system labels only
gapiCallWrapper.ts:20 📧 Making draft.get for r2638928662890583336...
labels.ts:69  Fetched details for SENT
gapiCallWrapper.ts:20 📧 Making draft.get for s:17548778603744309463...
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-2 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-6 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-9 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-16 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-21 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-22 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-28 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:184 ⚠️ Message fetch failed in batch: msg-0-29 429
(anonymous) @ optimizedInitialLoad.ts:184
fetchMessageMetadataBatch @ optimizedInitialLoad.ts:179
await in fetchMessageMetadataBatch
(anonymous) @ optimizedInitialLoad.ts:115
await in (anonymous)
dedupeRequest @ optimizedInitialLoad.ts:63
fetchMessagesByLabelIds @ optimizedInitialLoad.ts:87
loadCriticalInboxData @ optimizedInitialLoad.ts:344
fetchAllEmailTypes @ EmailPageLayout.tsx:665
(anonymous) @ EmailPageLayout.tsx:1274
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
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
optimizedInitialLoad.ts:263 ✅ Batch 1/1 completed in 438ms - 22 emails processed so far
optimizedInitialLoad.ts:272 🎉 BATCH API: Fetched 22 messages in 438ms (20ms per message)
optimizedInitialLoad.ts:273 📊 Performance: ~21x faster than individual calls
optimizedInitialLoad.ts:352 ✅ Loaded 22 inbox emails with complete data
optimizedInitialLoad.ts:358 📊 Inbox loaded: 22 total, 3 unread
EmailPageLayout.tsx:704 ⚡ INSTANT: Showing 22 emails immediately (labels loading in background)
optimizedInitialLoad.ts:293 📋 Fetching labels (optimized)
gapiCallWrapper.ts:20 📧 Making labels.list...
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 3, inboxUnreadOverLimit: false, draftTotal: 14, lastUpdated: 1762363679816, isRefreshing: false}
FoldersColumn.tsx:341 Inbox unread count: 0 override: 0 systemCounts: {}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:16834140988497064639...
optimizedInitialLoad.ts:324 📋 Cached 650 labels
EmailPageLayout.tsx:736 📧 Background: Labels loaded (650 labels)
optimizedInitialLoad.ts:403 Processing 3 unread primary emails for auto-reply (using cached data)
optimizedInitialLoad.ts:423 🔄 STEP 2: Prefetching drafts only (for counter)...
EmailPageLayout.tsx:786 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:5603190161741442441...
ProfileContext.tsx:256 🔄 Force refreshing all data after profile switch
LabelContext.tsx:695 🔄 LabelContext: Force refresh data event received
LabelContext.tsx:700 🛑 Skipping force refresh - recently loaded or already loading
labels.ts:69  Fetched details for INBOX
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-is:unread-after:1762277279-1762363679188-sq4ylpnnc
emailService.ts:517 📧 getUnreadEmails using 24h filter: label:INBOX is:unread after:1762277279
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:3192012922783337164...
gapiCallWrapper.ts:20 📧 Making draft.get for s:395629892137848701...
gapiCallWrapper.ts:20 📧 Making draft.get for s:9347250251198189246...
gapiCallWrapper.ts:20 📧 Making draft.get for s:3424296762724875495...
labels.ts:69  Fetched details for IMPORTANT
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1762363679164-bkmw6dvxz
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:429 📧 Fetching draft emails...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[DRAFT]...
gapiCallWrapper.ts:20 📧 Making draft.get for s:16165176847470514473...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 14 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 14 messages...
gapiCallWrapper.ts:20 📧 Making draft.get for s:13217951430499546280...
optimizedInitialLoad.ts:263 ✅ Batch 1/1 completed in 183ms - 14 emails processed so far
optimizedInitialLoad.ts:272 🎉 BATCH API: Fetched 14 messages in 183ms (13ms per message)
optimizedInitialLoad.ts:273 📊 Performance: ~23x faster than individual calls
optimizedInitialLoad.ts:437 ✅ Drafts loaded: 14 drafts
EmailPageLayout.tsx:753 📧 Drafts loaded in background: 14 drafts
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:1832171522541605489...
labels.ts:69  Fetched details for TRASH
gapiCallWrapper.ts:20 📧 Making draft.get for s:98511781609512971...
gapiCallWrapper.ts:20 📧 Making draft.get for s:10590771912894006450...
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1841716258751458057...
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for DRAFT
labels.ts:69  Fetched details for SPAM
EmailPageLayout.tsx:990 📧 Fetched batch for all/unread: {total: 30, read: 26, unread: 4}
EmailPageLayout.tsx:2016 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: false, authLoading: false, isGmailInitializing: false, …}
FoldersColumn.tsx:276 useMemo systemFolders - systemCounts: {} recentCounts: {inboxUnreadToday: 4, inboxUnreadOverLimit: false, draftTotal: 14, lastUpdated: 1762363683085, isRefreshing: false}