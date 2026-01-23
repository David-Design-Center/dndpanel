1. The new compose window doesn't show draft saved. Also no discard button.

2. EmailPageLayout.tsx:723 🗑️ Label deleted event received: Label_78113611707822340 INBOX/AA-WEB DESIGN/MARTI/MARTI/META ADS
EmailPageLayout.tsx:727 📍 Currently viewing deleted label, navigating to inbox...
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:369 📋 Loading first page of emails... (tab/label changed)
usePagination.ts:76 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:462 Fetching fresh email list (inbox - cache expired) with query: in:inbox
emailService.ts:470 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1768997316438-j4bvzbnnv
useEmailFetch.ts:676 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:791 📂 Folder changed, clearing selection
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'AA-WEB DESIGN/MARTI/MARTI/META ADS', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:369 📋 Loading first page of emails... (tab/label changed)
usePagination.ts:76 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
usePagination.ts:140 📧 Using labelId for filtering: {labelIdParam: 'Label_78113611707822340', fallbackLabel: 'INBOX/AA-WEB DESIGN/MARTI/MARTI/META ADS'}
useEmailFetch.ts:676 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: 'AA-WEB DESIGN/MARTI/MARTI/META ADS', labelQueryParam: 'INBOX/AA-WEB DESIGN/MARTI/MARTI/META ADS', labelIdParam: 'Label_78113611707822340', …}
useEmailFetch.ts:703 📧 Label emails handled by pagination system
useTabManagement.ts:115 📂 Reset activeTab to "all" (viewing custom label: AA-WEB DESIGN/MARTI/MARTI/META ADS )
EmailPageLayout.tsx:791 📂 Folder changed, clearing selection
usePagination.ts:193 ✅ Fetched 1 emails using labelId:Label_78113611707822340 in 0ms
usePagination.ts:221 📄 Pagination state: {emailsCount: 1, nextPageToken: undefined, isInboxQuery: false, hasActualMore: false, forceMore: false, …}
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'AA-WEB DESIGN/MARTI/MARTI/META ADS', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:356 📋 Skipping reset - no actual change (just re-render)
usePagination.ts:336 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: 'AA-WEB DESIGN/MARTI/MARTI/META ADS', isGmailSignedIn: true, isGmailInitializing: false, tabChanged: true, …}
usePagination.ts:369 📋 Loading first page of emails... (initial load)
usePagination.ts:76 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
usePagination.ts:140 📧 Using labelId for filtering: {labelIdParam: 'Label_78113611707822340', fallbackLabel: 'INBOX/AA-WEB DESIGN/MARTI/MARTI/META ADS'}
useEmailFetch.ts:676 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: 'AA-WEB DESIGN/MARTI/MARTI/META ADS', labelQueryParam: 'INBOX/AA-WEB DESIGN/MARTI/MARTI/META ADS', labelIdParam: 'Label_78113611707822340', …}
useEmailFetch.ts:703 📧 Label emails handled by pagination system
useTabManagement.ts:115 📂 Reset activeTab to "all" (viewing custom label: AA-WEB DESIGN/MARTI/MARTI/META ADS )
EmailPageLayout.tsx:791 📂 Folder changed, clearing selection
EmailPreloaderContext.tsx:210 📧 EmailPreloader: User on email page, starting preload
gmailVacationService.ts:98 Getting Gmail vacation responder settings...
requestQueue.ts:70 🔄 Executing queued request: get-vacation-settings-1768997316822-kxbgpeky8
LabelContext.tsx:325 🔬 DIAGNOSTIC MODE: Supabase Realtime subscription DISABLED
requestQueue.ts:73 ✅ Completed queued request: get-vacation-settings-1768997316822-kxbgpeky8