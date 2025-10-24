# Email Page Layout Module

This folder contains the modularized `EmailPageLayout` component, broken down into focused, maintainable files.

## File Structure

```
EmailPageLayout/
├── state.ts          # State types, constants, and initialization
├── utils.ts          # Utility functions for sorting, filtering, formatting
├── index.ts          # Module exports
└── README.md         # This file
```

## Architecture

The original 2,747-line monolithic component has been decomposed into:

1. **state.ts** (~100 lines)
   - Type definitions: `TabKey`, `InboxViewMode`, `CategoryName`, `FolderType`
   - State interface: `EmailPageLayoutState`
   - Constants: Initial tab counts, pagination defaults
   - Factory function: `createInitialState()`

2. **utils.ts** (~140 lines)
   - `getEmailTimestampMs()` - Get email date as milliseconds
   - `getReceivedAtMs()` - Get received time as milliseconds
   - `sortEmailsByDate()` - Sort emails newest first
   - `calculateFocusedScore()` - Calculate email importance score
   - `filterEmailsBySearch()` - Filter by search query
   - `getEmailExcerpt()` - Get preview text
   - `formatSenderName()` - Format sender display name
   - `formatSubject()` - Format subject (handle truncation)
   - `isEmailToday()` - Check if email is from today
   - `getEmailDisplayDate()` - Get formatted date for display

## Integration with Main Component

The main `EmailPageLayout.tsx` component uses these exports:

```typescript
import { useEmailListManager } from '../../features/email/hooks';
import { 
  createInitialState, 
  sortEmailsByDate,
  calculateFocusedScore,
  // ... other utilities
} from './EmailPageLayout';

function EmailPageLayout() {
  const emailManager = useEmailListManager();
  // ... rest of component uses these utilities and types
}
```

## Next Steps in Phase 3

1. ✅ **Created state layer** - Types, constants, initialization
2. ✅ **Created utils layer** - Utility functions
3. ⏳ **Create handlers layer** - Async handlers (fetch, delete, etc.)
4. ⏳ **Create render layer** - Render logic and components
5. ⏳ **Main orchestrator** - Tie everything together
6. ⏳ **Replace arrays with hook** - Use useEmailListManager instead of 26+ useState

## Benefits of This Structure

- **Organized**: Each file has a clear single responsibility
- **Testable**: Utilities can be tested in isolation
- **Maintainable**: Easy to find and modify specific functionality
- **Scalable**: New utilities can be added without touching other files
- **Readable**: ~200-300 lines per file vs 2,747 lines total

## Related Files

- **Main component**: `/src/components/email/EmailPageLayout.tsx` (~600 lines after refactoring)
- **New backend**: `/src/services/emailRepository.ts` (single source of truth)
- **New hook**: `/src/features/email/hooks/useEmailListManager.ts` (state management)

## Migration Path

**Before** (current):
- 2,747 line monolithic component
- 26+ useState calls for parallel arrays
- Manual sync on every mutation
- Ghost emails and count mismatches

**After** (target):
- ~600 line main component
- 1 hook call: `const emailManager = useEmailListManager()`
- Automatic sync through repository
- ✅ Counts match Gmail (no duplicates)
