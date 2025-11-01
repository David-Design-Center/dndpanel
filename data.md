Form submitted
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
ProfileContext.tsx:207 📧 Set current user email: david.v@dnddesigncenter.com
AuthContext.tsx:143 Checking Gmail tokens for profile: David
AuthContext.tsx:144 Profile userEmail: david.v@dnddesigncenter.com
AuthContext.tsx:145 Profile object: {id: 'f6ca1590-eb6f-4fa6-9da3-304753293c25', name: 'David', passcode: 'admin123', avatar: null, created_at: '2025-05-29T19:03:36.699351+00:00', …}
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
    at Sidebar (http://localhost:5173/src/components/layout/Sidebar.tsx?t=1762010777441:29:18)
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx?t=1762010777441:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx?t=1762010777441:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx?t=1762010777441:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx?t=1762010777441:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1762024299434:89:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1762024299434:126:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx?t=1762010777441:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx?t=1762010777441:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx?t=1762010777441:103:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx?t=1762010777441:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx?t=1762010777441:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx?t=1762010777441:30:32)
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
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
EmailPageLayout.tsx:1064 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: false, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
gapiService.ts:256 GAPI client and GIS clients initialized successfully
gapiService.ts:616 Access token set manually
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1064 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1068 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:459 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:336 🚀 STEP 1: Loading complete inbox data (single reliable fetch)...
optimizedInitialLoad.ts:342 📧 Fetching 30 inbox emails with complete metadata...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[INBOX], maxResults=30
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[INBOX]...
emailService.ts:443 No valid cache found, fetching fresh email list with query: in:inbox
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1762025042871-rr9m3o2bh
gapiCallWrapper.ts:20 📧 Making drafts.list...
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
labels.ts:29 Fetching Gmail labels...
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
emailService.ts:443 No valid cache found, fetching fresh email list with query: label:INBOX is:unread after:1761938642
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-is:unread-after:1761938642-1762025042897-4vpqf97ff
gapiService.ts:369 🔄 Starting automatic token refresh scheduler (every 25 minutes)
ProfileContext.tsx:248 ✅ Token refresh scheduler started for profile: David
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: '', responseBodyPlainText: '', responseBodyHtml: '', restrictToContacts: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:7998027205928234892...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 30 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 30 messages...
labels.ts:40  Raw Gmail API response from list: {labels: Array(647)}
labels.ts:41 Found 647 labels, now fetching details with counters...
labels.ts:48  Fetching detailed info for 7 key system labels only
gapiCallWrapper.ts:20 📧 Making draft.get for s:16834140988497064639...
labels.ts:69  Fetched details for SENT
gapiCallWrapper.ts:20 📧 Making draft.get for s:5603190161741442441...
optimizedInitialLoad.ts:263 ✅ Batch 1/1 completed in 492ms - 30 emails processed so far
optimizedInitialLoad.ts:272 🎉 BATCH API: Fetched 30 messages in 492ms (16ms per message)
optimizedInitialLoad.ts:273 📊 Performance: ~18x faster than individual calls
optimizedInitialLoad.ts:352 ✅ Loaded 30 inbox emails with complete data
optimizedInitialLoad.ts:358 📊 Inbox loaded: 30 total, 20 unread
EmailPageLayout.tsx:507 ⚡ INSTANT: Showing 30 emails immediately (labels loading in background)
optimizedInitialLoad.ts:293 📋 Fetching labels (optimized)
gapiCallWrapper.ts:20 📧 Making labels.list...
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:3192012922783337164...
optimizedInitialLoad.ts:324 📋 Cached 647 labels
EmailPageLayout.tsx:539 📧 Background: Labels loaded (647 labels)
optimizedInitialLoad.ts:403 Processing 20 unread primary emails for auto-reply (using cached data)
optimizedInitialLoad.ts:423 🔄 STEP 2: Prefetching drafts only (for counter)...
EmailPageLayout.tsx:589 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:395629892137848701...
labels.ts:69  Fetched details for INBOX
ProfileContext.tsx:256 🔄 Force refreshing all data after profile switch
gapiCallWrapper.ts:20 📧 Making draft.get for s:9347250251198189246...
gapiCallWrapper.ts:20 📧 Making draft.get for s:3424296762724875495...
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1762025042871-rr9m3o2bh
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:16165176847470514473...
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-is:unread-after:1761938642-1762025042897-4vpqf97ff
emailService.ts:517 📧 getUnreadEmails using 24h filter: label:INBOX is:unread after:1761938642
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for IMPORTANT
gapiCallWrapper.ts:20 📧 Making draft.get for s:13217951430499546280...
gapiCallWrapper.ts:20 📧 Making draft.get for s:1832171522541605489...
optimizedInitialLoad.ts:429 📧 Fetching draft emails...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[DRAFT]...
optimizedInitialLoad.ts:136 📦 Fetching metadata for 13 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 13 messages...
gapiCallWrapper.ts:20 📧 Making draft.get for s:98511781609512971...
optimizedInitialLoad.ts:263 ✅ Batch 1/1 completed in 167ms - 13 emails processed so far
optimizedInitialLoad.ts:272 🎉 BATCH API: Fetched 13 messages in 167ms (13ms per message)
optimizedInitialLoad.ts:273 📊 Performance: ~23x faster than individual calls
optimizedInitialLoad.ts:437 ✅ Drafts loaded: 13 drafts
EmailPageLayout.tsx:556 📧 Drafts loaded in background: 13 drafts
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for s:10590771912894006450...
labels.ts:69  Fetched details for TRASH
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1841716258751458057...
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
labels.ts:69  Fetched details for DRAFT
labels.ts:69  Fetched details for SPAM
EmailPageLayout.tsx:793 📧 Fetched batch for all/unread: {total: 30, read: 10, unread: 20}
EmailPageLayout.tsx:1810 📧 Current state: {activeTab: 'all', filteredEmailsLength: 60, loading: false, authLoading: false, isGmailInitializing: false, …}
react-dom.development.js:86 Warning: Encountered two children with the same key, `19a40cda0116b4d3`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at tbody
    at _c5 (http://localhost:5173/src/components/ui/table.tsx:53:12)
    at table
    at div
    at _c (http://localhost:5173/src/components/ui/table.tsx:20:11)
    at div
    at div
    at div
    at div
    at div
    at DndContext2 (http://localhost:5173/node_modules/.vite/deps/chunk-G6WMDUAK.js?v=3f0e3043:2521:5)
    at div
    at div
    at div
    at div
    at PanelWithForwardedRef (http://localhost:5173/node_modules/.vite/deps/react-resizable-panels.js?v=3f0e3043:41:3)
    at forwardRef(Panel)
    at div
    at PanelGroupWithForwardedRef (http://localhost:5173/node_modules/.vite/deps/react-resizable-panels.js?v=3f0e3043:1451:3)
    at forwardRef(PanelGroup)
    at div
    at ThreeColumnLayout (http://localhost:5173/src/components/layout/ThreeColumnLayout.tsx?t=1762012522497:24:30)
    at EmailPageLayout (http://localhost:5173/src/components/email/EmailPageLayout.tsx?t=1762023616072:77:28)
    at Inbox
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4088:5)
    at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4494:26)
    at div
    at main
    at div
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx?t=1762010777441:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx?t=1762010777441:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx?t=1762010777441:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx?t=1762010777441:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1762024299434:89:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1762024299434:126:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx?t=1762010777441:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx?t=1762010777441:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx?t=1762010777441:103:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx?t=1762010777441:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx?t=1762010777441:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx?t=1762010777441:30:32)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:4501:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=3f0e3043:5247:5)