# Gmail Client Battle Plan

## Objective
Replace every direct `window.gapi.client.gmail.*` call with requests that flow through Supabase edge functions (or another trusted backend), so the browser never holds short-lived Workspace domain-wide delegation tokens. This inventory captures each place the frontend currently reaches into the Gmail API, the role it plays, and the migration action we need to take.

## High-Level Strategy
- **Create/extend Gmail proxy functions** in Supabase for each capability we still need (messages, drafts, labels, vacation settings, etc.). Reuse the existing domain-wide delegation flow on the server side so tokens are minted per request and kept off the client.
- **Replace client helpers** so React components/services call the proxy instead of `window.gapi`. Keep any existing request queuing, caching, and UI state logic, but swap the transport layer.
- **Delete GIS/gapi wiring** in the browser once every code path uses the proxy. This removes the hourly token expiry and simplifies auth state.

## Inventory Of Direct Gmail Calls
The sections below group calls by file. Each bullet lists the function, the Gmail endpoint, its current job, and the migration action.

### src/integrations/gapiService.ts (core Gmail helper)
- `fetchGmailMessages` (`messages.list`, `messages.get`) — Inbox/label fetcher with per-message metadata fetch and snippet decoding. **Action:** move listing + metadata hydrate into edge function (batched where possible); client calls proxy and removes token gating.
- `fetchGmailMessageById` (`messages.get`, `messages.modify`) — Full message fetch, inline image processing, and mark-as-read side effect. **Action:** expose a server endpoint that returns hydrated message + performs label mutation when requested.
- `fetchLatestMessageInThread` (`threads.get`) — Pulls most recent message ID, then calls `fetchGmailMessageById`. **Action:** have backend thread endpoint support “latest only” variant so client just requests it once.
- `fetchThreadMessages` (`threads.get`) — Full thread fetch + per-message hydration. **Action:** reuse server-side `fetch-gmail-thread` (or extend) to return complete thread payload; drop client recursion.
- `getAttachmentDownloadUrl`, `processInlineImages` helpers (`messages.attachments.get`) — Fetches attachment bodies to build blob URLs/data URIs. **Action:** stream attachments through backend (signed URLs or direct download proxy) so client never hits Gmail attachments endpoint.
- `sendGmailMessage` (`messages.send`) — Builds MIME message and sends directly. **Action:** create server “send” endpoint that accepts composed MIME/base64 payload; let backend call Gmail.
- `saveGmailDraft` (`drafts.update`, `drafts.create`) — Saves or updates drafts with rich MIME construction. **Action:** move draft save/update into backend function mirroring send flow.
- `deleteGmailDraft` (`drafts.delete`) — Removes draft. **Action:** backend mutation endpoint.
- `fetchGmailLabels` (`labels.list`, `labels.get`) — Retrieves label list and detailed counts. **Action:** migrate to backend, retaining throttling/caching logic server side or returning basic data while UI caches.
- `createGmailLabel`, `updateGmailLabel`, `deleteGmailLabel` (`labels.create`, `.update`, `.delete`) — CRUD for labels. **Action:** expose label management endpoints server side.
- Label state helpers (`applyGmailLabels`, `markGmailMessageAsTrash`, `markGmailMessageAs{Read,Unread,Starred,Unstarred,Important,Unimportant}` — all call `messages.modify`). **Action:** consolidate into backend label/flag mutation endpoint so UI just posts desired add/remove ids.
- `emptyGmailTrash` (`messages.list` with `q=in:trash`) + follow-up delete loop — Empties trash. **Action:** backend job that lists + deletes, shielding client from iterative Gmail deletes.

### src/services/emailService.ts (legacy inbox pages)
- `getDraftEmails` (`drafts.list`, `drafts.get`) — Legacy draft reader. **Action:** point at new draft proxy or reuse optimized service once backend exists.
- `getEmailsByLabelIds` (`messages.list`, `messages.get`) — Shared label fetcher for category tabs. **Action:** swap to backend list endpoint; reuse metadata hydration server side.

### src/services/optimizedInitialLoad.ts (performance-focused loader)
- `fetchMessagesByLabelIds` (`messages.list`) + `fetchMessageMetadataBatch` (`messages.get`) — Optimized unread/recent fetch path. **Action:** collapse into backend “list + metadata” proxy.
- `fetchLabelsOptimized` (`labels.list`) — Cached label fetch. **Action:** migrate to backend and share response via context/store.
- `getInboxUnreadCount` (`messages.list` with `labelIds`) — Quick unread counter. **Action:** backend counter endpoint (can reuse same list call server side).

### src/services/searchService.ts
- `searchGmailAPI` (`messages.list`, `messages.get`) — Fallback Gmail search when Cloud Search unavailable. **Action:** create search proxy endpoint that accepts query and returns normalized results.

### src/services/gmailVacationService.ts
- `getGmailVacationSettings` (`users.settings.getVacation`)
- `updateGmailVacationSettings` (`users.settings.updateVacation`)
  **Action:** move vacation responder get/set into backend (same Supabase function that holds DWD credentials).

### src/contexts/LabelContext.tsx
- `fetchInboxUnreadSinceCutoff` (`messages.list` with query)
- `fetchDraftTotal` (`drafts.list`)
  **Action:** call future backend counters instead of hitting Gmail directly inside React context.

### src/utils/gmailLabelTests.ts
- `testGmailApiCall` (`messages.list`) — Manual test harness for label validation. **Action:** either retire once backend exists or have it hit the proxy for debugging.

### README/INBOX_UNREAD_COUNTER_DIAGNOSIS.md (diagnostic script)
- Sample snippet uses `window.gapi.client.gmail.users.messages.get` in documentation. **Action:** update docs to describe new proxy workflow once code migrates.

## Migration Work Breakdown
1. **Backend coverage:** ensure Supabase functions (or a new unified Gmail service) expose endpoints for: message list/detail, thread detail, send, drafts CRUD, labels CRUD, label mutations, settings, attachments, trash emptying, counters, and search.
2. **Client refactor:** replace each helper listed above with fetchers hitting the backend. Preserve existing queuing/caching by moving logic above the network boundary.
3. **Token cleanup:** remove `isGmailSignedIn`, `setAccessToken`, and other GIS-dependent state once no frontend path touches Gmail directly.
4. **Docs & tooling:** update README guides and any manual scripts/tests to use the proxy endpoints.

## Notes
- Several flows (optimized loader, legacy services, contexts) can share the same backend endpoints once created; plan to deduplicate client helpers after migration.
- Attachment download strategy needs special care: consider signed URLs that stream from Supabase storage or a passthrough edge function with size limits.
- Build automated smoke tests (even simple curl scripts) against the new backend endpoints to catch token expiry regressions early.
