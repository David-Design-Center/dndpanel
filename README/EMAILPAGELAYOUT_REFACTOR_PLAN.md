# EmailPageLayout.tsx Refactoring Plan
## Goal: Reduce from 3,551 lines → ~500 lines

---

## Current State Analysis

### File Size
- **Main file**: 3,551 lines
- **Target**: 500 lines max
- **Reduction needed**: ~3,000 lines (85% reduction)

### Existing Modules (EmailPageLayout/ folder)
- `state.ts` - Type definitions & constants
- `utils.ts` - Utility functions
- `handlers.ts` - Event handlers & async operations
- `render.ts` - Render logic helpers
- `index.ts` - Module exports

---

## Refactoring Strategy

### Phase 1: Extract Hooks (Custom Hooks)
**Location**: `src/components/email/EmailPageLayout/hooks/`

#### 1.1 `usePagination.ts` (~150 lines)
```typescript
export function usePagination(options: {
  isGmailSignedIn: boolean;
  activeTab: string;
  labelName: string | null;
}) {
  // State
  const [nextPageToken, setNextPageToken] = useState<string>();
  const [paginatedEmails, setPaginatedEmails] = useState<Email[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Refs
  const prevTabRef = useRef(activeTab);
  const prevLabelRef = useRef(labelName);
  
  // Functions
  const loadPaginatedEmails = async (pageToken?, append?) => {...}
  const handleLoadMore = useCallback(() => {...}, [...]);
  
  // Effects
  useEffect(() => {
    // Pagination reset logic (lines 815-858)
  }, [activeTab, labelName, ...]);
  
  return {
    paginatedEmails,
    nextPageToken,
    isLoadingMore,
    loadPaginatedEmails,
    handleLoadMore,
    resetPagination: () => {...}
  };
}
```
**Extracts**: Lines 466-858 (pagination logic)

---

#### 1.2 `useEmailFetch.ts` (~200 lines)
```typescript
export function useEmailFetch(options: {
  isGmailSignedIn: boolean;
  pageType: string;
  labelName: string | null;
}) {
  const hasInitiallyLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [allTabEmails, setAllTabEmails] = useState<Record<TabKey, Email[]>>({...});
  
  // Main fetch functions
  const fetchAllEmailTypes = async (forceRefresh?) => {...}
  const fetchCategoryEmails = async (forceRefresh?) => {...}
  const fetchLabelEmails = async (forceRefresh?) => {...}
  
  // Effects
  useEffect(() => {
    // Initial load logic (lines 1437-1463)
  }, [isGmailSignedIn, pageType, ...]);
  
  return {
    loading,
    allTabEmails,
    fetchAllEmailTypes,
    fetchCategoryEmails,
    fetchLabelEmails,
    hasLoaded: hasInitiallyLoadedRef.current
  };
}
```
**Extracts**: Lines 868-1463 (fetch logic)

---

#### 1.3 `useEmailSelection.ts` (~100 lines)
```typescript
export function useEmailSelection() {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [sectionSelectedEmails, setSectionSelectedEmails] = useState<Set<string>>(new Set());
  
  const handleToggleSelectEmail = (emailId: string) => {...}
  const handleSelectAll = (emails: Email[]) => {...}
  const clearSelection = () => {...}
  
  return {
    selectedEmails,
    sectionSelectedEmails,
    handleToggleSelectEmail,
    handleSelectAll,
    clearSelection,
    selectionCount: selectedEmails.size
  };
}
```
**Extracts**: Lines 1778-1880 (selection logic)

---

#### 1.4 `useEmailActions.ts` (~150 lines)
```typescript
export function useEmailActions(options: {
  allTabEmails: Record<TabKey, Email[]>;
  setAllTabEmails: (fn) => void;
  paginatedEmails: Email[];
  setPaginatedEmails: (fn) => void;
}) {
  const handleEmailUpdate = (updatedEmail: Email) => {...}
  const handleEmailDelete = async (emailId: string) => {...}
  const handleDeleteSelected = async (emailIds: Set<string>) => {...}
  const handleMarkAsRead = async (emailId: string) => {...}
  const handleMarkAsUnread = async (emailId: string) => {...}
  
  return {
    handleEmailUpdate,
    handleEmailDelete,
    handleDeleteSelected,
    handleMarkAsRead,
    handleMarkAsUnread
  };
}
```
**Extracts**: Lines 2290-2440 (email actions)

---

#### 1.5 `useEmailFilters.ts` (~80 lines)
```typescript
export function useEmailFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    unread: false,
    attachments: false,
    starred: false
  });
  const [activeCategory, setActiveCategory] = useState<CategoryName>('primary');
  
  const applyFilters = useCallback((emails: Email[]) => {
    // Filter logic
  }, [searchQuery, activeFilters, activeCategory]);
  
  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    activeCategory,
    setActiveCategory,
    applyFilters
  };
}
```
**Extracts**: Lines 149-156, 2070-2120 (filter state & logic)

---

#### 1.6 `useEmailCounts.ts` (~100 lines)
```typescript
export function useEmailCounts(options: {
  allTabEmails: Record<TabKey, Email[]>;
  paginatedEmails: Email[];
}) {
  const [emailCounts, setEmailCounts] = useState({
    unread: 0,
    drafts: 0,
    trash: 0
  });
  
  // Effects to calculate counts
  useEffect(() => {
    // Count unread emails (lines 2203-2240)
  }, [allTabEmails.all]);
  
  // Emit events for folder column
  useEffect(() => {
    // Emit inbox-unread-count (lines 2169-2179)
  }, [paginatedEmails]);
  
  return {
    emailCounts,
    unreadCount: emailCounts.unread,
    draftsCount: emailCounts.drafts,
    trashCount: emailCounts.trash
  };
}
```
**Extracts**: Lines 2169-2240 (count calculation)

---

#### 1.7 `useTabManagement.ts` (~80 lines)
```typescript
export function useTabManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [tabLoaded, setTabLoaded] = useState<Record<TabKey, boolean>>({...});
  const [tabLoading, setTabLoading] = useState<string | null>(null);
  
  const loadMoreForTab = async (tab: TabKey, options?) => {...}
  
  return {
    activeTab,
    setActiveTab,
    tabLoaded,
    tabLoading,
    loadMoreForTab
  };
}
```
**Extracts**: Lines 157, 334-350, 1058-1350 (tab state & loading)

---

### Phase 2: Extract Event Handlers
**Location**: `src/components/email/EmailPageLayout/handlers/`

#### 2.1 `refreshHandlers.ts` (~150 lines)
```typescript
export function createRefreshHandlers(context: EmailPageContext) {
  const handleRefresh = async () => {
    // Lines 1500-1530
  }
  
  const handleRefreshCurrentTab = async () => {
    // Lines 1538-1615
  }
  
  return {
    handleRefresh,
    handleRefreshCurrentTab
  };
}
```

#### 2.2 `draftHandlers.ts` (~100 lines)
```typescript
export function createDraftHandlers(context: EmailPageContext) {
  const handleDraftCreated = async (event: CustomEvent) => {
    // Lines 1705-1730
  }
  
  const handleDraftUpdated = async (event: CustomEvent) => {
    // Lines 1735-1760
  }
  
  return {
    handleDraftCreated,
    handleDraftUpdated
  };
}
```

---

### Phase 3: Extract Computed Values
**Location**: `src/components/email/EmailPageLayout/computed/`

#### 3.1 `emailLists.ts` (~200 lines)
```typescript
export function useEmailLists(options: {
  paginatedEmails: Email[];
  allTabEmails: Record<TabKey, Email[]>;
  activeTab: TabKey;
  labelName: string | null;
  filters: FilterState;
}) {
  // Split view logic
  const splitSource = useMemo(() => {...}, [...]);
  const splitUnread = useMemo(() => {...}, [...]);
  const splitRead = useMemo(() => {...}, [...]);
  
  // Filtered emails
  const filteredEmails = useMemo(() => {...}, [...]);
  const baseVisible = useMemo(() => {...}, [...]);
  const visibleEmails = useMemo(() => {...}, [...]);
  
  return {
    splitSource,
    splitUnread,
    splitRead,
    filteredEmails,
    baseVisible,
    visibleEmails
  };
}
```
**Extracts**: Lines 2070-2195 (computed email lists)

---

### Phase 4: Extract UI Components
**Location**: `src/components/email/EmailPageLayout/components/`

#### 4.1 `EmailToolbar.tsx` (~200 lines)
```tsx
export function EmailToolbar({
  activeTab,
  onTabChange,
  selectedCount,
  onDeleteSelected,
  onMarkReadSelected,
  onRefresh,
  isRefreshing
}: EmailToolbarProps) {
  return (
    // Lines 2800-3000 (toolbar UI)
  );
}
```

#### 4.2 `EmailListView.tsx` (~300 lines)
```tsx
export function EmailListView({
  emails,
  onEmailClick,
  onEmailUpdate,
  onEmailDelete,
  selectedEmails,
  onToggleSelect
}: EmailListViewProps) {
  return (
    // Lines 3050-3350 (email list rendering)
  );
}
```

#### 4.3 `SplitView.tsx` (~250 lines)
```tsx
export function SplitView({
  unreadEmails,
  readEmails,
  onEmailClick,
  onEmailUpdate
}: SplitViewProps) {
  return (
    // Lines 3100-3350 (split view UI)
  );
}
```

#### 4.4 `EmptyState.tsx` (~80 lines)
```tsx
export function EmptyState({
  type,
  onCompose
}: EmptyStateProps) {
  return (
    // Lines 2950-3030 (empty states)
  );
}
```

---

### Phase 5: Extract Constants & Types
**Location**: `src/components/email/EmailPageLayout/constants/`

#### 5.1 `types.ts`
```typescript
export type TabKey = 'all' | 'unread' | 'sent' | ...;
export type InboxViewMode = 'split' | 'unread' | 'read';
export type CategoryName = 'primary' | 'updates' | ...;

export interface EmailPageContext {
  isGmailSignedIn: boolean;
  pageType: EmailPageType;
  labelName: string | null;
  // ... all shared context
}
```

#### 5.2 `config.ts`
```typescript
export const SECTION_PAGE_SIZE = 25;
export const PAGE_SIZE = 50;
export const CATEGORIES_ENABLED = true;
export const TAB_KEYS: TabKey[] = ['all', 'unread', ...];
```

---

## Final Structure

```
src/components/email/EmailPageLayout/
├── hooks/
│   ├── usePagination.ts          (150 lines)
│   ├── useEmailFetch.ts          (200 lines)
│   ├── useEmailSelection.ts      (100 lines)
│   ├── useEmailActions.ts        (150 lines)
│   ├── useEmailFilters.ts        (80 lines)
│   ├── useEmailCounts.ts         (100 lines)
│   ├── useTabManagement.ts       (80 lines)
│   └── index.ts                  (exports)
│
├── handlers/
│   ├── refreshHandlers.ts        (150 lines)
│   ├── draftHandlers.ts          (100 lines)
│   ├── cacheHandlers.ts          (80 lines)
│   └── index.ts                  (exports)
│
├── computed/
│   ├── emailLists.ts             (200 lines)
│   └── index.ts                  (exports)
│
├── components/
│   ├── EmailToolbar.tsx          (200 lines)
│   ├── EmailListView.tsx         (300 lines)
│   ├── SplitView.tsx             (250 lines)
│   ├── EmptyState.tsx            (80 lines)
│   └── index.ts                  (exports)
│
├── constants/
│   ├── types.ts                  (100 lines)
│   ├── config.ts                 (50 lines)
│   └── index.ts                  (exports)
│
├── utils.ts                      (existing)
├── state.ts                      (existing)
├── render.ts                     (existing)
└── index.ts                      (main exports)
```

---

## Refactored Main File

**EmailPageLayout.tsx** (~500 lines)

```tsx
import { usePagination } from './EmailPageLayout/hooks/usePagination';
import { useEmailFetch } from './EmailPageLayout/hooks/useEmailFetch';
import { useEmailSelection } from './EmailPageLayout/hooks/useEmailSelection';
import { useEmailActions } from './EmailPageLayout/hooks/useEmailActions';
import { useEmailFilters } from './EmailPageLayout/hooks/useEmailFilters';
import { useEmailCounts } from './EmailPageLayout/hooks/useEmailCounts';
import { useTabManagement } from './EmailPageLayout/hooks/useTabManagement';
import { useEmailLists } from './EmailPageLayout/computed/emailLists';
import { EmailToolbar, EmailListView, SplitView, EmptyState } from './EmailPageLayout/components';
import { createRefreshHandlers, createDraftHandlers } from './EmailPageLayout/handlers';
import { EmailPageContext } from './EmailPageLayout/constants/types';

function EmailPageLayout({ pageType, title }: EmailPageLayoutProps) {
  // Core hooks
  const { isGmailSignedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract URL params
  const labelName = new URLSearchParams(location.search).get('labelName');
  
  // Custom hooks (all state & logic extracted)
  const pagination = usePagination({ isGmailSignedIn, activeTab, labelName });
  const emailFetch = useEmailFetch({ isGmailSignedIn, pageType, labelName });
  const selection = useEmailSelection();
  const filters = useEmailFilters();
  const tabs = useTabManagement();
  const actions = useEmailActions({
    allTabEmails: emailFetch.allTabEmails,
    setAllTabEmails: emailFetch.setAllTabEmails,
    paginatedEmails: pagination.paginatedEmails,
    setPaginatedEmails: pagination.setPaginatedEmails
  });
  const counts = useEmailCounts({
    allTabEmails: emailFetch.allTabEmails,
    paginatedEmails: pagination.paginatedEmails
  });
  
  // Computed lists
  const lists = useEmailLists({
    paginatedEmails: pagination.paginatedEmails,
    allTabEmails: emailFetch.allTabEmails,
    activeTab: tabs.activeTab,
    labelName,
    filters: filters.activeFilters
  });
  
  // Event handlers
  const context: EmailPageContext = {
    isGmailSignedIn,
    pageType,
    labelName,
    // ... pass everything needed
  };
  const refreshHandlers = createRefreshHandlers(context);
  const draftHandlers = createDraftHandlers(context);
  
  // Event listeners
  useEffect(() => {
    window.addEventListener('draft-created', draftHandlers.handleDraftCreated);
    window.addEventListener('draft-updated', draftHandlers.handleDraftUpdated);
    return () => {
      window.removeEventListener('draft-created', draftHandlers.handleDraftCreated);
      window.removeEventListener('draft-updated', draftHandlers.handleDraftUpdated);
    };
  }, []);
  
  // Render
  return (
    <ThreeColumnLayout>
      <EmailToolbar
        activeTab={tabs.activeTab}
        onTabChange={tabs.setActiveTab}
        selectedCount={selection.selectionCount}
        onDeleteSelected={actions.handleDeleteSelected}
        onRefresh={refreshHandlers.handleRefresh}
      />
      
      {lists.visibleEmails.length === 0 ? (
        <EmptyState type={pageType} />
      ) : (
        <EmailListView
          emails={lists.visibleEmails}
          onEmailClick={handleEmailClick}
          onEmailUpdate={actions.handleEmailUpdate}
          onEmailDelete={actions.handleEmailDelete}
          selectedEmails={selection.selectedEmails}
          onToggleSelect={selection.handleToggleSelectEmail}
        />
      )}
    </ThreeColumnLayout>
  );
}
```

---

## Implementation Order

### Week 1: Hooks Extraction
1. Day 1-2: `usePagination.ts` + `useTabManagement.ts`
2. Day 3-4: `useEmailFetch.ts`
3. Day 5: `useEmailSelection.ts` + `useEmailFilters.ts`

### Week 2: More Hooks + Handlers
1. Day 1-2: `useEmailActions.ts` + `useEmailCounts.ts`
2. Day 3-4: Extract all handlers (refresh, draft, cache)
3. Day 5: `useEmailLists.ts` (computed values)

### Week 3: UI Components
1. Day 1-2: `EmailToolbar.tsx` + `EmptyState.tsx`
2. Day 3-4: `EmailListView.tsx`
3. Day 5: `SplitView.tsx`

### Week 4: Integration & Testing
1. Day 1-2: Wire everything together in main file
2. Day 3-4: Test all functionality
3. Day 5: Fix bugs, optimize

---

## Success Criteria

- ✅ Main file < 500 lines
- ✅ Each hook < 200 lines
- ✅ Each component < 300 lines
- ✅ All existing functionality works
- ✅ No performance regression
- ✅ Improved maintainability

---

## Benefits

1. **Testability**: Each hook can be unit tested independently
2. **Reusability**: Hooks can be used in other email components
3. **Clarity**: Clear separation of concerns
4. **Performance**: Easier to optimize individual pieces
5. **Collaboration**: Multiple developers can work on different hooks
6. **Debugging**: Easier to isolate issues

---

## Next Steps

1. Create feature branch: `refactor/email-page-layout`
2. Start with `usePagination.ts` (smallest, most isolated)
3. Test each extraction before moving to next
4. Keep old code commented out until verified
5. Update tests progressively
