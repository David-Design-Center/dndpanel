# Email Fetching Deep Dive

This document explains how the app fetches and renders emails today, covering data sources, caching, pagination, and UI behavior. It also highlights recent updates to unify Inbox as “All Mail except Sent/Trash/Spam,” fix Sent/Drafts loading, and improve loading UX.

## High-level flow

- UI asks for emails by tab (Inbox All, Unread, Sent, Drafts, Starred, Important, Spam, Trash, Archive, All Mail).
- Data is fetched via Gmail API through two strategies:
  - Search query strategy (messages.list with `q`), used for "All Mail" style queries.
  - LabelIds strategy (messages.list with `labelIds`), used for system folders like INBOX, SENT, STARRED, SPAM, TRASH, IMPORTANT, and Gmail categories.
- Drafts use a separate endpoint: users.drafts.list + users.drafts.get.
- Results are cached in-memory and in localStorage for fast refreshes, then rendered in `EmailPageLayout`.

## Key modules

- `src/services/emailService.ts`
  - Core helpers for fetching emails by query or labelIds, and specialized functions per tab.
  - Unified Inbox (`getAllInboxEmails`) now uses query: `-in:sent -in:trash -in:spam`.
  - Sent (`getSentEmails`) uses `labelIds: ['SENT']`.
  - Drafts (`getDraftEmails`) uses `users.drafts.list` + `users.drafts.get`.
  - Starred/Important/Spam/Trash use their respective labelIds for performance.
  - Categories helpers (Updates/Social) use `CATEGORY_*` labelIds if needed internally.
- `src/services/optimizedInitialLoad.ts`
  - Performance-optimized first paint. Initially fetches primary unread/recent IDs, then batches metadata.
  - We now warm-replace that primary-only list with the unified Inbox (All Mail minus sent/trash/spam) right after first paint for accuracy.
- `src/components/email/EmailPageLayout.tsx`
  - Owns tab state and renders lists.
  - Loads critical data, then replaces Inbox with unified list.
  - Loads Sent/Drafts/Important/Starred/Archive on-demand when their tab is opened.
  - Applies chip filters only to Inbox All.
  - Shows a loading overlay whenever a tab is empty and a fetch is in-flight (new).

## Caching & concurrency

- In-memory cache and localStorage keyed by query are used for search-based calls.
- `getEmailsByLabelIds` bypasses the text query cache and fetches by labels.
- Request queue/limiter prevents concurrent Gmail 429 errors.

## Tabs to data sources

- Inbox All: `getAllInboxEmails()` → `q = -in:sent -in:trash -in:spam` (unified All Mail)
- Unread: same source as Inbox, client-side filtered `!isRead`.
- Sent: `labelIds: ['SENT']`.
- Drafts: `users.drafts.list` + `users.drafts.get` and paginated client-side.
- Starred: `labelIds: ['STARRED']`.
- Important: `labelIds: ['IMPORTANT']`.
- Spam: `labelIds: ['SPAM']`.
- Trash: `labelIds: ['TRASH']`.
- Archive: query `-in:inbox -in:spam -in:trash`.
- All Mail: query `-in:spam -in:trash`.

## Pagination

- Search-based queries return `nextPageToken` and are fetched directly with `getEmails()`.
- Label-based pages use `getEmailsByLabelIds()` and track `nextPageToken` similarly.
- Drafts endpoint doesn’t expose a page token; we paginate locally by slicing in batches of 20.
- First-load placeholder tokens like `'has-more'` are sanitized before real fetches (avoids empty Sent on first open).

## Loading UX (new)

- A full overlay appears while a tab's list is empty and a fetch is in-flight:
  - Shown for Inbox, Sent, Drafts, Trash, Starred, etc.
  - Prevents “No emails” flicker.

## Chip filters

- Chips (Unread/Starred/Attachments) apply only to Inbox All.
- Other tabs show their raw datasets to avoid hiding results unintentionally.

## Known behaviors and guardrails

- The initial optimized load fetches primary unread/recent to paint fast, then we replace the Inbox with the unified query results.
- If Gmail auth isn’t ready, fetchers return empty sets; the UI now clearly shows a loading overlay until the first list is available.
- Most functions tolerate missing `nextPageToken` and continue with empty arrays; errors are logged, not thrown, to reduce user disruption.

## Future improvements

- Consider switching unified Inbox to a labelIds-based "All Mail" surrogate if Gmail adds a label for All Mail.
- Add a dedicated “Loading…” skeleton list for better perceived performance.
- Track in-flight states per tab to show partial loaders when switching quickly across tabs.
- Add retry/backoff UI on fetch failures.
