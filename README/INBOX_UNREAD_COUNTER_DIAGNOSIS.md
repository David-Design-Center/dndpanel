# Inbox Unread (Last 24h) Counter – Reverse Engineering & Diagnosis

Date: 2025-09-18

## Goal
Provide a **single, authoritative explanation** of why the Inbox badge shows `0` while Gmail system label counts (INBOX: 21, etc.) clearly indicate unread mail exists, and why the retry loop keeps firing. Define a minimal, low‑risk corrective plan without touching a “million files”.

---
## TL;DR (Executive Summary)
The counter logic is now *decoupled* from the already-working optimized inbox preload pipeline and fires **before it has trustworthy per‑message timestamps**. When it does run, it:
1. Produces `0` (because reused metadata set is missing usable `date` / internalDate or not yet wired properly).
2. Detects mismatch (`systemCounts.INBOX > 0`) and schedules a retry.
3. Retries indefinitely because each retry still sees no timestamped unread messages inside the reused structure.

So the issue is **not** that unread mails are missing—it's that the 24h derivation layer never receives valid time data to filter by and never bails out after a finite number of zero retries.

---
## Reverse Engineered Flow (Current State)
```
Login → Optimized Initial Load (loadCriticalInboxData)
  • Provides: unreadList.emails (objects with .isRead, .id, .subject, .date?)
  • Logs: "📧 Critical data loaded: X unread ..."
  • Dispatches: unread-metadata-ready (our added event)

Label Fetch → Updates systemCounts (INBOX=21, etc.)

LabelContext.refreshRecentCounts()
  • Gated until unread-metadata-ready (OK)
  • Reuses __latestUnreadMeta.unreadIds
     - Attempts to read cached email.date via window.emailCache.details[id].email.date
     - If missing, fetches messages.get(format=minimal) for each id
       (BUT minimal response was read using r.internalDate – may not exist at root; Gmail returns { result: { internalDate } } or needs r.result.internalDate depending on wrapper)
  • internalDate parse fails silently → inboxUnread24h remains 0
  • Since systemCounts.INBOX > 0 → schedules retry (every cycle)

FoldersColumn renders badge using recentCounts.inboxUnread24h (0)
Retry loop continues → repeated logs:
  "🔁 Retrying recentCounts precise scan after initial zero"
```

### Key Observations
| Area | Observation | Impact |
|------|-------------|--------|
| Event Data | `unread-metadata-ready` only sends IDs / count; does not guarantee each ID has a resolvable date in cache. | Requires fallback fetches. |
| Metadata Fetch | Using `messages.get(format='minimal')` and reading `r.internalDate`; actual structure may be `r.result.internalDate`. | Dates end up `undefined`. |
| Date Source | Trying first `email.date` property; format must be RFC/ISO. If not present or not cached yet, we rely solely on failing minimal call. | Yields zero. |
| Retry Strategy | Fires every time zero & INBOX > 0, with no max attempt or success exit condition. | Infinite loop. |
| Scope Creep | Logic expanded while underlying requirement is simple: *Unread last 24h.* | Complexity masks root issue. |

---
## Root Causes
1. **Incorrect extraction of `internalDate` from Gmail API response** – likely using the wrong property path (`r.internalDate` vs `r.result.internalDate`).
2. **Missing or unreliable `email.date` for unread items before full hydration.**
3. **No cap / exit strategy on zero‑result retries** → runaway retry loop.
4. **Over-eager precise scan** executes even though the *quick path* (system label unread total) could at least seed a non-zero badge until precise data is ready.

---
## Minimal Fix Strategy (Lean & Safe)
| Step | Action | Effort | Risk | Benefit |
|------|--------|--------|------|---------|
| 1 | Stop infinite retries: add maxRetry (e.g. 2) & backoff. | Low | Very Low | Halts noise. |
| 2 | Correct internalDate parsing from `messages.get` response. | Low | Low | Enables actual counting. |
| 3 | If after parsing timestamps count is still 0 but systemCounts.INBOX > 0, fall back to showing systemCounts.INBOX (flagged as approximate) until a successful precise pass occurs. | Low | Low | User sees non-zero immediately. |
| 4 | Defer precise scan until either: (a) at least one unread email object has a valid `date`, OR (b) we successfully fetched minimal metadata for all unread IDs. | Medium | Low | Eliminates wasted scans. |
| 5 | Cache per-ID timestamp map in memory to avoid re-fetching on subsequent refreshes in same session. | Low | Low | Efficiency improvement. |

Optional future (not required for correctness now): Persist the timestamp map between sessions (localStorage) and prune entries older than 24h every boot.

---
## Proposed Implementation Outline
```ts
// In LabelContext
const unreadTimestampsRef = useRef<Record<string, number>>({});
const recentRetryRef = useRef(0);
const MAX_ZERO_RETRIES = 2;

function extractInternalDate(resp:any) {
  const raw = resp?.result?.internalDate || resp?.internalDate; // guard for structure
  const ts = raw ? parseInt(raw, 10) : NaN;
  return isNaN(ts) ? null : ts;
}

async function ensureTimestamps(ids: string[]) {
  const missing = ids.filter(id => unreadTimestampsRef.current[id] == null);
  if (!missing.length) return;
  const detailResponses = await Promise.all(missing.map(id => window.gapi.client.gmail.users.messages.get({ userId:'me', id, format:'minimal' })
    .then(r => extractInternalDate(r))
    .catch(() => null)));
  detailResponses.forEach((ts, idx) => { if (ts) unreadTimestampsRef.current[missing[idx]] = ts; });
}

async function computeInbox24h(ids: string[]): Promise<number> {
  await ensureTimestamps(ids);
  const cutoff = Date.now() - 24*60*60*1000;
  return ids.reduce((acc, id) => acc + (unreadTimestampsRef.current[id] >= cutoff ? 1 : 0), 0);
}

// Refresh logic
if (unreadMetaReady && ids.length) {
  const precise = await computeInbox24h(ids);
  if (precise === 0 && systemCounts.INBOX > 0) {
     if (recentRetryRef.current < MAX_ZERO_RETRIES) schedule retry; else use fallbackApprox = systemCounts.INBOX;
  }
}
```

Badge display logic:
```
const displayInbox = recentCounts.inboxUnread24h > 0
  ? recentCounts.inboxUnread24h
  : (recentCounts.approxInboxUnread ?? 0);
```
Add a subtle data attribute `data-approx="true"` when showing fallback.

---
## WHY This Simpler Path Works
- Avoids second full pagination loop (we already *have* the unread IDs from optimized load).
- Adds robustness through layered fallbacks instead of immediate repeated retries.
- Keeps Gmail quota low: only fetch minimal metadata for missing timestamps once.
- Surfaces usable number quickly (approx) while precise gets ready.

---
## Concrete Action List (Patch Order)
1. Add `unreadTimestampsRef`, `recentRetryRef`, and `approxInboxUnread` to state.
2. Implement `extractInternalDate`, `ensureTimestamps`, `computeInbox24h` utilities inside `LabelContext`.
3. Replace current precise loop with reuse-first approach; remove recursive retry scheduling in favor of bounded loop.
4. Update provider value to include `approxInboxUnread` (if needed) or fold into `recentCounts` object.
5. Adjust `FoldersColumn` to fall back to `approxInboxUnread` when precise is zero.
6. Add one-off log summarizing sources: `PRECISION_RESULT { precise, approxUsed, missingTs, retries }`.

---
## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Some unread IDs might disappear (user marks read quickly) before metadata fetch | Harmless; they simply drop out by next refresh. |
| System label count temporarily higher than real 24h unread | Mark as approximate until precise computed. |
| Gmail API errors for metadata | Keep prior precise; rely on approximate fallback; no infinite retries. |

---
## Verification Checklist After Patch
- Login → Badge shows non-zero (approx) if system INBOX unread > 0.
- Within one refresh cycle (a few seconds) badge switches to precise if different.
- No more `🔁 Retrying recentCounts precise scan...` spam beyond 2 retries.
- Log `PRECISION_RESULT` appears with accurate counters.
- Marking a recent unread as read decrements (optimistic) without triggering new metadata fetch.

---
## Conclusion
The unread counter failure is a **timing + data-shape mismatch**, not a lack of unread messages. A lean metadata reuse + bounded fallback design solves it elegantly. Implement the six action steps and remove the infinite retry logic to stabilize.

---
## Next (Optional) Enhancements
- Persist `unreadTimestampsRef` across reloads (localStorage with timestamp pruning).
- Configurable rolling window (e.g. 12h / 48h) via settings.
- Add subtle tooltip: "Unread received in last 24h (precise)" or "~" prefix for approximate.

---
*End of report.*

---
## Update: Simplified Implementation (Adopted)

We replaced the earlier rolling 24h precise logic with a single Gmail search query approach:

Algorithm:
1. Compute date string for (now - 24h) in `yyyy/MM/dd`.
2. Query: `is:unread after:YYYY/MM/DD` with `maxResults=1&fields=resultSizeEstimate`.
3. Use `resultSizeEstimate` directly for the Inbox badge (capped visually if needed).
4. Refresh on: initial load, every 5 minutes, manual force refresh, and optimistic local adjustments (future).

Tradeoffs:
- Pros: 1 API call, no pagination, no metadata fetch, stable and predictable.
- Cons: Boundary is midnight-based (not minute-rolling). Acceptable for current product semantics.
- Estimate accuracy: Gmail's `resultSizeEstimate` is sufficiently reliable for badge usage.

Removed Components:
- Timestamp cache, unread metadata event gating, retry loop, approximate fallback.

Logging:
- `📊 SIMPLE_24H_RESULT` shows `{ inboxUnread24h, draftTotal, query }`.

Rollback Plan:
- If true rolling 24h precision is later required, reintroduce a paginated internalDate scanner behind a feature flag without altering current simple path.

Status: Implemented and active.
