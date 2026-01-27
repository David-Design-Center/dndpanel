EmailDndContext.tsx:155 📦 DnD: Started drag from inbox
EmailDndContext.tsx:194 📦 DnD: Dropping 1 emails (0 unread) on folder: Inbox (INBOX)
EmailDndContext.tsx:195 📦 DnD: Source - pageType: inbox, labelId: null
Layout.tsx:79 📦 Drop: Moving 1 emails to "Inbox"
Layout.tsx:80    Source: inbox
Layout.tsx:81    Remove: [INBOX], Add: [INBOX]
EmailPageLayout.tsx:756 📦 Emails moved event received: 1 emails
EmailPageLayout.tsx:761 📦 Removed 1 emails from list
EmailPageLayout.tsx:783 📦 Clear selection event received
emailService.ts:1438 📦 Batch applying labels to 1 emails: {add: Array(1), remove: Array(1)}
usePagination.ts:357 📋 Pagination useEffect triggered: {activeTab: 'spam', labelName: null, isGmailSignedIn: true, isGmailInitializing: false, tabChanged: false, …}
usePagination.ts:377 📋 Skipping reset - no actual change (just re-render)
labels.ts:648 🔍 Resolving 1 messages to full thread message IDs...
labels.ts:687 📧 Found 1 unique threads from 1 messages
labels.ts:705 ✅ Resolved to 1 total message IDs (from 1 threads)
labels.ts:753 📦 Applying labels to 1 messages (from 1 input IDs)
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/batchModify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 400 (Bad Request)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
labels.ts:776 Error batch applying labels to Gmail messages: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}body: "{\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Cannot both add and remove the same label\",\n    \"errors\": [\n      {\n        \"message\": \"Cannot both add and remove the same label\",\n        \"domain\": \"global\",\n        \"reason\": \"invalidArgument\"\n      }\n    ],\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n"headers: {content-encoding: 'gzip', content-length: '181', content-type: 'application/json; charset=UTF-8', date: 'Tue, 27 Jan 2026 13:11:42 GMT', server: 'ESF', …}result: {error: {…}}status: 400statusText: null[[Prototype]]: Object
batchApplyGmailLabels @ labels.ts:776
await in batchApplyGmailLabels
batchApplyGmailLabels @ gapiService.ts:1842
batchApplyLabelsToEmails @ emailService.ts:1444
await in batchApplyLabelsToEmails
(anonymous) @ Layout.tsx:141
(anonymous) @ EmailDndContext.tsx:198
(anonymous) @ DndContext.tsx:468
batchedUpdates$1 @ react-dom.development.js:26179
handler @ DndContext.tsx:454
handleEnd @ AbstractPointerSensor.ts:253
emailService.ts:1471 Error batch applying labels to emails: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}
batchApplyLabelsToEmails @ emailService.ts:1471
await in batchApplyLabelsToEmails
(anonymous) @ Layout.tsx:141
(anonymous) @ EmailDndContext.tsx:198
(anonymous) @ DndContext.tsx:468
batchedUpdates$1 @ react-dom.development.js:26179
handler @ DndContext.tsx:454
handleEnd @ AbstractPointerSensor.ts:253
Layout.tsx:159 Error moving emails to folder: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}
(anonymous) @ Layout.tsx:159
await in (anonymous)
(anonymous) @ EmailDndContext.tsx:198
(anonymous) @ DndContext.tsx:468
batchedUpdates$1 @ react-dom.development.js:26179
handler @ DndContext.tsx:454
handleEnd @ AbstractPointerSensor.ts:253
