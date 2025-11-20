EmailPreloaderContext.tsx:222 ⏸️ EmailPreloader: Not on email page, skipping preload
OutOfOfficeContext.tsx:104 ⏸️ OutOfOfficeContext: Not on email/settings page, skipping status check
GoTrueClient.ts:245 Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.
_GoTrueClient @ GoTrueClient.ts:245
SupabaseAuthClient @ SupabaseAuthClient.ts:6
_initSupabaseAuthClient @ SupabaseClient.ts:329
SupabaseClient @ SupabaseClient.ts:128
createClient @ index.ts:46
(anonymous) @ InvoicePreviewModal.tsx:13
GoTrueClient.ts:245 Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.
_GoTrueClient @ GoTrueClient.ts:245
SupabaseAuthClient @ SupabaseAuthClient.ts:6
_initSupabaseAuthClient @ SupabaseClient.ts:329
SupabaseClient @ SupabaseClient.ts:128
createClient @ index.ts:46
(anonymous) @ InvoiceCards.tsx:13
GoTrueClient.ts:245 Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.
_GoTrueClient @ GoTrueClient.ts:245
SupabaseAuthClient @ SupabaseAuthClient.ts:6
_initSupabaseAuthClient @ SupabaseClient.ts:329
SupabaseClient @ SupabaseClient.ts:128
createClient @ index.ts:46
(anonymous) @ searchUtils.ts:6
EmailPageLayout.tsx:783 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:314 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: true, …}
usePagination.ts:346 📋 Loading first page of emails... (initial load)
usePagination.ts:73 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:429 Fetching fresh email list (inbox - no cache) with query: in:inbox -has:userlabels
emailService.ts:451 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox--has:userlabels-1763637143793-5onhcnlb8
useEmailFetch.ts:674 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
useEmailFetch.ts:698 📧 Initial load delegated to usePagination
useEmailCounts.ts:76 🔍 useEmailCounts effect running - allTabEmails.all.length: 0
useEmailCounts.ts:99 📊 Emitting inbox unread count: 0 unread from 0 inbox emails (total emails: 0 )
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
labels.ts:29 Fetching Gmail labels...
EmailPageLayout.tsx:783 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:783 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
labels.ts:40  Raw Gmail API response from list: {labels: Array(25)}
labels.ts:41 Found 25 labels, now fetching details with counters...
labels.ts:48  Fetching detailed info for 7 key system labels only
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: 'Out of Office', responseBodyPlainText: '', responseBodyHtml: '<div style="font-family:Arial,sans-serif;line-heig…erstanding.</p>\n        <p>Marti</p>\n      </div>', restrictToContacts: false, …}
labels.ts:69  Fetched details for SENT
labels.ts:69  Fetched details for INBOX
labels.ts:69  Fetched details for IMPORTANT
labels.ts:69  Fetched details for TRASH
labels.ts:69  Fetched details for DRAFT
labels.ts:69  Fetched details for SPAM
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox--has:userlabels-1763637143793-5onhcnlb8
usePagination.ts:172 ✅ Fetched 25 emails using query in 0ms
usePagination.ts:200 📄 Pagination state: {emailsCount: 25, nextPageToken: '10704935507263733909', isInboxQuery: true, hasActualMore: true, forceMore: true, …}
EmailPageLayout.tsx:783 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:314 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:334 📋 Skipping reset - no actual change (just re-render)
labels.ts:69  Fetched details for STARRED
labels.ts:80  Raw label details with counters: (25) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
labels.ts:98 Found 6 labels with message counts
labels.ts:101 KEY SYSTEM LABELS: (3) [{…}, {…}, {…}]
labels.ts:107 Successfully fetched 25 Gmail labels
