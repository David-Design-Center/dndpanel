EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:813 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, trigger: 'tab/label/auth change'}
EmailPageLayout.tsx:834 📋 Loading first page of emails...
EmailPageLayout.tsx:466 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:435 📦 Using cached email list for query: in:inbox -has:userlabels (30 emails)
EmailPageLayout.tsx:1411 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1415 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:845 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:531 🚀 STEP 1: Loading complete inbox data (single reliable fetch)...
optimizedInitialLoad.ts:538 📧 Fetching 30 inbox threads with complete metadata...
optimizedInitialLoad.ts:92 📧 Optimized fetch with pagination: query="in:inbox -has:userlabels", target=30, filter=false
gapiCallWrapper.ts:20 📧 Making threads.list with query="in:inbox -has:userlabels"...
emailService.ts:427 Fetching fresh email list (forced refresh) with query: in:inbox -has:userlabels
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox--has:userlabels-1763154041752-ehhdjeact
EmailPageLayout.tsx:732 ✅ Fetched 30 emails using query in 5ms
EmailPageLayout.tsx:762 📄 Pagination state: {emailsCount: 30, nextPageToken: '14736881259192071713', isInboxQuery: true, hasActualMore: true, forceMore: true, …}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:813 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, trigger: 'tab/label/auth change'}
EmailPageLayout.tsx:834 📋 Loading first page of emails...
EmailPageLayout.tsx:466 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:435 📦 Using cached email list for query: in:inbox -has:userlabels (30 emails)
EmailPageLayout.tsx:1411 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:1415 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:845 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:531 🚀 STEP 1: Loading complete inbox data (single reliable fetch)...
optimizedInitialLoad.ts:538 📧 Fetching 30 inbox threads with complete metadata...
optimizedInitialLoad.ts:59 🔄 Using in-flight request for key: threads-by-query:query:"in:inbox -has:userlabels"|targetCount:30
emailService.ts:427 Fetching fresh email list (forced refresh) with query: in:inbox -has:userlabels
emailService.ts:448 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox--has:userlabels-1763154041783-qb8dtvo96
EmailPageLayout.tsx:732 ✅ Fetched 30 emails using query in 1ms
EmailPageLayout.tsx:762 📄 Pagination state: {emailsCount: 30, nextPageToken: '14736881259192071713', isInboxQuery: true, hasActualMore: true, forceMore: true, …}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:367 📦 Fetching 50 threads with metadata...
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox--has:userlabels-1763154041752-ehhdjeact
EmailPageLayout.tsx:1132 📧 Fetched batch for all/unread: {total: 30, read: 28, unread: 2}
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox--has:userlabels-1763154041783-qb8dtvo96
EmailPageLayout.tsx:1132 📧 Fetched batch for all/unread: {total: 30, read: 28, unread: 2}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:468 ✅ Fetched 50 threads in 4648ms
optimizedInitialLoad.ts:124 📊 API call 1: Collected 50 threads, total: 50/30
optimizedInitialLoad.ts:134 ✅ Pagination complete: 50 threads in 1 API calls
optimizedInitialLoad.ts:549 ✅ Loaded 50 inbox emails with complete data
optimizedInitialLoad.ts:555 📊 Inbox loaded: 50 total, 2 unread
optimizedInitialLoad.ts:549 ✅ Loaded 50 inbox emails with complete data
optimizedInitialLoad.ts:555 📊 Inbox loaded: 50 total, 2 unread
EmailPageLayout.tsx:893 ⚡ INSTANT: Showing 50 emails immediately (labels loading in background)
optimizedInitialLoad.ts:481 📋 Using cached labels
EmailPageLayout.tsx:893 ⚡ INSTANT: Showing 50 emails immediately (labels loading in background)
optimizedInitialLoad.ts:481 📋 Using cached labels
EmailPageLayout.tsx:925 📧 Background: Labels loaded (653 labels)
optimizedInitialLoad.ts:600 Processing 2 unread primary emails for auto-reply (using cached data)
optimizedInitialLoad.ts:620 🔄 STEP 2: Prefetching drafts only (for counter)...
EmailPageLayout.tsx:975 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:925 📧 Background: Labels loaded (653 labels)
optimizedInitialLoad.ts:600 Processing 2 unread primary emails for auto-reply (using cached data)
optimizedInitialLoad.ts:620 🔄 STEP 2: Prefetching drafts only (for counter)...
EmailPageLayout.tsx:975 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:626 📧 Fetching draft emails...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:176 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[DRAFT]...
optimizedInitialLoad.ts:626 📧 Fetching draft emails...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:59 🔄 Using in-flight request for key: messages-by-labels:labelIds:["DRAFT"]|maxResults:15
optimizedInitialLoad.ts:214 📦 Fetching metadata for 15 messages using BATCH API...
optimizedInitialLoad.ts:223 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:228 📤 Batch 1/1: Fetching 15 messages...
optimizedInitialLoad.ts:341 ✅ Batch 1/1 completed in 118ms - 15 emails processed so far
optimizedInitialLoad.ts:350 🎉 BATCH API: Fetched 15 messages in 118ms (8ms per message)
optimizedInitialLoad.ts:351 📊 Performance: ~38x faster than individual calls
optimizedInitialLoad.ts:634 ✅ Drafts loaded: 15 drafts
optimizedInitialLoad.ts:634 ✅ Drafts loaded: 15 drafts
EmailPageLayout.tsx:942 📧 Drafts loaded in background: 15 drafts
EmailPageLayout.tsx:942 📧 Drafts loaded in background: 15 drafts
EmailPageLayout.tsx:2223 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
