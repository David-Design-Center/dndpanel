# Email List Architecture Skeleton

## Component Structure

### Main Email List Component
**Location**: `src/components/email/EmailPageLayout.tsx` (3549 lines)

### Email List Item Modules
**Location**: `src/components/email/EmailListItem/`
- `EmailItemActions.tsx` - Action buttons (delete, archive, etc.)
- `EmailItemContent.tsx` - Email subject, snippet, sender display
- `EmailItemControls.tsx` - Checkboxes, star, important controls
- `EmailItemContextMenu.tsx` - Right-click menu
- `EmailItemDate.tsx` - Date/time formatting
- `CreateLabelModal.tsx` - Label creation dialog
- `CreateFilterModal.tsx` - Filter creation dialog

**Main Component**: `src/components/email/EmailListItem.tsx`

---

## Data Flow - Email List Display

### 1. Initial Load
```
User navigates to /inbox
  ↓
EmailPageLayout mounts
  ↓
Pagination useEffect triggers (line ~813)
  → Checks: activeTab, labelName, isGmailSignedIn, isGmailInitializing
  → IF changed: Reset & load first page
  ↓
loadPaginatedEmails() called (line ~466)
  → Fetches emails via emailService.getEmails()
  → Updates paginatedEmails state
  ↓
PARALLEL: fetchAllEmailTypes() called (line ~868)
  → Optimized fetch for all tabs (drafts, sent, etc.)
  → Updates allTabEmails state
```

### 2. Email Display Pipeline
```
paginatedEmails (state)
  ↓
filteredEmails (computed via useMemo, line ~2000+)
  → Applies: search, filters, tab selection
  ↓
baseVisible (computed)
  → Pagination slice based on pageIndex
  ↓
visibleEmails (rendered in UI)
  → Maps to EmailListItem components
```

### 3. Navigation to Email View
```
User clicks email
  ↓
handleEmailClick() (line ~2247)
  → navigate(`/inbox/email/:id`)
  ↓
URL changes: /inbox → /inbox/email/:id
  ↓
React Router re-renders (component stays mounted!)
  ↓
Pagination useEffect triggers AGAIN
  → prevTabRef check: activeTab unchanged ✓
  → prevLabelRef check: labelName unchanged ✓
  → SHOULD skip reset (line ~839)
  ↓
fetchAllEmailTypes useEffect triggers (line ~1437)
  → hasInitiallyLoadedRef check
  → IF true: SKIP fetch ✓
  → IF false: FETCH (PROBLEM!)
```

---

## Current Issues

### Issue #1: Empty List After Opening Email
**Symptom**: Email list shows 0 emails after clicking to view one

**Root Cause**: `hasInitiallyLoadedRef` is set BEFORE `fetchAllEmailTypes` completes
- Line 1447: `hasInitiallyLoadedRef.current = true` (synchronous)
- Line 1448: `fetchAllEmailTypes()` (async, not awaited)
- When opening email: ref is `false` → triggers fetch → list gets reset

**Fix Applied**: Set ref AFTER fetch completes
```typescript
fetchAllEmailTypes().then(() => {
  hasInitiallyLoadedRef.current = true;
});
```

### Issue #2: Duplicate Fetches on Navigation
**Symptom**: Emails refetch when navigating /inbox → /inbox/email/:id

**Attempted Fixes**:
1. ✓ Added prevTabRef/prevLabelRef to detect actual changes
2. ✓ Skip pagination reset if no actual change
3. ✓ Added hasInitiallyLoadedRef to prevent duplicate fetchAllEmailTypes
4. ⚠️ Ref timing issue (fixed above)

---

## State Management

### Primary Email State
```typescript
paginatedEmails: Email[]  // Loaded via infinite scroll
allTabEmails: {           // Per-tab storage
  all: Email[]
  unread: Email[]
  sent: Email[]
  drafts: Email[]
  // ... etc
}
```

### Pagination State
```typescript
nextPageToken: string | undefined  // Gmail API pagination
isLoadingMore: boolean
loading: boolean
```

### Refs (prevent unnecessary re-fetches)
```typescript
hasInitiallyLoadedRef      // Has inbox loaded at least once?
prevTabRef                 // Previous activeTab value
prevLabelRef               // Previous labelName value
```

---

## Key Dependencies

### Pagination Reset Triggers
**Dependencies**: `[activeTab, labelName, isGmailSignedIn, isGmailInitializing]`
- Only resets if activeTab or labelName ACTUALLY changed (not just re-render)

### Initial Fetch Triggers
**Dependencies**: `[isGmailSignedIn, pageType, labelName, authLoading, isGmailInitializing]`
- Only fetches if `hasInitiallyLoadedRef.current === false`

---

## Event System

### Events Emitted
```typescript
'inbox-unread-count'       // Emitted when unread count changes
  → Consumed by: FoldersColumn
  → Source: paginatedEmails.filter(e => !e.isRead).length
```

### Events Consumed
```typescript
'clear-all-caches'         // Reset all state
'inbox-refetch-required'   // Refetch after label change
'draft-created'            // Add new draft to list
'draft-updated'            // Update existing draft
```

---

## Critical Code Locations

### Email Fetching
- `loadPaginatedEmails()` - Line ~466 (paginated inbox)
- `fetchAllEmailTypes()` - Line ~868 (optimized multi-tab fetch)
- `fetchLabelEmails()` - Line ~1468 (label-specific)

### State Updates
- `setPaginatedEmails()` - Updates after fetch
- `setAllTabEmails()` - Updates per-tab storage
- `setLoading()` - Controls loading state

### Navigation Handlers
- `handleEmailClick()` - Line ~2247 (navigate to email view)
- `handleEmailUpdate()` - Line ~2268 (mark read/unread)
- `handleEmailDelete()` - Delete from list

---

## Testing Checklist

- [ ] Load inbox → emails appear
- [ ] Click email → email view opens, list stays visible
- [ ] Navigate back → list unchanged
- [ ] Switch tabs → list reloads
- [ ] Switch labels → list reloads
- [ ] Scroll down → more emails load
- [ ] Mark as read → counter updates, list stays
- [ ] Delete email → removes from list immediately
