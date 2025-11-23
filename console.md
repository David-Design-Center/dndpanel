emailService.ts:346 Clearing email cache for profile switch to: f6ca1590-eb6f-4fa6-9da3-304753293c25
emailService.ts:327 Clearing all email caches (memory + localStorage)
ProfileContext.tsx:191 🔑 Clearing GAPI client token for profile switch
gapiService.ts:662 🔑 Clearing current access token from gapiService
ProfileContext.tsx:195 🔄 Dispatching clear-all-caches event for profile switch
ProfileContext.tsx:207 📧 Set current user email: david.v@dnddesigncenter.com
AuthContext.tsx:143 Checking Gmail tokens for profile: David
AuthContext.tsx:144 Profile userEmail: david.v@dnddesigncenter.com
AuthContext.tsx:145 Profile object: {id: 'f6ca1590-eb6f-4fa6-9da3-304753293c25', name: 'David', passcode: 'admin123', avatar: null, created_at: '2025-05-29T19:03:36.699351+00:00', …}
OutOfOfficeContext.tsx:104 ⏸️ OutOfOfficeContext: Not on email/settings page, skipping status check
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
usePagination.ts:313 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: false, isGmailInitializing: true, tabChanged: true, …}
usePagination.ts:328 📋 Waiting for Gmail initialization to complete...
useEmailFetch.ts:674 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: false, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: true, …}
gapiService.ts:327 GAPI client and GIS clients initialized successfully
gapiService.ts:687 Access token set manually
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:313 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: true, …}
usePagination.ts:345 📋 Loading first page of emails... (initial load)
usePagination.ts:73 🔍 loadPaginatedEmails called: {pageToken: 'none', append: false, currentEmailsCount: 0}
emailService.ts:445 Fetching fresh email list (inbox - cache expired) with query: in:inbox
emailService.ts:453 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1763918471210-j1ehgxakq
useEmailFetch.ts:674 📧 EmailPageLayout useEffect triggered: {isGmailSignedIn: true, pageType: 'inbox', labelName: null, labelQueryParam: null, labelIdParam: null, …}
useEmailFetch.ts:698 📧 Initial load delegated to usePagination
EmailPreloaderContext.tsx:210 📧 EmailPreloader: User on email page, starting preload
EmailPreloaderContext.tsx:121 📧 EmailPreloader: Loading inbox threads first
emailService.ts:445 Fetching fresh email list (inbox - cache expired) with query: in:inbox -has:userlabels
emailService.ts:453 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox--has:userlabels-1763918471211-v827vvfbn
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 0, loading: true, authLoading: false, isGmailInitializing: false, …}
gapiService.ts:440 🔄 Starting automatic token refresh scheduler (every 25 minutes)
ProfileContext.tsx:248 ✅ Token refresh scheduler started for profile: David
gmailVacationService.ts:119 Gmail vacation settings retrieved: {enableAutoReply: false, responseSubject: '', responseBodyPlainText: '', responseBodyHtml: '', restrictToContacts: false, …}
ProfileContext.tsx:256 🔄 Force refreshing all data after profile switch
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox--has:userlabels-1763918471211-v827vvfbn
labels.ts:49 Fetching Gmail labels...
labels.ts:60  Raw Gmail API response from list: {labels: Array(655)}
labels.ts:61 Found 655 labels, now fetching details with counters...
labels.ts:68  Fetching detailed info for 7 system labels (custom labels stay cached until manual refresh)
labels.ts:117 📂 Hydrating 7 system labels...
requestQueue.ts:70 🔄 Executing queued request: label-detail-SENT-1763918472445-tro4yrshi
requestQueue.ts:70 🔄 Executing queued request: label-detail-INBOX-1763918472445-7acmg5nd5
requestQueue.ts:70 🔄 Executing queued request: label-detail-IMPORTANT-1763918472446-b0qs9nif8
requestQueue.ts:70 🔄 Executing queued request: label-detail-TRASH-1763918472446-7bekhepv2
requestQueue.ts:73 ✅ Completed queued request: label-detail-INBOX-1763918472445-7acmg5nd5
requestQueue.ts:73 ✅ Completed queued request: label-detail-SENT-1763918472445-tro4yrshi
requestQueue.ts:73 ✅ Completed queued request: label-detail-IMPORTANT-1763918472446-b0qs9nif8
requestQueue.ts:73 ✅ Completed queued request: label-detail-TRASH-1763918472446-7bekhepv2
requestQueue.ts:70 🔄 Executing queued request: label-detail-DRAFT-1763918472446-m2tnlhzat
requestQueue.ts:70 🔄 Executing queued request: label-detail-SPAM-1763918472446-nqeq45gtn
requestQueue.ts:73 ✅ Completed queued request: label-detail-DRAFT-1763918472446-m2tnlhzat
requestQueue.ts:70 🔄 Executing queued request: label-detail-STARRED-1763918472446-nrgqzb039
requestQueue.ts:73 ✅ Completed queued request: label-detail-SPAM-1763918472446-nqeq45gtn
requestQueue.ts:73 ✅ Completed queued request: label-detail-STARRED-1763918472446-nrgqzb039
labels.ts:82 📦 Label detail progress: 7/7 succeeded (0 failed)
labels.ts:82 📦 Label detail progress: 7/7 succeeded (0 failed)
labels.ts:154  ✓ Completed label detail fetch: 7/7 succeeded (0 failed)
labels.ts:163  Raw label details with counters: (655) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
labels.ts:181 Found 7 labels with message counts
labels.ts:184 KEY SYSTEM LABELS: (3) [{…}, {…}, {…}]
labels.ts:190 Successfully fetched 655 Gmail labels
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1763918471210-j1ehgxakq
usePagination.ts:171 ✅ Fetched 25 emails using query in 0ms
usePagination.ts:199 📄 Pagination state: {emailsCount: 25, nextPageToken: '05971392831620419413', isInboxQuery: true, hasActualMore: true, forceMore: true, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
usePagination.ts:313 📋 Pagination useEffect triggered: {activeTab: 'all', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:333 📋 Skipping reset - no actual change (just re-render)
requestQueue.ts:70 🔄 Executing queued request: drafts-list-1763918483531-rhc91sxgj
gapiCallWrapper.ts:20 📧 Making drafts.list...
requestQueue.ts:73 ✅ Completed queued request: drafts-list-1763918483531-rhc91sxgj
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:10590771912894006450-1763918483605-so8y0irb6
gapiCallWrapper.ts:20 📧 Making draft.get for s:10590771912894006450...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:10590771912894006450-1763918483605-so8y0irb6
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:395629892137848701-1763918483723-r7eolfxfj
gapiCallWrapper.ts:20 📧 Making draft.get for s:395629892137848701...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:395629892137848701-1763918483723-r7eolfxfj
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:18007872970110603962-1763918483850-516gxsaop
gapiCallWrapper.ts:20 📧 Making draft.get for s:18007872970110603962...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:18007872970110603962-1763918483850-516gxsaop
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:5604701261934352325-1763918483964-knsfvag5r
gapiCallWrapper.ts:20 📧 Making draft.get for s:5604701261934352325...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:5604701261934352325-1763918483964-knsfvag5r
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:6677164155184241099-1763918484071-l7fs7xnsz
gapiCallWrapper.ts:20 📧 Making draft.get for s:6677164155184241099...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:6677164155184241099-1763918484071-l7fs7xnsz
requestQueue.ts:70 🔄 Executing queued request: draft-get-draft-rewrite-1849314865962790962-1763918484198-cl9kcwcwl
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1849314865962790962...
requestQueue.ts:73 ✅ Completed queued request: draft-get-draft-rewrite-1849314865962790962-1763918484198-cl9kcwcwl
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:11374793594439608496-1763918484319-mxnor2cl0
gapiCallWrapper.ts:20 📧 Making draft.get for s:11374793594439608496...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:11374793594439608496-1763918484319-mxnor2cl0
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:8645645397022914724-1763918484437-he5sr9m2s
gapiCallWrapper.ts:20 📧 Making draft.get for s:8645645397022914724...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:8645645397022914724-1763918484437-he5sr9m2s
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:4475260668287250484-1763918484557-zl9mphsh5
gapiCallWrapper.ts:20 📧 Making draft.get for s:4475260668287250484...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:4475260668287250484-1763918484557-zl9mphsh5
requestQueue.ts:70 🔄 Executing queued request: draft-get-draft-rewrite-1849187183877173252-1763918484674-aybexcdpt
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1849187183877173252...
requestQueue.ts:73 ✅ Completed queued request: draft-get-draft-rewrite-1849187183877173252-1763918484674-aybexcdpt
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:3354666151863076608-1763918484793-usfehagsh
gapiCallWrapper.ts:20 📧 Making draft.get for s:3354666151863076608...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:3354666151863076608-1763918484793-usfehagsh
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:11848837786149943978-1763918484905-xvgbk6lfe
gapiCallWrapper.ts:20 📧 Making draft.get for s:11848837786149943978...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:11848837786149943978-1763918484905-xvgbk6lfe
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:18267072566162821896-1763918485021-3ec79iiaq
gapiCallWrapper.ts:20 📧 Making draft.get for s:18267072566162821896...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:18267072566162821896-1763918485021-3ec79iiaq
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:9054822928511026174-1763918485210-zo8u622ow
gapiCallWrapper.ts:20 📧 Making draft.get for s:9054822928511026174...
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
EmailPageLayout.tsx:837 📧 Current state: {activeTab: 'all', filteredEmailsLength: 25, loading: false, authLoading: false, isGmailInitializing: false, …}
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:9054822928511026174-1763918485210-zo8u622ow
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:1601943953077450480-1763918485385-m85y7rf2n
gapiCallWrapper.ts:20 📧 Making draft.get for s:1601943953077450480...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:1601943953077450480-1763918485385-m85y7rf2n
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:6028141516786214457-1763918485517-nr49zgfvx
gapiCallWrapper.ts:20 📧 Making draft.get for s:6028141516786214457...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:6028141516786214457-1763918485517-nr49zgfvx
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:13378777065917779456-1763918485634-nagsaim3q
gapiCallWrapper.ts:20 📧 Making draft.get for s:13378777065917779456...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:13378777065917779456-1763918485634-nagsaim3q
requestQueue.ts:70 🔄 Executing queued request: draft-get-draft-rewrite-1848595058465060389-1763918485757-7c30py9kv
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1848595058465060389...
requestQueue.ts:73 ✅ Completed queued request: draft-get-draft-rewrite-1848595058465060389-1763918485757-7c30py9kv
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:7677385884639340620-1763918485891-zbb5qitdr
gapiCallWrapper.ts:20 📧 Making draft.get for s:7677385884639340620...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:7677385884639340620-1763918485891-zbb5qitdr
requestQueue.ts:70 🔄 Executing queued request: draft-get-draft-rewrite-1848557031957558076-1763918486008-q7mnyki5u
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1848557031957558076...
requestQueue.ts:73 ✅ Completed queued request: draft-get-draft-rewrite-1848557031957558076-1763918486008-q7mnyki5u
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:54449407488402815-1763918486118-td5qsraun
gapiCallWrapper.ts:20 📧 Making draft.get for s:54449407488402815...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:54449407488402815-1763918486118-td5qsraun
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:16415134643524987176-1763918486217-3gycefb3g
gapiCallWrapper.ts:20 📧 Making draft.get for s:16415134643524987176...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:16415134643524987176-1763918486217-3gycefb3g
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:591388402013962750-1763918486318-r7od9wn6r
gapiCallWrapper.ts:20 📧 Making draft.get for s:591388402013962750...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:591388402013962750-1763918486318-r7od9wn6r
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:1832171522541605489-1763918486446-iyjzxe2c5
gapiCallWrapper.ts:20 📧 Making draft.get for s:1832171522541605489...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:1832171522541605489-1763918486446-iyjzxe2c5
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:98511781609512971-1763918486552-2ua5t8ht6
gapiCallWrapper.ts:20 📧 Making draft.get for s:98511781609512971...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:98511781609512971-1763918486552-2ua5t8ht6
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:17439321002618791901-1763918486660-qvj18cdv7
gapiCallWrapper.ts:20 📧 Making draft.get for s:17439321002618791901...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:17439321002618791901-1763918486660-qvj18cdv7
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:16834140988497064639-1763918486793-78tjeaz1x
gapiCallWrapper.ts:20 📧 Making draft.get for s:16834140988497064639...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:16834140988497064639-1763918486793-78tjeaz1x
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:5603190161741442441-1763918486921-h07mvapap
gapiCallWrapper.ts:20 📧 Making draft.get for s:5603190161741442441...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:5603190161741442441-1763918486921-h07mvapap
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:3424296762724875495-1763918487048-bj8jpyuxo
gapiCallWrapper.ts:20 📧 Making draft.get for s:3424296762724875495...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:3424296762724875495-1763918487048-bj8jpyuxo
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:16165176847470514473-1763918487154-ty6e1cqz2
gapiCallWrapper.ts:20 📧 Making draft.get for s:16165176847470514473...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:16165176847470514473-1763918487154-ty6e1cqz2
requestQueue.ts:70 🔄 Executing queued request: draft-get-s:13217951430499546280-1763918487308-02dbd09ab
gapiCallWrapper.ts:20 📧 Making draft.get for s:13217951430499546280...
requestQueue.ts:73 ✅ Completed queued request: draft-get-s:13217951430499546280-1763918487308-02dbd09ab
requestQueue.ts:70 🔄 Executing queued request: draft-get-draft-rewrite-1841716258751458057-1763918487434-nzaqnk6r6
gapiCallWrapper.ts:20 📧 Making draft.get for draft-rewrite-1841716258751458057...
requestQueue.ts:73 ✅ Completed queued request: draft-get-draft-rewrite-1841716258751458057-1763918487434-nzaqnk6r6
emailService.ts:445 Fetching fresh email list (inbox - cache expired) with query: label:INBOX -has:userlabels is:unread
emailService.ts:453 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX--has:userlabels-is:unread-1763918489374-eo3mest9c
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX--has:userlabels-is:unread-1763918489374-eo3mest9c
emailService.ts:521 📧 getUnreadEmails using query: label:INBOX -has:userlabels is:unread
