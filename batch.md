Batching Requests

bookmark_border
This document shows how to batch API calls together to reduce the number of HTTP connections your client has to make.

This document is specifically about making a batch request by sending an HTTP request. If, instead, you're using a Google client library to make a batch request, see the client library's documentation.

Overview
Each HTTP connection your client makes results in a certain amount of overhead. The Gmail API supports batching, to allow your client to put several API calls into a single HTTP request.

Examples of situations when you might want to use batching:

You've just started using the API and you have a lot of data to upload.
A user made changes to data while your application was offline (disconnected from the Internet), so your application needs to synchronize its local data with the server by sending a lot of updates and deletes.
In each case, instead of sending each call separately, you can group them together into a single HTTP request. All the inner requests must go to the same Google API.

You're limited to 100 calls in a single batch request. If you must make more calls than that, use multiple batch requests.

Note: The batch system for the Gmail API uses the same syntax as the OData batch processing system, but the semantics differ.


Note: Larger batch sizes are likely to trigger rate limiting. Sending batches larger than 50 requests is not recommended.

Batch details
A batch request consists of multiple API calls combined into one HTTP request, which can be sent to the batchPath specified in the API discovery document. The default path is /batch/api_name/api_version. This section describes the batch syntax in detail; later, there's an example.

Note: A set of n requests batched together counts toward your usage limit as n requests, not as one request. The batch request is separated into a set of requests before processing.

Format of a batch request
A batch request is a single standard HTTP request containing multiple Gmail API calls, using the multipart/mixed content type. Within that main HTTP request, each of the parts contains a nested HTTP request.

Each part begins with its own Content-Type: application/http HTTP header. It can also have an optional Content-ID header. However, the part headers are just there to mark the beginning of the part; they're separate from the nested request. After the server unwraps the batch request into separate requests, the part headers are ignored.

The body of each part is a complete HTTP request, with its own verb, URL, headers, and body. The HTTP request must only contain the path portion of the URL; full URLs are not allowed in batch requests.

The HTTP headers for the outer batch request, except for the Content- headers such as Content-Type, apply to every request in the batch. If you specify a given HTTP header in both the outer request and an individual call, then the individual call header's value overrides the outer batch request header's value. The headers for an individual call apply only to that call.

For example, if you provide an Authorization header for a specific call, then that header applies only to that call. If you provide an Authorization header for the outer request, then that header applies to all of the individual calls unless they override it with Authorization headers of their own.

When the server receives the batched request, it applies the outer request's query parameters and headers (as appropriate) to each part, and then treats each part as if it were a separate HTTP request.

Response to a batch request
The server's response is a single standard HTTP response with a multipart/mixed content type; each part is the response to one of the requests in the batched request, in the same order as the requests.

Like the parts in the request, each response part contains a complete HTTP response, including a status code, headers, and body. And like the parts in the request, each response part is preceded by a Content-Type header that marks the beginning of the part.

If a given part of the request had a Content-ID header, then the corresponding part of the response has a matching Content-ID header, with the original value preceded by the string response-, as shown in the following example.

Note: The server might perform your calls in any order. Don't count on their being executed in the order in which you specified them. If you want to ensure that two calls occur in a given order, you can't send them in a single request; instead, send the first one by itself, then wait for the response to the first one before sending the second one.

Example
The following example shows the use of batching with a generic (fictional) demo API called the Farm API. However, the same concepts apply to the Gmail API.

Example batch request

POST /batch/farm/v1 HTTP/1.1
Authorization: Bearer your_auth_token
Host: www.googleapis.com
Content-Type: multipart/mixed; boundary=batch_foobarbaz
Content-Length: total_content_length

--batch_foobarbaz
Content-Type: application/http
Content-ID: <item1:12930812@barnyard.example.com>

GET /farm/v1/animals/pony

--batch_foobarbaz
Content-Type: application/http
Content-ID: <item2:12930812@barnyard.example.com>

PUT /farm/v1/animals/sheep
Content-Type: application/json
Content-Length: part_content_length
If-Match: "etag/sheep"

{
  "animalName": "sheep",
  "animalAge": "5"
  "peltColor": "green",
}

--batch_foobarbaz
Content-Type: application/http
Content-ID: <item3:12930812@barnyard.example.com>

GET /farm/v1/animals
If-None-Match: "etag/animals"

--batch_foobarbaz--
Example batch response
This is the response to the example request in the previous section.


HTTP/1.1 200
Content-Length: response_total_content_length
Content-Type: multipart/mixed; boundary=batch_foobarbaz

--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item1:12930812@barnyard.example.com>

HTTP/1.1 200 OK
Content-Type application/json
Content-Length: response_part_1_content_length
ETag: "etag/pony"

{
  "kind": "farm#animal",
  "etag": "etag/pony",
  "selfLink": "/farm/v1/animals/pony",
  "animalName": "pony",
  "animalAge": 34,
  "peltColor": "white"
}

--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item2:12930812@barnyard.example.com>

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: response_part_2_content_length
ETag: "etag/sheep"

{
  "kind": "farm#animal",
  "etag": "etag/sheep",
  "selfLink": "/farm/v1/animals/sheep",
  "animalName": "sheep",
  "animalAge": 5,
  "peltColor": "green"
}

--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item3:12930812@barnyard.example.com>

HTTP/1.1 304 Not Modified
ETag: "etag/animals"

--batch_foobarbaz--






Console after updates:
chunk-WRD5HZVH.js?v=70c23853:21551 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
LabelContext.tsx:739 📊 System counts derived from labels: Object
react-router-dom.js?v=70c23853:4393 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
warnOnce @ react-router-dom.js?v=70c23853:4393
react-router-dom.js?v=70c23853:4393 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
warnOnce @ react-router-dom.js?v=70c23853:4393
AuthContext.tsx:257 Found existing session, user is authenticated
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
modern-animated-sign-in.tsx:404 Form submitted
AuthContext.tsx:422 🔍 Admin check - Profile data: Object
AuthContext.tsx:423 🔍 Admin check - is_admin: true
AuthContext.tsx:424 🔍 Admin check - name: David
AuthContext.tsx:425 🔍 Admin check - email: david.v@dnddesigncenter.com
AuthContext.tsx:429 🔍 Admin check - Final result: true
SecurityContext.tsx:34 User david.v@dnddesigncenter.com is authorized
emailService.ts:341 Clearing email cache for profile switch to: f6ca1590-eb6f-4fa6-9da3-304753293c25
emailService.ts:322 Clearing all email caches (memory + localStorage)
ProfileContext.tsx:191 🔑 Clearing GAPI client token for profile switch
gapiService.ts:437 🔑 Clearing current access token from gapiService
ProfileContext.tsx:195 🔄 Dispatching clear-all-caches event for profile switch
LoadingProgressToast.tsx:83 🔄 LoadingProgressToast: Profile switch detected, resetting first trigger flag
LabelContext.tsx:682 🗑️ LabelContext: Clearing labels cache for profile switch
LabelContext.tsx:591 🗑️ Clearing labels cache
ProfileContext.tsx:207 📧 Set current user email: david.v@dnddesigncenter.com
AuthContext.tsx:143 Checking Gmail tokens for profile: David
AuthContext.tsx:144 Profile userEmail: david.v@dnddesigncenter.com
AuthContext.tsx:145 Profile object: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
chunk-WRD5HZVH.js?v=70c23853:521 Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?

Check the render method of `Primitive.button.SlotClone`.
    at Tooltip (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=70c23853:111:5)
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=70c23853:79:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-LPBYGXI2.js?v=70c23853:56:13
    at http://localhost:5173/node_modules/.vite/deps/chunk-OAHNTYLA.js?v=70c23853:43:13
    at http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-dialog.js?v=70c23853:464:13
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-N2ODAK4M.js?v=70c23853:38:15)
    at Dialog (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-dialog.js?v=70c23853:428:5)
    at TutorialsDialog (http://localhost:5173/src/components/common/TutorialsDialog.tsx?t=1759745708601:24:3)
    at div
    at nav
    at aside
    at Provider (http://localhost:5173/node_modules/.vite/deps/chunk-N2ODAK4M.js?v=70c23853:38:15)
    at TooltipProvider (http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=70c23853:67:5)
    at Sidebar (http://localhost:5173/src/components/layout/Sidebar.tsx?t=1759749498319:29:18)
    at div
    at InboxLayoutProviderInternal (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:22:40)
    at InboxLayoutProvider (http://localhost:5173/src/contexts/InboxLayoutContext.tsx:105:39)
    at EmailListProvider (http://localhost:5173/src/contexts/EmailListContext.tsx:20:37)
    at PanelSizesProvider (http://localhost:5173/src/contexts/PanelSizesContext.tsx:20:38)
    at LayoutContent (http://localhost:5173/src/components/layout/Layout.tsx?t=1759749498319:122:3)
    at FoldersColumnProvider (http://localhost:5173/src/contexts/FoldersColumnContext.tsx:20:41)
    at Layout (http://localhost:5173/src/components/layout/Layout.tsx?t=1759749498319:33:47)
    at FilterCreationProvider (http://localhost:5173/src/contexts/FilterCreationContext.tsx:20:42)
    at ContactsProvider (http://localhost:5173/src/contexts/ContactsContext.tsx?t=1759749498319:35:36)
    at EmailPreloaderProvider (http://localhost:5173/src/contexts/EmailPreloaderContext.tsx?t=1759749498319:31:42)
    at ProtectedRoute (http://localhost:5173/src/App.tsx?t=1759762521972:89:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=70c23853:4088:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=70c23853:4558:5)
    at App (http://localhost:5173/src/App.tsx?t=1759762521972:126:3)
    at OutOfOfficeProvider (http://localhost:5173/src/contexts/OutOfOfficeContext.tsx?t=1759749498319:37:39)
    at OutOfOfficeSettingsProvider (http://localhost:5173/src/contexts/OutOfOfficeSettingsContext.tsx?t=1759749498319:81:47)
    at LabelProvider (http://localhost:5173/src/contexts/LabelContext.tsx?t=1759749498319:103:33)
    at ProfileProvider (http://localhost:5173/src/contexts/ProfileContext.tsx?t=1759749498319:27:35)
    at SecurityProvider (http://localhost:5173/src/contexts/SecurityContext.tsx:22:36)
    at AuthProvider (http://localhost:5173/src/contexts/AuthContext.tsx:30:32)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=70c23853:4501:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=70c23853:5247:5)
printWarning @ chunk-WRD5HZVH.js?v=70c23853:521
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 0 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
EmailPageLayout.tsx:1078 📧 EmailPageLayout useEffect triggered: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 0 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
gapiService.ts:159 GAPI client and GIS clients initialized successfully
EmailPageLayout.tsx:1789 📧 Current state: Object
gapiService.ts:462 Access token set manually
EmailPageLayout.tsx:1789 📧 Current state: Object
EmailPageLayout.tsx:1078 📧 EmailPageLayout useEffect triggered: Object
EmailPageLayout.tsx:1082 📧 Starting OPTIMIZED fetchAllEmailTypes...
EmailPageLayout.tsx:419 � Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...
optimizedInitialLoad.ts:291 🚀 Orchestrator: Loading scoped inbox (24h)
emailService.ts:424 Fetching fresh email list (forced refresh) with query: label:INBOX is:unread after:1759676700
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-is:unread-after:1759676700-1759763100856-4a3q2m0s9
emailService.ts:440 No valid cache found, fetching fresh email list with query: in:inbox
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-in:inbox-1759763100857-ubq2he4gp
gmailVacationService.ts:97 Getting Gmail vacation responder settings...
LabelContext.tsx:514 🏷️ Labels cache key: f6ca1590-eb6f-4fa6-9da3-304753293c25-david.v@dnddesigncenter.com
LabelContext.tsx:545 🔄 Fetching fresh Gmail labels for profile: David email: david.v@dnddesigncenter.com
gapiService.ts:2237 Fetching Gmail labels...
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 0 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
emailService.ts:563 📧 getAllInboxEmails using 24h filter: label:INBOX after:1759676700
emailService.ts:440 No valid cache found, fetching fresh email list with query: label:INBOX after:1759676700
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-after:1759676700-1759763100885-k8hu5qtl1
emailService.ts:440 No valid cache found, fetching fresh email list with query: label:INBOX is:unread after:1759676700
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-is:unread-after:1759676700-1759763100886-mvo8jn876
gmailVacationService.ts:119 Gmail vacation settings retrieved: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
gapiService.ts:2249  Raw Gmail API response from list: Object
gapiService.ts:2250 � Found 641 labels, now fetching details with counters...
gapiService.ts:2258  Fetching detailed info for 7 key system labels only
gapiService.ts:2282  Fetched details for SENT
ProfileContext.tsx:251 🔄 Force refreshing all data after profile switch
LabelContext.tsx:695 🔄 LabelContext: Force refresh data event received
LabelContext.tsx:700 🛑 Skipping force refresh - recently loaded or already loading
EmailPageLayout.tsx:1789 📧 Current state: Object
gapiService.ts:2282  Fetched details for INBOX
EmailPageLayout.tsx:1789 📧 Current state: Object
gapiService.ts:2282  Fetched details for IMPORTANT
gapiService.ts:2282  Fetched details for TRASH
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-in:inbox-1759763100857-ubq2he4gp
EmailPageLayout.tsx:1789 📧 Current state: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-is:unread-after:1759676700-1759763100886-mvo8jn876
emailService.ts:514 📧 getUnreadEmails using 24h filter: label:INBOX is:unread after:1759676700
EmailPageLayout.tsx:1789 📧 Current state: Object
gapiService.ts:2282  Fetched details for DRAFT
gapiService.ts:2282  Fetched details for SPAM
gapiService.ts:2282  Fetched details for STARRED
gapiService.ts:2294  Raw label details with counters: Array(641)
gapiService.ts:2313 Found 7 labels with message counts
gapiService.ts:2317 KEY SYSTEM LABELS: Array(3)
gapiService.ts:2323 Successfully fetched 641 Gmail labels
LabelContext.tsx:326 🔄 Labels loaded successfully at: 1759763105344
LabelContext.tsx:704 ✅ In-flight request completed, force refresh satisfied
LabelContext.tsx:552 Labels with counts: Array(7)
LabelContext.tsx:376 📬 Hydrating unread counts for 626 user labels...
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-is:unread-after:1759676700-1759763100856-4a3q2m0s9
emailService.ts:424 Fetching fresh email list (forced refresh) with query: label:INBOX -is:unread after:1759676700
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX--is:unread-after:1759676700-1759763106932-n60n3vr71
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-after:1759676700-1759763100885-k8hu5qtl1
EmailPageLayout.tsx:1789 📧 Current state: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX--is:unread-after:1759676700-1759763106932-n60n3vr71
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
optimizedInitialLoad.ts:245 📋 Fetching labels (optimized)
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
optimizedInitialLoad.ts:275 📋 Cached 641 labels
EmailPageLayout.tsx:470 📧 Critical data loaded: 0 unread, 0 recent, unread last 24h: 0, 641 labels
optimizedInitialLoad.ts:328 No unread emails for auto-reply processing
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 0 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
emailService.ts:563 📧 getAllInboxEmails using 24h filter: label:INBOX after:1759676707
emailService.ts:424 Fetching fresh email list (forced refresh) with query: label:INBOX after:1759676707
emailService.ts:445 📧 Queueing Gmail API request for emails...
requestQueue.ts:70 🔄 Executing queued request: fetch-emails-label:INBOX-after:1759676707-1759763107340-2gx3eraha
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
requestQueue.ts:73 ✅ Completed queued request: fetch-emails-label:INBOX-after:1759676707-1759763107340-2gx3eraha
optimizedInitialLoad.ts:355 🔄 STEP 2: Prefetching essential folder IDs (metadata on-demand)...
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
optimizedInitialLoad.ts:104 📧 Optimized fetch: labelIds=[SENT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
optimizedInitialLoad.ts:104 📧 Optimized fetch: labelIds=[DRAFT], maxResults=15
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
gmailLabels.ts:46 ✅ Valid Gmail labelIds: Array(1)
optimizedInitialLoad.ts:104 📧 Optimized fetch: labelIds=[IMPORTANT], maxResults=15
EmailPageLayout.tsx:572 ✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!
EmailPageLayout.tsx:1789 📧 Current state: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
optimizedInitialLoad.ts:152 📦 Fetching metadata for 15 messages with rate limiting...
optimizedInitialLoad.ts:152 📦 Fetching metadata for 3 messages with rate limiting...
optimizedInitialLoad.ts:152 📦 Fetching metadata for 15 messages with rate limiting...
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
optimizedInitialLoad.ts:226 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:226 ✅ Successfully processed 3/3 message metadata
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
optimizedInitialLoad.ts:226 ✅ Successfully processed 15/15 message metadata
optimizedInitialLoad.ts:370 ✅ Essential folder IDs cached: 15 sent, 3 drafts, 15 important
EmailPageLayout.tsx:534 📧 Essential folders loaded: 15 sent, 3 drafts, 15 important
EmailPageLayout.tsx:1789 📧 Current state: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
EmailPageLayout.tsx:1789 📧 Current state: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
LabelContext.tsx:434 ✅ Finished hydrating user label counts
LabelContext.tsx:739 📊 System counts derived from labels: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
FoldersColumn.tsx:262 useMemo systemFolders - systemCounts: Object recentCounts: Object
FoldersColumn.tsx:329 Inbox unread count: 34 systemCounts: Object
