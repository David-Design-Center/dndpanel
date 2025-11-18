EmailPageLayout.tsx:784 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
optimizedEmailService.ts:105 🚀 OptimizedEmailService: Fetching thread 19a88693cd405a9c
optimizedEmailService.ts:110 ⚠️ Edge function disabled - falling back to direct Gmail API
usePagination.ts:353 ⏸️ Pagination: Viewing email detail, skipping reset {basePath: '/inbox', prevBasePath: '/inbox', isViewingEmail: true, wasViewingEmail: false, isTransitioningToDetail: true, …}
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
labels.ts:29 Fetching Gmail labels...
emailService.ts:907 Using cached email for ID: 19a88693cd405a9c
optimizedEmailService.ts:105 🚀 OptimizedEmailService: Fetching thread 19a88693cd405a9c
optimizedEmailService.ts:110 ⚠️ Edge function disabled - falling back to direct Gmail API
emailService.ts:987 Fetching all emails in thread: 19a88693cd405a9c
EmailPageLayout.tsx:784 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
optimizedEmailService.ts:105 🚀 OptimizedEmailService: Fetching thread 19a88693cd405a9c
optimizedEmailService.ts:110 ⚠️ Edge function disabled - falling back to direct Gmail API
usePagination.ts:353 ⏸️ Pagination: Viewing email detail, skipping reset {basePath: '/inbox', prevBasePath: undefined, isViewingEmail: true, wasViewingEmail: false, isTransitioningToDetail: true, …}
useEmailFetch.ts:674 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
useEmailFetch.ts:698 📧 Initial load delegated to usePagination
emailService.ts:907 Using cached email for ID: 19a88693cd405a9c
optimizedEmailService.ts:105 🚀 OptimizedEmailService: Fetching thread 19a88693cd405a9c
optimizedEmailService.ts:110 ⚠️ Edge function disabled - falling back to direct Gmail API
emailService.ts:987 Fetching all emails in thread: 19a88693cd405a9c
EmailPageLayout.tsx:784 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: 'Out of Office', responseBodyPlainText: '', responseBodyHtml: '<div style="font-family:Arial,sans-serif;line-heig…erstanding.</p>\n        <p>Marti</p>\n      </div>', restrictToContacts: false, …}
labels.ts:40  Raw Gmail API response from list: {labels: Array(23)}
labels.ts:41 Found 23 labels, now fetching details with counters...
labels.ts:48  Fetching detailed info for 7 key system labels only
labels.ts:69  Fetched details for SENT
messages.ts:349 Email fetch successful, processing payload
messages.ts:369 Finding body part...
messages.ts:372 Body part found, type: text/html
body.ts:22 📧 Decoding email part: mimeType=text/html, charset=utf-8
body.ts:26 📦 Decoded 61496 bytes from base64url
body.ts:32 🔐 Content-Transfer-Encoding: quoted-printable
body.ts:36 🔄 Decoding quoted-printable...
body.ts:38 📦 After QP decode: 61490 bytes
body.ts:43 📝 Decoded to 61470 characters
body.ts:46 📄 First 200 chars: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
messages.ts:376 🔍 Searching for inline attachments...
messages.ts:94 📎 Total inline attachments found: 0
messages.ts:383 ℹ️ No inline attachments found
messages.ts:387 🔍 Searching for real attachments...
messages.ts:59 📎 Total attachments found: 0
messages.ts:349 Email fetch successful, processing payload
messages.ts:369 Finding body part...
messages.ts:372 Body part found, type: text/html
body.ts:22 📧 Decoding email part: mimeType=text/html, charset=utf-8
body.ts:26 📦 Decoded 61496 bytes from base64url
body.ts:32 🔐 Content-Transfer-Encoding: quoted-printable
body.ts:36 🔄 Decoding quoted-printable...
body.ts:38 📦 After QP decode: 61490 bytes
body.ts:43 📝 Decoded to 61470 characters
body.ts:46 📄 First 200 chars: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
messages.ts:376 🔍 Searching for inline attachments...
messages.ts:94 📎 Total inline attachments found: 0
messages.ts:383 ℹ️ No inline attachments found
messages.ts:387 🔍 Searching for real attachments...
messages.ts:59 📎 Total attachments found: 0
labels.ts:69  Fetched details for INBOX
labels.ts:69  Fetched details for IMPORTANT
labels.ts:69  Fetched details for TRASH
labels.ts:69  Fetched details for DRAFT
labels.ts:69  Fetched details for SPAM
labels.ts:69  Fetched details for STARRED
labels.ts:80  Raw label details with counters: (23) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
labels.ts:98 Found 5 labels with message counts
labels.ts:101 KEY SYSTEM LABELS: (3) [{…}, {…}, {…}]
labels.ts:107 Successfully fetched 23 Gmail labels
