emailService.ts:325 Clearing all email caches (memory + localStorage)
EmailPageLayout.tsx:1163 🔄 Refreshing current tab: all
EmailPageLayout.tsx:459 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:551 🧹 Clearing optimized caches
optimizedInitialLoad.ts:336 🚀 STEP 1: Loading complete inbox data (single reliable fetch)...
optimizedInitialLoad.ts:342 📧 Fetching 30 inbox emails with complete metadata...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['INBOX']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[INBOX], maxResults=30
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[INBOX]...
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: true, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:136 📦 Fetching metadata for 30 messages using BATCH API...
optimizedInitialLoad.ts:145 🔄 Processing 1 batch(es) of up to 100 messages each
optimizedInitialLoad.ts:150 📤 Batch 1/1: Fetching 30 messages...
optimizedInitialLoad.ts:263 ✅ Batch 1/1 completed in 390ms - 30 emails processed so far
optimizedInitialLoad.ts:272 🎉 BATCH API: Fetched 30 messages in 390ms (13ms per message)
optimizedInitialLoad.ts:273 📊 Performance: ~23x faster than individual calls
optimizedInitialLoad.ts:352 ✅ Loaded 30 inbox emails with complete data
optimizedInitialLoad.ts:358 📊 Inbox loaded: 30 total, 0 unread
EmailPageLayout.tsx:507 ⚡ INSTANT: Showing 30 emails immediately (labels loading in background)
optimizedInitialLoad.ts:293 📋 Fetching labels (optimized)
gapiCallWrapper.ts:20 📧 Making labels.list...
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:324 📋 Cached 17 labels
EmailPageLayout.tsx:539 📧 Background: Labels loaded (17 labels)
optimizedInitialLoad.ts:399 No unread emails for auto-reply processing
optimizedInitialLoad.ts:423 🔄 STEP 2: Prefetching drafts only (for counter)...
EmailPageLayout.tsx:589 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedInitialLoad.ts:429 📧 Fetching draft emails...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
gmailLabels.ts:46 ✅ Valid Gmail labelIds: ['DRAFT']
optimizedInitialLoad.ts:99 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gapiCallWrapper.ts:20 📧 Making messages.list with labelIds=[DRAFT]...
optimizedInitialLoad.ts:437 ✅ Drafts loaded: 0 drafts
EmailPageLayout.tsx:556 📧 Drafts loaded in background: 0 drafts
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:163 📋 Switching inbox view mode: split → read
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 30, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:792 📧 Fetched batch for all/unread: {total: 100, read: 100, unread: 0}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 130, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 130, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 130, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 130, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:1809 📧 Current state: {activeTab: 'all', filteredEmailsLength: 130, loading: false, authLoading: false, isGmailInitializing: false, …}
