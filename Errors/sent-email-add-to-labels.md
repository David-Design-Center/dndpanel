Issue: Optimistic move removed email from list although it's still there when i refresh. It shouldn't remove email from the list because it applies both labels.


requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:SENT-1769519908075-bxyeehdu3
usePagination.ts:195 ✅ Fetched 25 emails using label:SENT in 0ms
usePagination.ts:223 📄 Pagination state: {emailsCount: 25, nextPageToken: '02968962574409110299', isInboxQuery: false, hasActualMore: true, forceMore: false, …}
usePagination.ts:357 📋 Pagination useEffect triggered: {activeTab: 'sent', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:377 📋 Skipping reset - no actual change (just re-render)
useTabManagement.ts:94 📂 Filtered to: sent (tab: sent)
EmailDndContext.tsx:155 📦 DnD: Started drag from inbox
EmailDndContext.tsx:194 📦 DnD: Dropping 1 emails (0 unread) on folder: Invoices (Label_6881704492436548755)
EmailDndContext.tsx:195 📦 DnD: Source - pageType: inbox, labelId: null
Layout.tsx:79 📦 Drop: Moving 1 emails to "Invoices"
Layout.tsx:80    Source: inbox
Layout.tsx:81    Remove: [INBOX], Add: [Label_6881704492436548755]
EmailPageLayout.tsx:756 📦 Emails moved event received: 1 emails
EmailPageLayout.tsx:783 📦 Clear selection event received
Layout.tsx:217 📦 MoveConfirm: Adding [Label_6881704492436548755], Removing [INBOX]
emailService.ts:1438 📦 Batch applying labels to 1 emails: {add: Array(1), remove: Array(1)}
EmailPageLayout.tsx:761 📦 Removed 1 emails from list
usePagination.ts:357 📋 Pagination useEffect triggered: {activeTab: 'sent', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:377 📋 Skipping reset - no actual change (just re-render)
labels.ts:648 🔍 Resolving 1 messages to full thread message IDs...
labels.ts:687 📧 Found 1 unique threads from 1 messages
labels.ts:705 ✅ Resolved to 4 total message IDs (from 1 threads)
labels.ts:753 📦 Applying labels to 4 messages (from 1 input IDs)
labels.ts:774 ✅ Successfully applied labels to 4 messages
emailService.ts:357 📦 Email list cache invalidated: batch label update (cleared 2 localStorage entries)
emailService.ts:1463 🔄 User labels applied in batch - triggering inbox refetch
emailService.ts:1469 ✅ Successfully batch applied labels to 1 emails
usePagination.ts:293 📜 Loading more emails (scroll trigger)...
usePagination.ts:258 📜 Loading more emails...
usePagination.ts:78 🔍 loadPaginatedEmails called: {pageToken: 'present', append: true, currentEmailsCount: 24}
emailService.ts:464 Fetching fresh email list (pagination) with query: label:SENT
emailService.ts:472 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:SENT-1769519929863-i46mw7een
usePagination.ts:357 📋 Pagination useEffect triggered: {activeTab: 'sent', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:377 📋 Skipping reset - no actual change (just re-render)
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:SENT-1769519929863-i46mw7een
usePagination.ts:195 ✅ Fetched 25 emails using label:SENT in 0ms
usePagination.ts:223 📄 Pagination state: {emailsCount: 25, nextPageToken: '04093773754850346939', isInboxQuery: false, hasActualMore: true, forceMore: false, …}
usePagination.ts:357 📋 Pagination useEffect triggered: {activeTab: 'sent', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:377 📋 Skipping reset - no actual change (just re-render)
