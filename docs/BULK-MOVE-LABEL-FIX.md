# Bulk Move Label Bug & Extended Selection Loading UI

**Created:** January 27, 2026  
**Updated:** January 27, 2026  
**Status:** Pending Implementation  
**Priority:** High  

---

## Table of Contents
1. [Bug Summary](#bug-summary)
2. [Root Cause Analysis](#root-cause-analysis)
3. [The Fix: Contextual Move Model](#the-fix-contextual-move-model)
4. [Rule Set](#rule-set)
5. [What We Should NOT Do](#what-we-should-not-do)
6. [Extended Selection Loading UI](#extended-selection-loading-ui)
7. [Implementation Checklist](#implementation-checklist)

---

## Bug Summary

When moving emails from one folder to a nested subfolder (e.g., "Invoices" → "Invoices/Invoice Test 2"), the **old label is not removed**. This results in:

- Emails appearing in BOTH the parent folder AND the nested subfolder
- Inconsistent label state between folders
- Emails in the parent folder showing multiple labels

---

## Root Cause Analysis

The previous implementation tried to:
1. Inspect all labels on each selected email
2. Remove all user labels except the target
3. Add the target label

**Why this failed:**
- Relied on `paginatedEmails`, `emails`, `allTabEmails` - fragile UI state
- Emails not yet loaded couldn't have their labels inspected
- Mixed data sources led to incomplete label removal
- Tried to simulate "folders" by wiping all labels - not how Gmail works

**The fundamental mistake:** Trying to infer behavior from partial caches and simulate folder semantics on top of Gmail's label system.

---

## The Fix: Contextual Move Model

### Decision: Use Contextual Move, NOT "wipe all labels"

**Why Contextual Move:**
- Matches Gmail's actual mental model
- Avoids destructive surprises
- Zero reliance on fragile UI state
- O(1) logic per move - no label inspection needed
- Simple, deterministic, predictable

### Product Truth

> "Move means remove from where you are and add to where you go. Nothing else changes unless you explicitly ask for cleanup."

---

## Rule Set

### 1. Moving from a Label View

When the user is **inside label X** and moves emails to label Y:

**API Call:**
```typescript
removeLabelIds: [X]    // The current folder's label ID (labelIdParam)
addLabelIds: [Y]       // The target folder's label ID
```

**Result:**
- Email leaves X
- Email appears in Y
- All other labels stay untouched (VIP, 2025, etc.)

**Example:**
```
Email has labels: Invoices, VIP, 2025
User is in: Invoices
Action: Move to Invoices/Invoice Test 2

After move:
- Labels: Invoices/Invoice Test 2, VIP, 2025
- NOT in Invoices anymore
- Predictable, fast, no lookup needed
```

---

### 2. Moving from Inbox

Inbox is just the `INBOX` label.

**API Call:**
```typescript
removeLabelIds: ['INBOX']
addLabelIds: [Y]
```

**Example:**
```
User is in: Inbox
Action: Move to Invoices

After move:
- Removed from Inbox
- Added to Invoices
- Any existing user labels remain untouched
```

---

### 3. Drag & Drop

**Exact same logic as above.**
- No special casing
- No label introspection
- Just: remove source label, add target label

---

### 4. Optional: "Move and Clean Labels" (Future Enhancement)

If power users want the "single-folder" behavior, expose it **explicitly** as an opt-in feature.

**UI Option:**
- Checkbox: "Remove other labels" in MoveToFolderDialog

**API Logic (only when checkbox is checked):**
```typescript
// Collect labelIds from loaded messages
// Remove all user labels except target
// Add target label
```

**⚠️ This is destructive. It MUST be opt-in, never default.**

---

## What We Should NOT Do

| ❌ Bad Pattern | Why It's Wrong |
|---------------|----------------|
| Infer behavior from partial caches (`paginatedEmails`, mixed sources) | Data may be incomplete, leads to inconsistent behavior |
| Try to simulate folders by default | Gmail uses labels, not folders - don't fight it |
| Depend on per-message label inspection for normal moves | Requires loading all message data, slow and fragile |
| Different logic for bulk vs single email moves | Creates confusion and edge cases |

**That's how the bug happened in the first place.**

---

## Code Changes Required

### Current Code (Buggy)

```typescript
// useEmailSelection.ts - handleMoveSelected

// ❌ WRONG: Tries to collect all labels from emails
const emailsData = pageType === 'inbox' && !labelName 
  ? [...allTabEmails.all, ...]
  : emails;

emailIds.forEach(emailId => {
  const email = emailsData.find(e => e.id === emailId);
  if (email?.labelIds) {
    email.labelIds.forEach(lbl => {
      userLabelsToRemove.add(lbl);  // ❌ Fragile, incomplete
    });
  }
});
```

### New Code (Fixed)

```typescript
// useEmailSelection.ts - handleMoveSelected

// ✅ CORRECT: Simple contextual move
let labelsToRemove: string[];
let labelsToAdd: string[];

if (isMovingToInbox) {
  // Moving TO Inbox: just add INBOX, remove current folder
  labelsToAdd = ['INBOX'];
  labelsToRemove = labelIdParam ? [labelIdParam] : [];
} else {
  // Moving TO a folder: add target, remove source
  labelsToAdd = [labelId];
  
  if (labelIdParam) {
    // We're in a label folder - remove that label
    labelsToRemove = [labelIdParam];
  } else if (pageType === 'inbox') {
    // We're in Inbox - remove INBOX label
    labelsToRemove = ['INBOX'];
  } else {
    // Other views (sent, drafts, etc.) - just add, don't remove
    labelsToRemove = [];
  }
}

console.log(`📦 Moving ${emailCount} emails to "${targetLabelName}"`);
console.log(`   Remove: [${labelsToRemove.join(', ')}]`);
console.log(`   Add: [${labelsToAdd.join(', ')}]`);

await batchApplyLabelsToEmails(emailIds, labelsToAdd, labelsToRemove);
```

---

## Extended Selection Loading UI

### Current Behavior

- User can select up to 250 emails via "Select All in Folder"
- Initial load fetches 25 emails
- Each subsequent page fetch takes ~4 seconds
- Total time for 250 emails: ~40 seconds (10 fetches × 4 seconds)
- **No loading indicator during this time**

### Proposed UX: Full-Screen Loading Overlay

When user initiates an extended selection (selecting more than currently loaded emails), show a modal loading overlay that:

1. **Locks the UI** - Prevents accidental clicks/navigation
2. **Shows progress** - "Fetching emails: 75 of 250"
3. **Updates dynamically** - Progress bar + count updates after each batch
4. **Allows cancellation** - "Cancel" button to abort the operation
5. **Shows estimated time** - "~30 seconds remaining"

### UI Mockup

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           ┌────────────────────────────┐             │
│           │                            │             │
│           │    📧 Loading Emails...    │             │
│           │                            │             │
│           │    ████████░░░░░░░░░░░     │             │
│           │    75 of 250 emails        │             │
│           │                            │             │
│           │    ~30 seconds remaining   │             │
│           │                            │             │
│           │       [ Cancel ]           │             │
│           │                            │             │
│           └────────────────────────────┘             │
│                                                      │
│  (Background: Email list, dimmed and non-clickable) │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Technical Implementation

#### State Variables Needed

```typescript
const [isLoadingExtendedSelection, setIsLoadingExtendedSelection] = useState(false);
const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
const [loadingCancelled, setLoadingCancelled] = useState(false);
```

#### Time Estimation Logic

```typescript
const FETCH_TIME_PER_BATCH_MS = 4000;  // ~4 seconds per 25 emails
const BATCH_SIZE = 25;

const estimateRemainingTime = (current: number, total: number): string => {
  const remainingBatches = Math.ceil((total - current) / BATCH_SIZE);
  const remainingSeconds = remainingBatches * (FETCH_TIME_PER_BATCH_MS / 1000);
  
  if (remainingSeconds < 60) {
    return `~${remainingSeconds} seconds remaining`;
  }
  return `~${Math.ceil(remainingSeconds / 60)} minute(s) remaining`;
};
```

---

## Implementation Checklist

### Phase 1: Fix Move Logic (High Priority)
- [ ] Rewrite `handleMoveSelected` to use Contextual Move model
- [ ] Remove all label inspection code (no more `email.labelIds` lookup)
- [ ] Use only `labelIdParam` and `pageType` to determine source label
- [ ] Add debug logging for labels being added/removed
- [ ] Update drag-and-drop in `Layout.tsx` to use same logic
- [ ] Test all move scenarios (see below)

### Phase 2: Extended Selection Loading UI (Medium Priority)
- [ ] Create `ExtendedSelectionLoader` component
- [ ] Add loading state variables to `useEmailSelection`
- [ ] Modify `handleLoadMoreForSelection` to update progress
- [ ] Add cancellation support
- [ ] Add time estimation
- [ ] Style the modal (blur background, center content)

### Phase 3: Optional "Clean Labels" Feature (Low Priority)
- [ ] Add checkbox to MoveToFolderDialog: "Remove other labels"
- [ ] Implement label cleanup logic (only when opted in)
- [ ] Add warning tooltip explaining the destructive nature

---

## Testing Scenarios

### Move Logic Tests
| # | From | To | Expected Remove | Expected Add |
|---|------|-----|-----------------|--------------|
| 1 | Invoices | Invoices/Test | `[Invoices_ID]` | `[Test_ID]` |
| 2 | Invoices/Test | Invoices | `[Test_ID]` | `[Invoices_ID]` |
| 3 | Invoices | Clients | `[Invoices_ID]` | `[Clients_ID]` |
| 4 | Inbox | Invoices | `['INBOX']` | `[Invoices_ID]` |
| 5 | Invoices | Inbox | `[Invoices_ID]` | `['INBOX']` |
| 6 | Drag from Inbox | Drop on Folder | `['INBOX']` | `[Folder_ID]` |
| 7 | Drag from Folder | Drop on Inbox | `[Folder_ID]` | `['INBOX']` |

### Extended Selection Loading Tests
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Select 25 emails | No loading (already loaded) |
| 2 | Select 50 emails | 1 fetch, brief loading |
| 3 | Select 250 emails | Full loading experience (~40s) |
| 4 | Cancel at 100/250 | Stop fetching, keep 100 selected |
| 5 | Network error | Show error, allow retry |

---

## Related Files

| File | Changes Needed |
|------|----------------|
| `src/components/email/EmailPageLayout/hooks/useEmailSelection.ts` | Rewrite `handleMoveSelected` |
| `src/components/layout/Layout.tsx` | Update drag-and-drop move logic |
| `src/components/email/MoveToFolderDialog.tsx` | (Phase 3) Add "Remove other labels" checkbox |
| `src/components/email/ExtendedSelectionLoader.tsx` | (Phase 2) New component |
