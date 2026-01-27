Issue: Optimistic move removed email from list although it's still there when i refresh. It shouldn't remove email from the list because it applies both labels.

📋 Skipping reset - no actual change (just re-render)
EmailItemContent.tsx:18 📧 Email 19bf08830cd493d0 has hasDraftInThread: true prop: undefined
EmailItemContent.tsx:18 📧 Email 19bcc2720c4b0f5d has hasDraftInThread: true prop: undefined
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
b @ cb=gapi.loaded_0?le=scs:126Understand this error
labels.ts:776 Error batch applying labels to Gmail messages: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}body: "{\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Cannot both add and remove the same label\",\n    \"errors\": [\n      {\n        \"message\": \"Cannot both add and remove the same label\",\n        \"domain\": \"global\",\n        \"reason\": \"invalidArgument\"\n      }\n    ],\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n"headers: {content-encoding: 'gzip', content-length: '181', content-type: 'application/json; charset=UTF-8', date: 'Tue, 27 Jan 2026 13:23:33 GMT', server: 'ESF', …}result: {error: {…}}status: 400statusText: null[[Prototype]]: Object
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
handleEnd @ AbstractPointerSensor.ts:253Understand this error
emailService.ts:1471 Error batch applying labels to emails: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}
batchApplyLabelsToEmails @ emailService.ts:1471
await in batchApplyLabelsToEmails
(anonymous) @ Layout.tsx:141
(anonymous) @ EmailDndContext.tsx:198
(anonymous) @ DndContext.tsx:468
batchedUpdates$1 @ react-dom.development.js:26179
handler @ DndContext.tsx:454
handleEnd @ AbstractPointerSensor.ts:253Understand this error
Layout.tsx:159 Error moving emails to folder: {result: {…}, body: '{\n  "error": {\n    "code": 400,\n    "message": "Ca… }\n    ],\n    "status": "INVALID_ARGUMENT"\n  }\n}\n', headers: {…}, status: 400, statusText: null}
(anonymous) @ Layout.tsx:159
await in (anonymous)
(anonymous) @ EmailDndContext.tsx:198
(anonymous) @ DndContext.tsx:468
batchedUpdates$1 @ react-dom.development.js:26179
handler @ DndContext.tsx:454
handleEnd @ AbstractPointerSensor.ts:253Understand this error
EmailItemContent.tsx:18 📧 Email 19bf08830cd493d0 has hasDraftInThread: true prop: undefined
EmailItemContent.tsx:18 📧 Email 19bcc2720c4b0f5d has hasDraftInThread: true prop: undefined