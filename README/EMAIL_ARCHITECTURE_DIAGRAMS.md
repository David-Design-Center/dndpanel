# Email System Architecture Visualization

## Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EmailPageLayout.tsx                          │
│              (Component State - 26+ Arrays)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  allTabEmails:                                                  │
│  ├─ all:       [Email1, Email2, Email3, ...]      ← 20 items   │
│  ├─ unread:    [Email2, Email4, ...]              ← 10 items   │
│  ├─ sent:      [Email5, Email6, ...]              ← 5 items    │
│  ├─ trash:     [Email1, Email7, Email8, ...]      ← 12 items   │
│  ├─ spam:      [Email9, ...]                      ← 3 items    │
│  └─ ...9 more                                                   │
│                                                                 │
│  categoryEmails: { all, archive, spam, trash } ×               │
│  ├─ all:   { primary: [...], updates: [...], ...} ← 16 arrays  │
│  ├─ archive: [...]                                             │
│  ├─ spam:    [...]                                             │
│  └─ trash:   [...]                                             │
│                                                                 │
│  ⚠️ PROBLEM: Email1 exists in 4 places simultaneously!        │
│              Same object, or duplicated?                        │
│              When moved/deleted, sync manually to all arrays   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
             ▲                                       ▲
             │ Fetch & Store                        │ Display & Filter
             │ (risk: wrong data)                   │ (too late to fix)
             │                                       │
┌────────────┴──────────────────────────────────────┴──────────┐
│                    EmailService.ts                           │
│              (Service Layer - Multiple Fetchers)             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  getUnreadEmails()        → Query: "is:unread after:..."   │
│  getSentEmails()          → labelIds: ['SENT']             │
│  getTrashEmails()         → labelIds: ['TRASH']            │
│  getArchiveEmails()       → Query: "-in:inbox -in:..."     │
│  getAllInboxEmails()      → Query: "after:... -in:sent..."  │
│  getCategoryEmailsForFolder() → 4 parallel category queries │
│                                                              │
│  ⚠️ PROBLEM: Queries overlap! No dedup!                    │
│              Cache shared across queries                    │
│              Results not validated                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
             ▲
             │
             │ Fetch Results (can overlap)
             │
┌────────────┴────────────────────────────┐
│      Gmail API                          │
│  (Source of Truth)                      │
├─────────────────────────────────────────┤
│  INBOX:  messages with labelIds:["INBOX"]
│  TRASH:  messages with labelIds:["TRASH"]
│  SENT:   messages with labelIds:["SENT"]
│                                        │
│  Real Counts:                         │
│  ├─ INBOX:  20 messages               │
│  ├─ TRASH:  12 messages               │
│  ├─ SENT:   5 messages                │
│  └─ UNREAD: 10 messages               │
│                                        │
└────────────────────────────────────────┘
```

## Data Flow: Why Trash Shows 24

```
Step 1: App loads
  └─ fetchAllEmailTypes()
      ├─ await getSentEmails()        → labelIds: ['SENT']    → Returns 5 emails ✓
      ├─ await getTrashEmails()       → labelIds: ['TRASH']   → Returns 12 emails ✓
      ├─ await getAllInboxEmails()    → Query: "after:..."    → Returns 20 emails ✓
      └─ await getUnreadEmails()      → Query: "is:unread..." → Returns 10 emails ✓
      
      Result: allTabEmails = {
        sent: [5 emails],
        trash: [12 emails],          ← CORRECT HERE
        all: [20 emails],
        unread: [10 emails]
      }

Step 2: Category fetch also runs
  └─ fetchCategoryEmails()
      ├─ getCategoryEmailsForFolder('primary', 'trash') → Query: "category:primary in:trash"
      │  └─ Returns 12 emails (same 12 as above)
      │
      └─ getCategoryEmailsForFolder('updates', 'trash') → Query: "category:updates in:trash"
         └─ Returns 0 emails (updates not in trash)
         
      Result: categoryEmails.trash = {
        primary: [12 emails],        ← SAME EMAILS as allTabEmails.trash
        updates: [],
        promotions: [],
        social: []
      }

Step 3: Load more (pagination click)
  └─ handleNextPage('trash')
      ├─ Current pageIndex: 0
      ├─ New pageIndex: 1
      ├─ Checks: needsFetch? → YES (if currentPageToken exists)
      └─ await loadMoreForTab('trash', { ... })
         └─ getTrashEmails(false, 20, pageToken)
            └─ labelIds: ['TRASH'] maxResults: 20
            └─ BUT: If pagination uses wrong token or query...
            └─ Or if same emails fetched again without dedup...
            └─ Result might be: [12 original + 12 duplicates] = 24 ❌

Step 4: Display
  └─ render visibleEmails for 'trash' tab
      ├─ allTabEmails.trash has 24 items (duplicated)
      └─ Shows: "Showing 1-20 of 24" ❌
         Should show: "Showing 1-12 of 12" ✓
```

## The Cache Problem

```
┌─────────────────────────────────────────────────────────────┐
│              emailCache Object (Single)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  emailCache = {                                             │
│    list?: {                      ← ONLY ONE!               │
│      emails: [...],              ← Gets overwritten        │
│      timestamp: 1700000000,                                │
│      query: "???",               ← Stores query but...     │
│      nextPageToken: "abc123"                               │
│    }                                                       │
│    details: { id: Email, ... },  ← Per-email cache        │
│    threads: { id: Thread, ... }  ← Per-thread cache       │
│  }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Sequence:
1. Call getSentEmails()
   └─ emailCache.list = { emails: [5 sent], query: "label:SENT", ... }

2. Call getUnreadEmails()
   └─ emailCache.list = { emails: [10 unread], query: "is:unread...", ... }
   
3. Call getSentEmails() again (maybe from another component)
   └─ Finds emailCache.list!
   └─ Returns [10 unread emails] ❌ (WRONG!)
   └─ Should return [5 sent emails] ✓
```

## Proposed Solution: Single Source of Truth

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EmailPageLayout.tsx                              │
│                  (Component State - Clean)                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  emailRepository: EmailRepository                                    │
│  ├─ masterEmails: Map<string, Email>  ← SINGLE SOURCE OF TRUTH     │
│  │   {                                                              │
│  │     'email1': Email{ id, labels: ['INBOX', 'IMPORTANT'], ...}, │
│  │     'email2': Email{ id, labels: ['TRASH'], ...},              │
│  │     ...                                                          │
│  │   }                                                              │
│  │                                                                   │
│  ├─ indices: {                                                      │
│  │   INBOX: Set['email1', 'email2', ...],   ← Reverse index       │
│  │   TRASH: Set['email2', 'email3', ...],                          │
│  │   SENT: Set['email4', ...],                                     │
│  │   ...                                                            │
│  │ }                                                                │
│  │                                                                   │
│  ├─ getAllInboxEmails() → DERIVED (computed)                       │
│  │   return Array.from(indices.INBOX)                              │
│  │          .filter(id => !indices.TRASH.has(id))                 │
│  │                                                                   │
│  ├─ getSentEmails() → DERIVED (computed)                           │
│  │   return Array.from(indices.SENT)                              │
│  │                                                                   │
│  ├─ deleteEmail(id) → ATOMIC                                       │
│  │   1. masterEmails.delete(id)                                    │
│  │   2. FOR each label: indices[label].delete(id)                 │
│  │   3. Call Gmail API                                              │
│  │   4. ALL views now see updated data (auto-derived)             │
│  │                                                                   │
│  └─ moveEmail(id, from, to) → ATOMIC                              │
│      1. Validate email exists                                      │
│      2. Update labels in masterEmail                              │
│      3. Update indices for from/to                                │
│      4. Call Gmail API                                              │
│      5. Done - all views updated (auto-derived)                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Fix Paths Comparison

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         THREE PATHS TO FIX (30 min each)                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ PATH A: Fix at Source (Service Layer)                                          │
│ ──────────────────────────────────────────                                     │
│ Location: src/services/emailService.ts                                         │
│                                                                                 │
│ Changes:                                                                        │
│ ├─ Add deduplication to getEmails()                                            │
│ ├─ Add deduplication to getEmailsByLabelIds()                                  │
│ ├─ Fix query logic for Archive                                                 │
│ ├─ Make cache per-query not global                                             │
│ ├─ Add result validation (no label conflicts)                                  │
│ └─ Add counts validation (vs. expected)                                        │
│                                                                                 │
│ Effort: 40 lines changed                                                       │
│ Risk: LOW (only affects service layer)                                         │
│ Benefit: Immediate fix, all components inherit fix                             │
│ Downside: Still multiple arrays in component                                   │
│                                                                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ PATH B: Fix at Component (State Architecture)                                  │
│ ───────────────────────────────────────────────                                │
│ Location: src/components/email/EmailPageLayout.tsx                             │
│                                                                                 │
│ Changes:                                                                        │
│ ├─ Replace allTabEmails with single masterEmails array                         │
│ ├─ Replace categoryEmails with indices Map                                     │
│ ├─ Make all views derived (computed) not stored                                │
│ ├─ Update delete/move to only touch master                                     │
│ └─ Update render logic to use derived views                                    │
│                                                                                 │
│ Effort: 300 lines changed                                                      │
│ Risk: MEDIUM (component-wide refactor)                                         │
│ Benefit: Clean architecture, easy to maintain, all bugs gone                   │
│ Downside: Larger change, more test needed                                      │
│                                                                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ PATH C: Fix Cache (Quick Win)                                                  │
│ ────────────────────────────                                                   │
│ Location: src/services/emailService.ts (cache section only)                    │
│                                                                                 │
│ Changes:                                                                        │
│ ├─ Change cache from single object to Map<query, CacheEntry>                   │
│ ├─ Add query normalization/hashing                                             │
│ ├─ Add TTL validation                                                          │
│ ├─ Add deduplication on retrieval                                              │
│ └─ Add profile isolation                                                       │
│                                                                                 │
│ Effort: 80 lines changed                                                       │
│ Risk: LOW-MEDIUM (isolated to cache logic)                                     │
│ Benefit: Fixes most immediate duplication                                      │
│ Downside: Doesn't fix underlying architectural issue                           │
│                                                                                 │
└──────────────────────────────────────────────────────────────────────────────────┘

RECOMMENDATION: Start with PATH A (Fix at Source)
  → Quickest win, lowest risk
  → If that doesn't fully fix it, move to PATH B
```

