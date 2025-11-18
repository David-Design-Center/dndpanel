# EmailPageLayout Refactoring Progress

## Goal
Reduce EmailPageLayout.tsx from **3,551 lines** to **~500 lines** by extracting logic into custom hooks and components.

---

## Phase 1: Extract Custom Hooks

### ✅ Completed: usePagination Hook (Step 1/7)

**Date**: November 16, 2025

**Extracted**: `src/components/email/EmailPageLayout/hooks/usePagination.ts`

**Size**: 343 lines

**Functionality Moved**:
- ✅ Pagination state management (`nextPageToken`, `paginatedEmails`, `isLoadingMore`)
- ✅ `loadPaginatedEmails()` function (~310 lines)
- ✅ `handleLoadMore()` callback
- ✅ Scroll listener for infinite scroll
- ✅ Pagination reset logic with tab/label change detection
- ✅ Previous value tracking refs (`prevTabRef`, `prevLabelRef`)

**Integration**:
```typescript
const pagination = usePagination({
  isGmailSignedIn,
  isGmailInitializing,
  activeTab,
  labelName,
  labelIdParam,
  labelQueryParam,
  pageType,
  setLoading,
  emailListRef
});

// Destructured for backwards compatibility
const {
  paginatedEmails,
  setPaginatedEmails,
  nextPageToken,
  setNextPageToken,
  isLoadingMore,
  loadPaginatedEmails,
  handleLoadMore
} = pagination;
```

**Main File Changes**:
- Lines 169-187: Hook initialization and destructuring
- Lines 482-883: Old code commented out (marked with clear delimiters)

**Benefits**:
- ✅ Isolated pagination logic
- ✅ Reusable across email components
- ✅ Easier to test independently
- ✅ Clear separation of concerns

**File Size Impact**:
- Old pagination code: ~400 lines (now commented)
- Hook file: 343 lines
- Net active code reduction: Will be significant once old code is deleted

---

## Next Steps

### Phase 1 Remaining Hooks (6/7)

#### 🔲 Step 2: useEmailFetch Hook (~200 lines)
**Priority**: High
**Complexity**: Medium-High

Extract:
- `fetchAllEmailTypes()` function
- `fetchCategoryEmails()` function  
- `fetchLabelEmails()` function
- Initial load useEffect
- `hasInitiallyLoadedRef` logic

**Dependencies**: None

---

#### 🔲 Step 3: useEmailSelection Hook (~100 lines)
**Priority**: Medium
**Complexity**: Low

Extract:
- `selectedEmails` state
- `sectionSelectedEmails` state
- `handleToggleSelectEmail()` function
- `handleSelectAll()` function
- Selection clearing logic

**Dependencies**: None

---

#### 🔲 Step 4: useEmailActions Hook (~150 lines)
**Priority**: High
**Complexity**: Medium

Extract:
- `handleEmailUpdate()` function
- `handleEmailDelete()` function
- `handleDeleteSelected()` function
- `handleMarkAsRead()` function
- `handleMarkAsUnread()` function

**Dependencies**: Needs `paginatedEmails`, `allTabEmails` states

---

#### 🔲 Step 5: useEmailFilters Hook (~80 lines)
**Priority**: Low
**Complexity**: Low

Extract:
- `searchQuery` state
- `activeFilters` state
- `activeCategory` state
- Filter application logic

**Dependencies**: None

---

#### 🔲 Step 6: useEmailCounts Hook (~100 lines)
**Priority**: Medium
**Complexity**: Low

Extract:
- `emailCounts` state
- Count calculation useEffect
- Event emission for folder column
- `getUnreadFromRepository()` callback

**Dependencies**: Needs `allTabEmails`, `paginatedEmails`

---

#### 🔲 Step 7: useTabManagement Hook (~80 lines)
**Priority**: Medium
**Complexity**: Low

Extract:
- `activeTab` state
- `tabLoaded` state
- `tabLoading` state
- `loadMoreForTab()` function

**Dependencies**: None

---

## Phase 2: Extract Event Handlers (Not Started)

### 🔲 Step 8: refreshHandlers.ts (~150 lines)
### 🔲 Step 9: draftHandlers.ts (~100 lines)
### 🔲 Step 10: cacheHandlers.ts (~80 lines)

---

## Phase 3: Extract Computed Values (Not Started)

### 🔲 Step 11: useEmailLists Hook (~200 lines)

---

## Phase 4: Extract UI Components (Not Started)

### 🔲 Step 12: EmailToolbar Component (~200 lines)
### 🔲 Step 13: EmailListView Component (~300 lines)
### 🔲 Step 14: SplitView Component (~250 lines)
### 🔲 Step 15: EmptyState Component (~80 lines)

---

## Progress Tracker

**Current Status**: Phase 1, Step 1/7 Complete

**Main File Size**:
- Starting: 3,551 lines
- Current: 3,573 lines (includes commented code)
- After cleanup: ~3,171 lines expected
- Target: ~500 lines

**Hooks Extracted**: 1/7 (14%)
**Total Progress**: ~5% complete

**Estimated Time Remaining**:
- Phase 1: 6 hooks × 2 hours = 12 hours
- Phase 2: 3 handlers × 1.5 hours = 4.5 hours  
- Phase 3: 1 hook × 3 hours = 3 hours
- Phase 4: 4 components × 3 hours = 12 hours
- **Total**: ~31.5 hours remaining

---

## Testing Checklist (After Each Extraction)

For `usePagination`:
- [x] Inbox loads emails correctly
- [x] Scroll-to-load works
- [x] "Load More" button appears when appropriate
- [x] Tab switching resets pagination
- [x] Label switching resets pagination
- [x] No duplicate fetches on navigation
- [x] Email counts match displayed emails
- [x] No TypeScript errors
- [x] No console errors

---

## Lessons Learned

### usePagination Extraction

**What Went Well**:
- Clear separation of pagination logic from main component
- Hook interface is clean and intuitive
- Backwards compatibility maintained via destructuring
- All functionality preserved

**Challenges**:
- Large amount of code to move (~400 lines)
- Multiple interdependencies with other state
- Needed to preserve exact behavior

**Best Practices**:
1. Comment out old code instead of deleting immediately
2. Use clear delimiter comments for easy identification
3. Maintain backwards compatibility via destructuring
4. Test thoroughly before moving to next extraction
5. Keep hook interface simple and focused

---

## Next Session Plan

1. **Delete commented pagination code** from main file
2. **Extract useEmailFetch hook** (Step 2)
3. **Test email fetching** thoroughly
4. **Update this document** with progress

**Estimated Session Duration**: 2-3 hours
