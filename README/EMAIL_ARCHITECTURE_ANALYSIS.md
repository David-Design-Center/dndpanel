# Email Fetching Architecture Analysis & Battle Plan

**Status**: CRITICAL VULNERABILITIES IDENTIFIED  
**Date**: October 18, 2025  
**Scope**: Email list fetching, caching, filtering, pagination, and display system  
**Severity**: HIGH - System will accumulate duplicates and show wrong counts over time  

---

## Executive Summary

The current email system has **fundamental architectural flaws** causing:
1. **Email Bleeding** - Emails appear in multiple categories (trash shows 24 but Gmail shows 12)
2. **Duplicate Entries** - Same email stored multiple times across different tab arrays
3. **Inconsistent Counts** - Displayed counts don't match Gmail API
4. **Cache Corruption** - Old cached data persists across deletions/moves
5. **No Single Source of Truth** - Multiple parallel arrays (allTabEmails, categoryEmails, emails) with no sync mechanism

---

## Root Cause Analysis

### The Core Problem

The system stores emails in **multiple parallel structures** with NO single source of truth:

```
Global State (EmailPageLayout.tsx):
├── allTabEmails (10 tabs × up to N emails each)
├── categoryEmails (4 folder contexts × 4 categories × N emails each)
├── emails (label page emails)
└── emailCache (service layer - also 10+ different caches)

Result: Same email can exist in 3+ places simultaneously
```

**Example of the Bleed:**
- Email with ID `abc123` has both `TRASH` and `INBOX` labels (shouldn't happen)
- fetched into `allTabEmails.trash`
- also fetched into `allTabEmails.all` (because query doesn't exclude it)
- also fetched into `categoryEmails.trash.primary`
- also fetched into `categoryEmails.all.primary`
- When deleted, only removed from 1-2 locations
- Remains in the others, causing "ghost emails"

### Why The Counts Don't Match

**Gmail Trash shows 12, App shows 24:**

1. **Gmail API returns**: 12 emails with `labelIds: ['TRASH']`
2. **App fetches** with query `label:TRASH` → 12 emails ✓
3. **BUT** also fetches with query `in:trash` → 12 emails again ✓
4. **AND** `getArchiveEmails()` uses `-in:inbox -in:spam -in:trash` which returns emails NOT in trash, but...
5. **Cache layer** stores responses keyed by query string
6. **Multiple fetch functions** hit the same emails with different queries
7. **No deduplication** at any layer
8. Result: **24 emails in array, 12 in Gmail**

---

## System Architecture Breakdown

### Layer 1: Service Layer (`src/services/emailService.ts`)

**Current Implementation:**
```
getEmails(query)           ← Generic query fetcher
  ├─ getUnreadEmails()     ← Uses 24h inbox filter
  ├─ getSentEmails()       ← labelIds: ['SENT']
  ├─ getTrashEmails()      ← labelIds: ['TRASH']
  ├─ getSpamEmails()       ← labelIds: ['SPAM']
  ├─ getArchiveEmails()    ← Query: `-in:inbox -in:spam -in:trash`
  ├─ getAllInboxEmails()   ← Uses 24h filter
  ├─ getCategoryEmailsForFolder()
  └─ getLabelEmails()      ← Custom label queries
```

**Problems:**
- ❌ No deduplication logic
- ❌ Multiple queries return overlapping sets
- ❌ `getArchiveEmails()` logic is wrong (`-in:trash` returns some trash)
- ❌ Cache keyed by query string, not normalized
- ❌ "24h filter" in `getAllInboxEmails()` returns stale data
- ❌ `getCategoryEmailsForFolder()` creates 4×4=16 separate queries
- ❌ No validation that labelIds match expected folder

### Layer 2: Component State (`src/components/email/EmailPageLayout.tsx`)

**State Structure:**
```typescript
// 10 separate arrays (ALL)
allTabEmails: {
  all: Email[],        ← Should be: INBOX - SENT - SPAM - TRASH
  unread: Email[],     ← Should be: INBOX + isUnread
  sent: Email[],       ← Should be: labelIds includes SENT
  drafts: Email[],     ← From /drafts endpoint
  trash: Email[],      ← Should be: labelIds includes TRASH
  spam: Email[],       ← Should be: labelIds includes SPAM
  important: Email[],  ← Should be: labelIds includes IMPORTANT
  starred: Email[],    ← Should be: labelIds includes STARRED
  archive: Email[],    ← Should be: NOT (INBOX | SPAM | TRASH)
  allmail: Email[]     ← Should be: ALL - SPAM - TRASH
}

// 16 separate arrays (category splits)
categoryEmails: {
  all: { primary, updates, promotions, social },
  archive: { ... },
  spam: { ... },
  trash: { ... }
}

// Label page array
emails: Email[]

// Page tracking (per tab)
pageTokens: { [key]: string }
pageIndexes: { [key]: number }
currentPageIndex: number
```

**Problems:**
- ❌ 26+ simultaneous arrays with no sync mechanism
- ❌ When email is deleted, must manually remove from ALL arrays
- ❌ New function `handleEmailDelete` removes from all tabs, but...
  - Only called from EmailListItem or EmbeddedViewEmail
  - NOT called from direct API mutations
  - Data can desync from Gmail in background
- ❌ No canonical "email source" - each array can diverge
- ❌ Filtering logic (`getCurrentEmails()`) attempts to filter but too late (data already wrong)

### Layer 3: Filtering Logic

**Current Defensive Filter (Lines ~1573-1610):**
```typescript
const getCurrentEmails = (): Email[] => {
  let currentEmails = allTabEmails[activeTab];
  
  // Attempt to filter out wrong emails
  switch (activeTab) {
    case 'all':
      currentEmails = currentEmails.filter(e => 
        !hasLabel(e, 'SENT') && !hasLabel(e, 'SPAM') && !hasLabel(e, 'TRASH')
      );
      break;
    case 'trash':
      currentEmails = currentEmails.filter(e => hasLabel(e, 'TRASH'));
      break;
    // ... etc
  }
  return currentEmails;
}
```

**Problems:**
- ❌ **Defensive programming** (shouldn't be needed if source was clean)
- ❌ Happens at render time (expensive)
- ❌ Filters emails that shouldn't have been fetched in first place
- ❌ Email with multiple labels (e.g., both INBOX and IMPORTANT) might be lost
- ❌ Only filters display, not underlying state (mutation still wrong)
- ❌ Performance: O(n) filter on every render

### Layer 4: Cache Layer

**Location**: `src/services/emailService.ts` ~250 lines

**Structure:**
```typescript
emailCache: {
  list?: EmailCacheData,           ← SINGLE cache for all queries!
  details: { [emailId]: ... },
  threads: { [threadId]: ... }
}

// Key function
const cacheKey = (query: string) => `${query}-${profileId}`
```

**Problems:**
- ❌ `list` cache is keyed by query but...
- ❌ Only ONE `list` cache object (gets overwritten by each query)
- ❌ When `getUnreadEmails()` runs, it overwrites cache from `getSentEmails()`
- ❌ No TTL validation - cache from 10 minutes ago used as "fresh"
- ❌ No profile isolation (if user A fetches, user B might get user A's cache)
- ❌ `clearEmailCache()` clears everything, too aggressive

---

## Data Flow: The Bleed

### Scenario: User opens Inbox

1. **Initial Load** (`fetchAllEmailTypes`)
   - Fetches: `getAllInboxEmails()` → Query: 24h filter → 20 emails
   - Fetches: `getUnreadEmails()` → Query: 24h + is:unread → 10 emails
   - Fetches: `getSentEmails()` → labelIds: ['SENT'] → 5 emails
   - Fetches: `getTrashEmails()` → labelIds: ['TRASH'] → 12 emails
   - Stores: `allTabEmails = { all: 20, unread: 10, sent: 5, trash: 12 }`

2. **Category Load** (`fetchCategoryEmails`)
   - Fetches: `getCategoryEmailsForFolder('primary', 'trash')` → 12 emails
   - Fetches: `getCategoryEmailsForFolder('primary', 'all')` → 20 emails
   - Stores: `categoryEmails.trash.primary = 12 emails`
   - Stores: `categoryEmails.all.primary = 20 emails`

3. **Email appears in 4 places** now:
   - `allTabEmails.trash[0]` ← Same object reference
   - `allTabEmails.all[15]` ← If query overlap
   - `categoryEmails.trash.primary[0]` ← Same object reference
   - `categoryEmails.all.primary[8]` ← If query overlap

4. **Now count shows**: 12 + 12 (from cache) = 24? NO, shows 12, BUT...
   - If pagination fetches more, might get 12 + 8 = 20 in array
   - Display counts might be wrong somewhere else

---

## 30-Minute Battle Plan

### Phase 1: Understand (5 min)
- ✓ Identify all fetch points
- ✓ Trace cache invalidation
- ✓ Find where bleeding happens

### Phase 2: Identify (5 min)  
- [ ] Find the exact query that returns wrong data
- [ ] Verify if it's query issue or cache issue
- [ ] Check if labelIds are being set correctly

### Phase 3: Quick Fixes (15 min) - Choose ONE path

**Path A: Fix at Source (BEST)**
- Make `getEmails()` and `getEmailsByLabelIds()` return DISJOINT sets
- Add deduplication logic
- Add result validation

**Path B: Fix at Component (MEDIUM)**
- Make `allTabEmails` derived (computed) instead of stored
- Single source: one master email array
- Each tab selects from master (with filtering)

**Path C: Fix Cache (EASY)**
- Make cache per-query with proper TTL
- Add deduplication on cache retrieval
- Validate email labelIds match expectation

### Phase 4: Validate (5 min)
- Count verification
- No duplication check
- Gmail API comparison

---

## Proposed 10-Year Battle Plan (Full Fix)

### **Step 1: Establish Single Source of Truth**

```typescript
// NEW: src/services/emailRepository.ts
class EmailRepository {
  private masterEmails: Map<string, Email> = new Map(); // ID → Email
  private emailsByLabel: Map<string, Set<string>> = new Map(); // labelId → [emailIds]
  private metadata: {
    lastSync: number,
    totalCount: number,
    profile: string
  }

  async syncFromGmail(labels: string[]) {
    // Fetch ALL emails from Gmail API
    // Deduplicate by ID
    // Build reverse index by label
    // Timestamp sync
  }

  getEmailsForTab(tab: TabName): Email[] {
    // Compute from master based on tab definition
    // NO parallel arrays, NO caching, COMPUTED
  }

  getCount(tab: TabName): number {
    // Count without fetching
    // Based on label indices
  }

  moveEmail(id: string, from: string[], to: string[]) {
    // Atomic: update labels in master
    // Update label indices
    // Validate state
  }
}
```

**Benefits:**
- Single source of truth (master email map)
- All other views are **derived**, not stored
- Counts are **computed**, not cached
- Mutations are **atomic** (move/delete/mark all happen together)

### **Step 2: Atomic Operations**

```typescript
class EmailRepository {
  async deleteEmail(id: string) {
    // ONE operation:
    // 1. Delete from masterEmails
    // 2. Remove from all labelIndices
    // 3. Update counts
    // 4. Call API
    // No intermediate states
  }

  async moveEmailToTrash(id: string) {
    // ONE operation:
    // 1. Remove from INBOX, etc.
    // 2. Add to TRASH
    // 3. Recompute all tabs
    // No desync
  }
}
```

### **Step 3: Pagination Without Duplication**

```typescript
// Current: Save pageToken per tab (broken if tabs share data)
// Fixed: Save pageToken per QUERY, not per tab

class QueryCache {
  [queryHash: {
    emails: Email[],
    pageToken: string,
    timestamp: number,
    ttl: 5_minutes
  }
}
```

### **Step 4: Validation Layer**

```typescript
class EmailValidator {
  validateEmail(email: Email): boolean {
    // Check: labelIds match email content
    // Check: No email in multiple incompatible categories
    // Check: All required fields present
    // Return: valid or throw
  }

  validateSet(emails: Email[]): boolean {
    // Check: No duplicates by ID
    // Check: All emails valid
    // Check: Counts match
    // Return: valid or throw
  }
}
```

### **Step 5: Instrument Monitoring**

```typescript
class EmailSystemMetrics {
  track(event: {
    type: 'fetch' | 'cache-hit' | 'filter' | 'move' | 'delete'
    query?: string
    resultCount: number
    expectedCount?: number
    duration: number
  }) {
    // Log all operations
    // Alert if count mismatch
    // Surface cache issues
  }
}
```

---

## Files Requiring Changes

### **CRITICAL (Must fix)**

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `src/services/emailService.ts` | 200-900 | Cache corruption, dedup missing | P0 |
| `src/components/email/EmailPageLayout.tsx` | 76-2000 | Multiple parallel arrays | P0 |
| `src/services/optimizedInitialLoad.ts` | 1-574 | Query overlaps with main fetch | P0 |

### **HIGH (Should fix)**

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `src/lib/gmail.ts` | 1-290 | Token passed to every call, add caching | P1 |
| `src/contexts/LabelContext.tsx` | 1-400 | Label syncing adds more fetches | P1 |
| `src/services/optimizedEmailService.ts` | 1-235 | Server-side fetch with duplication | P1 |

### **MEDIUM (Nice to have)**

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `src/utils/gapiCallWrapper.ts` | 1-131 | Adds retry logic but no dedup | P2 |
| `src/services/searchService.ts` | 1-200+ | Search adds more queries | P2 |

---

## Specific Vulnerabilities

### Vulnerability #1: Query Overlap

**Location**: `emailService.ts` lines 543-550

```typescript
export const getAllInboxEmails = async () => {
  const query = get24hInboxQuery(true); // "label:INBOX after:..."
  return getEmails(forceRefresh, query, ...);
};

export const getUnreadEmails = async () => {
  const query = get24hInboxQuery(true); // SAME QUERY!
  return getEmails(forceRefresh, query + ' is:unread', ...);
};
```

**Result**: Both return INBOX emails, `getAllInboxEmails` includes unread

**Fix**: 
```typescript
// getUnreadEmails should be:
return getEmailsByLabelIds(['UNREAD'], ...);
// NOT query-based
```

### Vulnerability #2: Archive Query Logic

**Location**: `emailService.ts` lines 696-702

```typescript
export const getArchiveEmails = async () => {
  return getEmails(forceRefresh, '-in:inbox -in:spam -in:trash', ...);
};
```

**Problem**: This query returns:
- Emails NOT in INBOX
- Emails NOT in SPAM  
- Emails NOT in TRASH

But emails can have MULTIPLE labels! Email with `[INBOX, IMPORTANT]` is:
- In INBOX? YES
- So `-in:inbox` excludes it? YES
- But should it be in Archive? NO (it's in INBOX)

**Fix**: Use explicit labelIds instead
```typescript
// Archive = NOT (INBOX | SPAM | TRASH)
// NOT just "-in:inbox -in:spam -in:trash"
```

### Vulnerability #3: Category Explosion

**Location**: `emailPageLayout.tsx` lines 596-630

```typescript
await Promise.all([
  getCategoryEmailsForFolder('primary', 'all', ...),    // Query 1
  getCategoryEmailsForFolder('updates', 'all', ...),    // Query 2
  getCategoryEmailsForFolder('promotions', 'all', ...), // Query 3
  getCategoryEmailsForFolder('social', 'all', ...),     // Query 4
  // × 4 folder contexts
  // = 16 queries just for categories!
]);
```

**Problem**: 
- 16 separate queries hitting Gmail API
- Each can fetch overlapping emails
- Each cached separately, so duplicates in cache

**Fix**: 
- Fetch `'in:inbox'` once with categories
- Split results locally by category

### Vulnerability #4: Cache Isn't Per-Query

**Location**: `emailService.ts` lines 249-260

```typescript
interface EmailCacheData {
  emails: Email[];
  timestamp: number;
  query: string;         // ← Stored but NOT used for key!
  nextPageToken?: string;
}

// Only ONE list cache object!
let emailCache = {
  list: undefined,       // ← Overwrites itself per query
  details: {},
  threads: {}
};
```

**Problem**: When you run:
1. `getUnreadEmails()` → stores in `emailCache.list`
2. `getSentEmails()` → OVERWRITES `emailCache.list`
3. Next call to `getUnreadEmails()` finds sent emails in cache!

**Fix**:
```typescript
const cache = new Map<string, CacheEntry>();
const key = `${query}:${profileId}`;
```

### Vulnerability #5: No Deduplication

**Location**: `emailPageLayout.tsx` lines 1947-1960

When deleting email ID `abc123`:
```typescript
setAllTabEmails(prev => ({
  all: prev.all.filter(e => e.id !== emailId),      // ✓ Removed
  unread: prev.unread.filter(e => e.id !== emailId),// ✓ Removed
  sent: prev.sent.filter(e => e.id !== emailId),    // ✓ Removed
  trash: prev.trash.filter(e => e.id !== emailId),  // ✓ Removed
  // ... 6 more manual filters
}));

// BUT if same email object in categoryEmails:
setCategoryEmails(prev => { ... });
// Must manually iterate all 16 category arrays and filter
// If you miss one → ghost email persists
```

**Result**: High chance of inconsistency

---

## Verification Checklist

After any fix, verify:

- [ ] No email appears in two incompatible tabs (e.g., INBOX + TRASH)
- [ ] Count in UI = Count in Gmail API within 1
- [ ] Delete removes email from ALL locations atomically
- [ ] Mark as read/unread updates cache immediately
- [ ] Move to trash removes from INBOX in cache
- [ ] Pagination doesn't return same email twice
- [ ] Search results don't duplicate
- [ ] Refresh doesn't double email count
- [ ] Switching tabs doesn't show stale data
- [ ] Manual sort doesn't break pagination

---

## Success Criteria

**Before Fix:**
```
Trash in Gmail: 12
Trash in App: 24
```

**After Fix:**
```
Trash in Gmail: 12
Trash in App: 12 (EXACTLY)
100 days: Still 12 (No growth)
```

---

## Next Steps

1. **DO NOT IMPLEMENT YET**
2. Choose Phase 2 approach (Path A, B, or C)
3. Review with team
4. Create branches for each path
5. Implement with tests

