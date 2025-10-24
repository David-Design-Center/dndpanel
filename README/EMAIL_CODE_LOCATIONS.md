# Email System - Code Locations Reference

## Quick File Map

```
📁 src/services/
├── emailService.ts              (1474 lines) - CORE EMAIL FETCHING
│   ├── emailCache               (line 253) - CACHE OBJECT
│   ├── getEmails()              (line 310) - Generic query fetcher
│   ├── getEmailsByLabelIds()    (line 710) - Label-based fetcher
│   ├── getUnreadEmails()        (line 510) - Unread emails
│   ├── getSentEmails()          (line 570) - Sent emails
│   ├── getTrashEmails()         (line 664) - Trash emails
│   ├── getArchiveEmails()       (line 696) - Archive emails ⚠️ QUERY BUG
│   ├── getAllInboxEmails()      (line 543) - All inbox
│   ├── getCategoryEmailsForFolder() (line 1430) - Category split
│   └── clearEmailCache()        (line 284) - Cache clear
│
├── optimizedInitialLoad.ts      (574 lines) - INITIAL LOAD OPTIMIZATION
│   ├── fetchMessagesByLabelIds() (line 93) - First paint fetch
│   ├── loadCriticalInboxData()  (line 300) - Critical data load
│   ├── fetchAllEmailTypes()     (line 420) - Load all tabs
│   └── getInboxUnreadCount()    (line 560) - Unread count
│
├── optimizedEmailService.ts     (235 lines) - SERVER-SIDE PROCESSING
│   ├── getAccessToken()         (line 29) - Token retrieval
│   └── fetchEmailThread()       (line 95) - Thread fetch
│
└── searchService.ts             (200+ lines) - SEARCH QUERIES
    └── Adds more parallel queries

📁 src/components/email/
├── EmailPageLayout.tsx          (2953 lines) - MAIN UI COMPONENT ⚠️ COMPLEX
│   ├── State: allTabEmails      (line ~150) - 10 parallel arrays
│   ├── State: categoryEmails    (line ~155) - 16 parallel arrays
│   ├── State: emails            (line 243) - Label page array
│   ├── fetchAllEmailTypes()     (line 490) - Fetch orchestrator
│   ├── fetchCategoryEmails()    (line 596) - Category fetcher
│   ├── fetchLabelEmails()       (line 1108) - Label page fetch
│   ├── getCurrentEmails()       (line 1547) - Defensive filter
│   ├── handleEmailDelete()      (line 2008) - Delete handler
│   ├── handleEmailUpdate()      (line 1933) - Update handler
│   ├── loadMoreForTab()         (line 1740) - Pagination
│   ├── handleNextPage()         (line 1762) - Next page click
│   └── PAGINATION CONTROLS      (line 2473) - UI arrows
│
├── EmailListItem.tsx            (300+ lines) - Email row component
│   └── Calls onEmailDelete prop

└── EmbeddedViewEmail.tsx        (823 lines) - Email detail view
    └── handleMoveToTrash()      (line 300) - Delete action

📁 src/contexts/
└── LabelContext.tsx             (400 lines) - LABEL MANAGEMENT
    ├── fetchInboxUnreadSinceCutoff() (line 70) - More queries
    └── fetchLabelsWithRetry()   (line 200) - Label sync

📁 src/lib/
├── gmail.ts                     (290 lines) - GMAIL SERVICE WRAPPER
│   └── All functions need token (performance issue)

└── utils.ts                     (200+ lines) - UTILITY FUNCTIONS
    ├── get24hInboxQuery()       - 24h filter logic
    └── Query builders

📁 README/
├── EMAIL_FETCHING_DEEP_DIVE.md  - Original architecture (outdated)
├── EMAIL_ARCHITECTURE_ANALYSIS.md  - NEW: Complete analysis
└── EMAIL_ARCHITECTURE_DIAGRAMS.md  - NEW: Visual reference
```

---

## Critical Code Sections to Review

### Section 1: Cache Design (THE BOTTLENECK)

**File**: `src/services/emailService.ts`  
**Lines**: 249-290

```typescript
// CURRENT (BROKEN):
interface EmailCacheData {
  emails: Email[];
  timestamp: number;
  query: string;           // ← Stored but NOT indexed
  profileId?: string;
  nextPageToken?: string;
}

let emailCache: {
  list?: EmailCacheData;  // ← SINGLE cache for ALL queries!
  details: { [id: string]: EmailDetailCache };
  threads: { [id: string]: any };
} = {
  list: undefined,
  details: {},
  threads: {}
};

// When this runs:
// 1. getUnreadEmails() → stores in emailCache.list
// 2. getSentEmails() → OVERWRITES emailCache.list
// Result: Cache corruption
```

**Why this matters**: Every service function shares same cache object

---

### Section 2: Query Fetcher (QUERY LOGIC BUG)

**File**: `src/services/emailService.ts`  
**Lines**: 310-380

```typescript
const getEmails = async (
  forceRefresh = false, 
  query: string, 
  maxResults = 100, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    // CURRENT:
    // 1. Cache lookup (but cache is broken, see Section 1)
    // 2. Gmail API call with query
    // 3. Store in global emailCache.list (overwrites previous!)
    // 4. Return to caller
    
    // No deduplication
    // No validation
    // No checking if results overlap with cached queries
  }
};
```

**Why this matters**: Foundation for all email fetching

---

### Section 3: Archive Query (WRONG LOGIC)

**File**: `src/services/emailService.ts`  
**Lines**: 696-702

```typescript
export const getArchiveEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // CURRENT (WRONG):
  // Archive defined as: "-in:inbox -in:spam -in:trash"
  // This means: "emails NOT in inbox AND NOT in spam AND NOT in trash"
  
  // PROBLEM: Email with labels [INBOX, IMPORTANT]
  // → In INBOX? YES
  // → "-in:inbox" matches? YES (exclude it)
  // → So email removed from archive? CORRECT
  
  // PROBLEM 2: Email with labels [IMPORTANT, STARRED]
  // → In INBOX? NO
  // → In SPAM? NO
  // → In TRASH? NO
  // → So included in archive? CORRECT
  
  // BUT PROBLEM 3: Email with labels [TRASH, IMPORTANT]
  // → In TRASH? YES
  // → "-in:trash" matches? YES (exclude it)
  // → So not in archive? CORRECT
  
  // WAIT - So maybe it's actually correct?
  // The real issue is that the system has overlapping queries elsewhere
  
  return getEmails(forceRefresh, '-in:inbox -in:spam -in:trash', maxResults, pageToken);
};
```

**Why this matters**: Archive emails might leak into other categories

---

### Section 4: Component State (THE HYDRA)

**File**: `src/components/email/EmailPageLayout.tsx`  
**Lines**: 76-250 (state declarations)

```typescript
// STATE DECLARATIONS (too many):

// Inbox tabs (10 arrays):
const [allTabEmails, setAllTabEmails] = useState<AllTabEmails>({
  all: [],
  unread: [],
  sent: [],
  drafts: [],
  trash: [],
  spam: [],
  important: [],
  starred: [],
  archive: [],
  allmail: []
});

// Category splits (16 arrays):
const [categoryEmails, setCategoryEmails] = useState<{
  all: CategoryEmails,
  archive: CategoryEmails,
  spam: CategoryEmails,
  trash: CategoryEmails
}>({
  all: { primary: [], updates: [], promotions: [], social: [] },
  archive: { primary: [], updates: [], promotions: [], social: [] },
  spam: { primary: [], updates: [], promotions: [], social: [] },
  trash: { primary: [], updates: [], promotions: [], social: [] }
});

// Label pages (1 array):
const [emails, setEmails] = useState<Email[]>([]);

// Page tracking:
const [pageTokens, setPageTokens] = useState<{...}>();
const [currentPageIndex, setPageIndex] = useState(0);
const [pageIndexes, setPageIndexes] = useState<{...}>();

// Total: 26+ arrays tracking same emails!
```

**Why this matters**: Impossible to keep in sync

---

### Section 5: Delete Handler (MANUAL SYNC)

**File**: `src/components/email/EmailPageLayout.tsx`  
**Lines**: 2008-2070

```typescript
const handleEmailDelete = async (emailId: string) => {
  try {
    // 1. Delete via API
    await deleteEmail(emailId);

    // 2. Remove from all relevant tab arrays (MANUAL)
    if (pageType === 'inbox' && !labelName) {
      setAllTabEmails(prev => ({
        all: prev.all.filter(email => email.id !== emailId),
        unread: prev.unread.filter(email => email.id !== emailId),
        sent: prev.sent.filter(email => email.id !== emailId),
        drafts: prev.drafts.filter(email => email.id !== emailId),
        trash: prev.trash.filter(email => email.id !== emailId),
        important: prev.important.filter(email => email.id !== emailId),
        starred: prev.starred.filter(email => email.id !== emailId),
        spam: prev.spam.filter(email => email.id !== emailId),
        archive: prev.archive.filter(email => email.id !== emailId),
        allmail: prev.allmail.filter(email => email.id !== emailId)
        // ← 10 manual filters (easy to miss one!)
      }));
      
      // 3. Remove from category arrays (MANUAL)
      setCategoryEmails(prev => {
        const updatedCategories = { ...prev };
        Object.keys(updatedCategories).forEach(folderKey => {
          const folder = updatedCategories[folderKey as keyof typeof updatedCategories];
          Object.keys(folder).forEach(categoryKey => {
            folder[categoryKey as keyof typeof folder] = 
              folder[categoryKey as keyof typeof folder].filter(email => email.id !== emailId);
            // ← 16 more manual filters!
          });
        });
        return updatedCategories;
      });
    } else {
      // 4. Remove from label page array
      setEmails(prevEmails => 
        prevEmails.filter(email => email.id !== emailId)
      );
    }
    
    // 5. Show toast
    toast.success(...);
  }
};

// PROBLEM: If developer adds new array (e.g., pinnedEmails)
// They MUST remember to add filter here
// Or ghost email persists
```

**Why this matters**: Delete logic is fragile and error-prone

---

### Section 6: Fetch Orchestrator (THE COMPLEXITY)

**File**: `src/components/email/EmailPageLayout.tsx`  
**Lines**: 490-580

```typescript
const fetchAllEmailTypes = async (forceRefresh = false) => {
  if (!isGmailSignedIn) return;
  
  try {
    console.log('🚀 STEP 1: Loading critical inbox data...');
    
    // Parallel fetch 1: Unread inbox
    await Promise.all([
      getUnreadEmails(forceRefresh, 50),
      getInboxEmails(forceRefresh, 50),
      getSentEmails(forceRefresh, 50),
      getDraftEmails(forceRefresh),
      getImportantEmails(forceRefresh, 50),
      getStarredEmails(forceRefresh, 50),
      getSpamEmails(forceRefresh, 50),
      getTrashEmails(forceRefresh, 50),
      getArchiveEmails(forceRefresh, 50),
      getAllMailEmails(forceRefresh, 50)
    ]);
    
    // ← 10 PARALLEL queries!
    // Each can return overlapping emails
    // Each stored separately
    
    // Then separately:
    await fetchCategoryEmails(forceRefresh);  // ← 16 MORE queries!
    
    // Result: 26 API calls
    // Result: Emails can be duplicated
  }
};
```

**Why this matters**: Too much parallel work, not deduped

---

### Section 7: Pagination Logic (PAGE TOKEN HANDLING)

**File**: `src/components/email/EmailPageLayout.tsx`  
**Lines**: 1740-1800

```typescript
const loadMoreForTab = async (
  tab: typeof activeTab,
  options?: { force?: boolean }
) => {
  if (!isGmailSignedIn || !pageTokens[tab]) return;

  try {
    setLoadingMore(true);
    
    const currentPageToken = pageTokens[tab];  // Get token for this tab
    const limit = options?.limit ?? INBOX_FETCH_BATCH_SIZE;

    // Fetch next page using token
    const response = await (() => {
      switch (tab) {
        case 'all':
          return getAllInboxEmails(false, limit, currentPageToken);
        case 'unread':
          return getUnreadEmails(false, limit, currentPageToken);
        case 'sent':
          return getSentEmails(false, limit, currentPageToken);
        // ... etc
      }
    })();

    // Add results to existing array
    setAllTabEmails(prev => ({
      ...prev,
      [tab]: [...prev[tab], ...response.emails]  // ← APPEND!
    }));

    // Update page token for next fetch
    setPageTokens(prev => ({
      ...prev,
      [tab]: response.nextPageToken
    }));
    
    setLoadingMore(false);
  }
};

// PROBLEM: If response.emails contains duplicates
// They get appended anyway
// No check for: "Is this email already in the array?"
```

**Why this matters**: Pagination can double emails if dedup not in service

---

### Section 8: Display Filter (TOO LATE)

**File**: `src/components/email/EmailPageLayout.tsx`  
**Lines**: 1547-1620

```typescript
const getCurrentEmails = (): Email[] => {
  let currentEmails: Email[] = [];

  if (pageType !== 'inbox' || labelName) {
    return emails;  // Label page uses different array
  }

  const folderContext = folderContextForTab;

  if (supportsCategoryTabs && categoryEmails[folderContext][activeCategory]?.length > 0) {
    currentEmails = categoryEmails[folderContext][activeCategory];
  } else {
    currentEmails = allTabEmails[activeTab];
  }

  // DEFENSIVE FILTERING (shouldn't be necessary):
  const hasLabel = (e: Email, label: string) => (e.labelIds || []).includes(label);
  
  switch (activeTab) {
    case 'all':
      // Remove emails that shouldn't be in inbox
      currentEmails = currentEmails.filter(e => 
        !hasLabel(e, 'SENT') && !hasLabel(e, 'SPAM') && !hasLabel(e, 'TRASH')
      );
      break;
    case 'important':
      currentEmails = currentEmails.filter(e => 
        e.isImportant || hasLabel(e, 'IMPORTANT')
      );
      break;
    case 'trash':
      currentEmails = currentEmails.filter(e => hasLabel(e, 'TRASH'));
      break;
    // ... etc
  }

  return currentEmails;
};

// PROBLEM: This filtering happens at RENDER TIME
// It means source data was ALREADY WRONG
// Filter is band-aid, not fix
// Should never need this if fetching was clean
```

**Why this matters**: Performance and indicates deeper issues

---

## Issue Reproduction Steps

### Reproduce: Trash Shows 24 instead of 12

```
1. Open app, navigate to Inbox
2. Click on "Trash" tab
   → Shows: "Showing 1-12 of 12" ✓ CORRECT
   
3. Wait 30 seconds
4. App fetches again in background (category refresh?)
   → Now shows: "Showing 1-24 of 24" ❌ WRONG
   
5. Refresh page manually
   → Shows: "Showing 1-12 of 12" ✓ Back to correct (cache cleared)
   
Conclusion: Caching or background fetch is duplicating
```

### Reproduce: Email in Multiple Places

```
1. Find email that's in both INBOX and IMPORTANT
2. Go to "All" tab
   → Email visible? YES
3. Go to "Important" tab
   → Email visible? YES
4. Go back to "All" tab
5. Delete the email
   → Removed from "All"? YES
6. Go to "Important"
   → Email still there? MAYBE ❌ (means delete didn't update all arrays)
```

---

## Metrics to Monitor

After any fix, track these:

```
Success Metrics:
├─ Trash count = Gmail Trash count (within 1)
├─ All Inbox count = Gmail INBOX count (within 1)
├─ Unique email count = No duplicates (check by ID)
├─ Page load = No duplicate email IDs in allTabEmails
├─ Delete latency = <500ms (remove from all arrays)
├─ Pagination = No duplicate on next page
└─ 7-day stability = Counts stable (no creeping growth)

Warning Signals:
├─ Email appears in >2 incompatible tabs (e.g., INBOX + TRASH)
├─ Count grows over time (accumulation bug)
├─ Delete doesn't immediately remove from all views
├─ Pagination returns same email twice
├─ Memory grows unbounded (leaked references)
└─ Cache hit rate < 50% (cache ineffective)
```

---

## Action Items

### For Code Review

- [ ] Verify cache key strategy (is it per-query?)
- [ ] Verify deduplication (any `Set`/`Map` to track seen IDs?)
- [ ] Verify label validation (are returned emails checked for correct labels?)
- [ ] Verify delete propagation (does single delete update all 26 arrays?)
- [ ] Verify count accuracy (does displayed count == array length == Gmail API?)

### For Testing

- [ ] Unit: Cache doesn't store duplicates
- [ ] Unit: getTrash() always returns only TRASH emails
- [ ] Integration: Delete removes from all tabs atomically
- [ ] Integration: Count === array.length === Gmail API
- [ ] E2E: Trash shows correct count for 24 hours
- [ ] E2E: Email doesn't appear in two incompatible tabs

