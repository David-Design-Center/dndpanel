# Visual Extraction Roadmap

## 🗂️ CURRENT STRUCTURE

```
src/integrations/
├── gapiService.ts (3,102 lines)
│   ├─ Auth/Init (379 lines) ← MUST STAY
│   ├─ Send/Draft (800 lines) ← Phase 5 ✅ DELEGATED
│   ├─ Message Fetch (387 lines) ← Phase 6 🔴 NEEDS WRAPPER
│   ├─ Attachments (166 lines) ← Phase 6 🔴 NEEDS WRAPPER
│   ├─ Labels (309 lines) ← Phase 6+7 🔴 NEEDS WRAPPER & EXPANSION
│   ├─ Message Mutations (169 lines) ← Phase 8 🔴 NOT EXTRACTED
│   ├─ Contacts/Profile (182 lines) ← Phase 10 🔴 NOT EXTRACTED
│   ├─ Filters (84 lines) ← Phase 9 🔴 NOT EXTRACTED
│   ├─ Inline Images (171 lines) ← SPECIAL CASE ✅ KEEP HERE
│   ├─ Empty Trash (55 lines) ← Phase 11 🔴 NOT EXTRACTED
│   ├─ Auth Extensions (379 lines) ← KEEP HERE
│   └─ Misc/Helpers (~0 lines)
│
└── gmail/ (2,050 lines)
    ├─ send/compose.ts (664 lines) ✅ COMPLETE
    ├─ fetch/messages.ts (281 lines) ✅ CREATED, NEEDS WRAPPERS
    ├─ parsing/
    │  ├─ charset.ts (186 lines) ✅ DONE
    │  ├─ headers.ts (124 lines) ✅ DONE
    │  ├─ body.ts (91 lines) ✅ DONE
    │  └─ index.ts (143 lines) ✅ DONE
    ├─ operations/
    │  ├─ attachments.ts (72 lines) ✅ CREATED, NEEDS WRAPPER
    │  └─ labels.ts (184 lines) ⚠️ INCOMPLETE (missing update/delete/apply)
    ├─ utils/base64.ts (75 lines) ✅ DONE
    ├─ types.ts (56 lines) ✅ DONE
    └─ index.ts (59 lines) ✅ DONE
```

---

## 🚀 PHASE-BY-PHASE TRANSFORMATION

### PHASE 6: Integrate Phase 4 Modules (30 min)
**Remove 728 lines from gapiService by creating wrappers**

```
BEFORE:
gapiService.ts
├─ fetchGmailMessages() [116 lines]
├─ fetchGmailMessageById() [186 lines]
├─ fetchLatestMessageInThread() [38 lines]
├─ fetchThreadMessages() [47 lines]
├─ getAttachmentDownloadUrl() [166 lines]
├─ fetchGmailLabels() [104 lines]
├─ fetchGmailMessagesByLabel() [26 lines]
└─ createGmailLabel() [45 lines]
   ───────────────────────────────
   TOTAL: 728 lines

AFTER:
gapiService.ts
├─ fetchGmailMessages() [1 line]
│   └─ return gmailFetchMessages(...);
├─ fetchGmailMessageById() [1 line]
│   └─ return gmailFetchMessageById(...);
├─ fetchLatestMessageInThread() [1 line]
│   └─ return gmailFetchLatestMessageInThread(...);
├─ fetchThreadMessages() [1 line]
│   └─ return gmailFetchThreadMessages(...);
├─ getAttachmentDownloadUrl() [1 line]
│   └─ return gmailGetAttachmentDownloadUrl(...);
├─ fetchGmailLabels() [1 line]
│   └─ return gmailFetchLabels(...);
├─ fetchGmailMessagesByLabel() [1 line]
│   └─ return gmailFetchMessagesByLabel(...);
└─ createGmailLabel() [1 line]
   └─ return gmailCreateLabel(...);
   ───────────────────────────────
   TOTAL: 8 lines

RESULT: -720 lines from gapiService ✅
gapiService: 3,102 → 2,382 lines
```

---

### PHASE 7: Complete Labels Module (15 min)
**Add missing label operations to gmail/operations/labels.ts**

```
BEFORE:
gapiService.ts
├─ updateGmailLabel() [47 lines] ← STILL HERE
├─ deleteGmailLabel() [32 lines] ← STILL HERE
└─ applyGmailLabels() [31 lines] ← STILL HERE

gmail/operations/labels.ts (184 lines)
├─ fetchGmailLabels() ✅
├─ fetchGmailMessagesByLabel() ✅
└─ createGmailLabel() ✅

AFTER:
gapiService.ts
├─ updateGmailLabel() [1 line] → wrapper
├─ deleteGmailLabel() [1 line] → wrapper
└─ applyGmailLabels() [1 line] → wrapper

gmail/operations/labels.ts (294 lines)
├─ fetchGmailLabels() ✅
├─ fetchGmailMessagesByLabel() ✅
├─ createGmailLabel() ✅
├─ updateGmailLabel() ✨ NEW
├─ deleteGmailLabel() ✨ NEW
└─ applyGmailLabels() ✨ NEW

RESULT: -107 lines from gapiService ✅
gapiService: 2,382 → 2,275 lines
```

---

### PHASE 8: Extract Mutations Module (30 min)
**Create gmail/operations/mutations.ts with 7 mutation functions**

```
BEFORE:
gapiService.ts
├─ markGmailMessageAsRead() [26 lines]
├─ markGmailMessageAsUnread() [26 lines]
├─ markGmailMessageAsStarred() [24 lines]
├─ markGmailMessageAsUnstarred() [24 lines]
├─ markGmailMessageAsImportant() [21 lines]
├─ markGmailMessageAsUnimportant() [21 lines]
└─ markGmailMessageAsTrash() [27 lines]
   ───────────────────────────────
   TOTAL: 169 lines

NEW:
gmail/operations/mutations.ts (170 lines) ✨ CREATED
├─ markGmailMessageAsRead() [26 lines]
├─ markGmailMessageAsUnread() [26 lines]
├─ markGmailMessageAsStarred() [24 lines]
├─ markGmailMessageAsUnstarred() [24 lines]
├─ markGmailMessageAsImportant() [21 lines]
├─ markGmailMessageAsUnimportant() [21 lines]
└─ markGmailMessageAsTrash() [27 lines]

WRAPPERS in gapiService.ts (7 lines)
├─ markGmailMessageAsRead() [1 line]
├─ markGmailMessageAsUnread() [1 line]
├─ markGmailMessageAsStarred() [1 line]
├─ markGmailMessageAsUnstarred() [1 line]
├─ markGmailMessageAsImportant() [1 line]
├─ markGmailMessageAsUnimportant() [1 line]
└─ markGmailMessageAsTrash() [1 line]

RESULT: -162 lines from gapiService ✅
gapiService: 2,275 → 2,113 lines
```

---

### PHASE 9: Extract Filters Module (15 min)
**Create gmail/operations/filters.ts with 4 filter functions**

```
BEFORE:
gapiService.ts
├─ listGmailFilters() [20 lines]
├─ getGmailFilter() [20 lines]
├─ createGmailFilter() [25 lines]
└─ deleteGmailFilter() [19 lines]
   ───────────────────────────────
   TOTAL: 84 lines

NEW:
gmail/operations/filters.ts (85 lines) ✨ CREATED
├─ listGmailFilters() [20 lines]
├─ getGmailFilter() [20 lines]
├─ createGmailFilter() [25 lines]
└─ deleteGmailFilter() [19 lines]

WRAPPERS in gapiService.ts (4 lines)
├─ listGmailFilters() [1 line]
├─ getGmailFilter() [1 line]
├─ createGmailFilter() [1 line]
└─ deleteGmailFilter() [1 line]

RESULT: -80 lines from gapiService ✅
gapiService: 2,113 → 2,033 lines
```

---

### PHASE 10: Extract Contacts Module (15 min)
**Create gmail/contacts/profile.ts with 4 contact functions**

```
BEFORE:
gapiService.ts
├─ getGmailUserProfile() [49 lines]
├─ testPeopleAPI() [54 lines]
├─ fetchPeopleConnections() [41 lines]
└─ fetchOtherContacts() [38 lines]
   ───────────────────────────────
   TOTAL: 182 lines

NEW:
gmail/contacts/profile.ts (185 lines) ✨ CREATED
├─ getGmailUserProfile() [49 lines]
├─ testPeopleAPI() [54 lines]
├─ fetchPeopleConnections() [41 lines]
└─ fetchOtherContacts() [38 lines]

WRAPPERS in gapiService.ts (4 lines)
├─ getGmailUserProfile() [1 line]
├─ testPeopleAPI() [1 line]
├─ fetchPeopleConnections() [1 line]
└─ fetchOtherContacts() [1 line]

RESULT: -178 lines from gapiService ✅
gapiService: 2,033 → 1,855 lines
```

---

### PHASE 11: Extract Utilities (5 min)
**Create gmail/misc/trash.ts with cleanup functions**

```
BEFORE:
gapiService.ts
└─ emptyGmailTrash() [55 lines]

NEW:
gmail/misc/trash.ts (55 lines) ✨ CREATED
└─ emptyGmailTrash() [55 lines]

WRAPPER in gapiService.ts (1 line)
└─ emptyGmailTrash() [1 line]

RESULT: -54 lines from gapiService ✅
gapiService: 1,855 → 1,801 lines
```

---

## 📊 FINAL ARCHITECTURE

### Line Count Progression
```
Phase 0 (START):    gapiService: 3,102 lines 📊
Phase 6 (Wrap):     gapiService: 2,382 lines ⬇️ 23% reduction
Phase 7 (Labels):   gapiService: 2,275 lines ⬇️ 26% reduction
Phase 8 (Mutations):gapiService: 2,113 lines ⬇️ 32% reduction
Phase 9 (Filters):  gapiService: 2,033 lines ⬇️ 34% reduction
Phase 10 (Contacts):gapiService: 1,855 lines ⬇️ 40% reduction
Phase 11 (Misc):    gapiService: 1,801 lines ⬇️ 42% reduction

FINAL: 42% REDUCTION in gapiService! 🎉
```

---

## 🏗️ FINAL MODULE STRUCTURE

```
src/integrations/
├── gapiService.ts (1,801 lines) ✨
│   ├─ Auth/Init (~379 lines) - CORE
│   ├─ Wrappers (~35 lines) - Delegates to modules
│   ├─ processInlineImages (~171 lines) - Special case
│   └─ Misc (~50 lines)
│
└── gmail/ (3,428 lines total)
    ├─ send/
    │  └─ compose.ts (664) ✅
    │
    ├─ fetch/
    │  └─ messages.ts (281) ✅
    │
    ├─ operations/
    │  ├─ attachments.ts (72) ✅
    │  ├─ labels.ts (294) ✅ EXPANDED
    │  ├─ mutations.ts (170) ✨ NEW
    │  └─ filters.ts (85) ✨ NEW
    │
    ├─ contacts/
    │  └─ profile.ts (185) ✨ NEW
    │
    ├─ parsing/
    │  ├─ charset.ts (186) ✅
    │  ├─ headers.ts (124) ✅
    │  ├─ body.ts (91) ✅
    │  └─ index.ts (143) ✅
    │
    ├─ misc/
    │  └─ trash.ts (55) ✨ NEW
    │
    ├─ utils/
    │  └─ base64.ts (75) ✅
    │
    ├─ types.ts (56) ✅
    └─ index.ts (59) ✅
```

---

## 🎯 SUMMARY

| Phase | Task | Time | Lines Removed | Total Reduced |
|-------|------|------|---|---|
| 6 | Wrap Phase 4 | 30 min | 728 | 720 |
| 7 | Complete Labels | 15 min | 110 | 107 |
| 8 | Extract Mutations | 30 min | 169 | 162 |
| 9 | Extract Filters | 15 min | 84 | 80 |
| 10 | Extract Contacts | 15 min | 182 | 178 |
| 11 | Extract Misc | 5 min | 55 | 54 |
| **TOTAL** | | **110 min** | **1,328** | **1,301** |

**gapiService: 3,102 → 1,801 lines (42% reduction!)**

---

## ✅ READY TO EXECUTE?

All phases are independent and can be done one at a time.

**Suggested execution order:**
1. Phase 6 (biggest impact, 30 min) 🔥
2. Phase 7 (finish labels, 15 min)
3. Phase 8 (mutations, 30 min)
4. Phase 9 (filters, 15 min)
5. Phase 10 (contacts, 15 min)
6. Phase 11 (trash, 5 min)

**Total time: 110 minutes**
**Result: 42% reduction in gapiService**

Want to proceed with Phase 6?
