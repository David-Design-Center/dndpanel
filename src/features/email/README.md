# Email Feature Architecture

## Overview

This folder contains the complete, modular email management system that replaces the monolithic 2,950-line `EmailPageLayout` component.

## Architecture

```
src/features/email/
├── hooks/                      # React hooks (business logic)
│   ├── useEmailListManager.ts # Main hook (manages all state)
│   └── index.ts
├── types/                      # TypeScript definitions
│   └── index.ts               # All shared types
├── services/                   # Services (optional, for future API calls)
├── utils/                      # Utilities (filters, formatters, etc.)
├── index.ts                   # Feature exports
└── README.md                  # This file
```

## Key Components

### `useEmailListManager` Hook

**What it does:**
- Manages email list state (active tab, pagination, selection)
- Provides interface to interact with repository
- Handles email mutations (delete, mark read, star)
- No UI concerns - pure business logic

**Usage:**
```tsx
const emailManager = useEmailListManager();

// Get visible emails
const emails = emailManager.getVisibleEmails();

// Switch tabs
emailManager.switchTab('trash');

// Delete email
await emailManager.deleteEmail(emailId);

// Get state
console.log(emailManager.state.activeTab);
```

### Repository Pattern

The `emailRepository` is the **single source of truth**:
- Stores all emails in one `Map<string, Email>`
- Provides computed views (getInboxEmails, getTrashEmails, etc.)
- All UI updates trigger through repository changes

## State Flow

```
Gmail API
    ↓
emailService.ts (fetch)
    ↓
emailRepository.addEmails() [Single source]
    ↓
useEmailListManager (manages views)
    ↓
EmailPageLayout UI (displays)
```

## Migration Path

### Before (OLD)
```tsx
// EmailPageLayout: 26+ useState calls
const [allTabEmails, setAllTabEmails] = useState(...) // 10 arrays
const [categoryEmails, setCategoryEmails] = useState(...) // 16 arrays
const [emails, setEmails] = useState(...) // 1 array
// Manual sync on every mutation
```

### After (NEW)
```tsx
// EmailPageLayout: 1 hook
const emailManager = useEmailListManager();
const emails = emailManager.getVisibleEmails();
// Automatic sync through repository
```

## Benefits

✅ **Single Source of Truth**: One repository, no sync issues
✅ **Easy to Test**: Hooks are pure functions
✅ **Scalable**: Add features without touching UI
✅ **Type-Safe**: Full TypeScript support
✅ **Maintainable**: 300+ lines per file vs 2950

## Next Steps

1. Update EmailPageLayout to use `useEmailListManager` hook
2. Remove 26+ array state declarations
3. Replace manual delete handlers with `emailManager.deleteEmail()`
4. Add pagination logic to hook
5. Extend with search/filter functionality

## Future Enhancements

- [ ] Add search filtering
- [ ] Add date range filtering
- [ ] Add attachment filtering
- [ ] Implement pagination with page tokens
- [ ] Add undo/redo for mutations
- [ ] Add offline support with local cache

