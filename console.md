gapiService.ts:1821 📋 Fetched 43 message IDs for query "in:trash"
mutations.ts:26 Moving message 19b7856e104277af to trash
mutations.ts:26 Moving message 19b74978e184ff55 to trash
mutations.ts:26 Moving message 19b7088d6ab7b90a to trash
mutations.ts:26 Moving message 19b60a53b03a5b1b to trash
mutations.ts:26 Moving message 19b4fc444e902407 to trash
mutations.ts:26 Moving message 19b4d98c5a3ff245 to trash
mutations.ts:26 Moving message 19b4a66f1566d240 to trash
mutations.ts:26 Moving message 19b370d9564317ec to trash
mutations.ts:26 Moving message 19b358eb4c2da237 to trash
mutations.ts:26 Moving message 19b3153a86a2bb13 to trash
mutations.ts:26 Moving message 19b30fa341cee24b to trash
mutations.ts:26 Moving message 19b2bea6261e127f to trash
mutations.ts:26 Moving message 19b2aed6a4fa42be to trash
mutations.ts:26 Moving message 19b28c47274049f4 to trash
mutations.ts:26 Moving message 19b27ab162352d16 to trash
mutations.ts:26 Moving message 19b27899102eed6c to trash
mutations.ts:26 Moving message 19b26a8127a28f46 to trash
mutations.ts:26 Moving message 19b269a45edcc82e to trash
mutations.ts:26 Moving message 19b26914dbb8d7ed to trash
mutations.ts:26 Moving message 19b236200fb62884 to trash
mutations.ts:26 Moving message 19b22eb8450922a7 to trash
mutations.ts:26 Moving message 19b21ce7c4ff936b to trash
mutations.ts:26 Moving message 19b1d4a661d4fe90 to trash
mutations.ts:26 Moving message 19b1c5a116ce113a to trash
mutations.ts:26 Moving message 19b1bd38343fc14b to trash
mutations.ts:26 Moving message 19b18b1aa1d41a38 to trash
mutations.ts:26 Moving message 19b182348cd83f66 to trash
mutations.ts:26 Moving message 19b11f1bf137fb6c to trash
mutations.ts:26 Moving message 19b0fba639a933b7 to trash
mutations.ts:26 Moving message 19b0f4e791e95fe4 to trash
mutations.ts:26 Moving message 19b08878d205eca0 to trash
mutations.ts:26 Moving message 19b07caf659e0026 to trash
mutations.ts:26 Moving message 19b07add6fe3b49f to trash
mutations.ts:26 Moving message 19b07207a264dbaa to trash
mutations.ts:26 Moving message 19b02c34bdc68418 to trash
mutations.ts:26 Moving message 19b02b91ae091e4c to trash
mutations.ts:26 Moving message 19b025f5567b13a2 to trash
mutations.ts:26 Moving message 19b021d39f4148eb to trash
mutations.ts:26 Moving message 19b01ef1505a6a48 to trash
mutations.ts:26 Moving message 19aef4ba53549ea2 to trash
mutations.ts:26 Moving message 19ae9c7d6b29c5a4 to trash
mutations.ts:26 Moving message 19ae9b0537db61a8 to trash
mutations.ts:26 Moving message 19ac39bd8bda48f8 to trash
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b269a45edcc82e/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b1c5a116ce113a/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b3153a86a2bb13/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b021d39f4148eb/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
EmailPageLayout.tsx:1479 Error emptying trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
onClick @ EmailPageLayout.tsx:1479
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b236200fb62884/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19ae9b0537db61a8/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b26914dbb8d7ed/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b07caf659e0026/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b370d9564317ec/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19aef4ba53549ea2/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b358eb4c2da237/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b182348cd83f66/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b28c47274049f4/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19ac39bd8bda48f8/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b02c34bdc68418/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:37 Successfully moved message 19b74978e184ff55 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b74978e184ff55 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b7856e104277af to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b7856e104277af to trash and cleared caches
mutations.ts:37 Successfully moved message 19b7088d6ab7b90a to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b7088d6ab7b90a to trash and cleared caches
mutations.ts:37 Successfully moved message 19b60a53b03a5b1b to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b60a53b03a5b1b to trash and cleared caches
mutations.ts:37 Successfully moved message 19b0f4e791e95fe4 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b0f4e791e95fe4 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b22eb8450922a7 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b22eb8450922a7 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b11f1bf137fb6c to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b11f1bf137fb6c to trash and cleared caches
mutations.ts:37 Successfully moved message 19b2bea6261e127f to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b2bea6261e127f to trash and cleared caches
mutations.ts:37 Successfully moved message 19b21ce7c4ff936b to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b21ce7c4ff936b to trash and cleared caches
mutations.ts:37 Successfully moved message 19ae9c7d6b29c5a4 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19ae9c7d6b29c5a4 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b4fc444e902407 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b4fc444e902407 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b4a66f1566d240 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b4a66f1566d240 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b4d98c5a3ff245 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b4d98c5a3ff245 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b01ef1505a6a48 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b01ef1505a6a48 to trash and cleared caches
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b07add6fe3b49f/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:37 Successfully moved message 19b08878d205eca0 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b08878d205eca0 to trash and cleared caches
mutations.ts:37 Successfully moved message 19b30fa341cee24b to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b30fa341cee24b to trash and cleared caches
mutations.ts:37 Successfully moved message 19b1bd38343fc14b to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b1bd38343fc14b to trash and cleared caches
mutations.ts:37 Successfully moved message 19b27899102eed6c to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b27899102eed6c to trash and cleared caches
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b26a8127a28f46/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:37 Successfully moved message 19b025f5567b13a2 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b025f5567b13a2 to trash and cleared caches
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b0fba639a933b7/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b2aed6a4fa42be/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b07207a264dbaa/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b27ab162352d16/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b18b1aa1d41a38/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
cb=gapi.loaded_0?le=scs:171  POST https://content-gmail.googleapis.com/gmail/v1/users/me/messages/19b02b91ae091e4c/modify?alt=json&key=AIzaSyDJODAHdwEvT7d4W4DTyi3yWOozgGwqjDE 429 (Too Many Requests)
ai @ cb=gapi.loaded_0?le=scs:171
h @ cb=gapi.loaded_0?le=scs:171
bi @ cb=gapi.loaded_0?le=scs:172
(anonymous) @ cb=gapi.loaded_0?le=scs:172
d @ cb=gapi.loaded_0?le=scs:130
b @ cb=gapi.loaded_0?le=scs:126
mutations.ts:37 Successfully moved message 19b1d4a661d4fe90 to trash
emailService.ts:326 Clearing all email caches (memory + localStorage)
emailService.ts:1084 Successfully moved email 19b1d4a661d4fe90 to trash and cleared caches
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
mutations.ts:39 Error moving message to trash: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
markGmailMessageAsTrash @ mutations.ts:39
await in markGmailMessageAsTrash
markGmailMessageAsTrash @ gapiService.ts:1851
deleteEmail @ emailService.ts:1079
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
emailService.ts:1086 Error deleting email: {result: {…}, body: '{\n  "error": {\n    "code": 429,\n    "message": "To…\n    ],\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}\n', headers: {…}, status: 429, statusText: null}
deleteEmail @ emailService.ts:1086
await in deleteEmail
(anonymous) @ EmailPageLayout.tsx:1472
onClick @ EmailPageLayout.tsx:1472
await in onClick
callCallback2 @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
