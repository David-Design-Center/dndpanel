# D&D Panel - Gmail Email Client

## Project Overview
React + TypeScript email client built on Gmail API. Uses Vite, Supabase for backend, and direct Gmail API integration (no Electron/backend proxy). Key focus: real-time draft management, thread handling, and optimistic UI updates.

## Architecture Patterns

### Gmail API Integration
- **Direct Gmail API calls** via `window.gapi.client.gmail` (no backend proxy)
- **Primary service layer**: `src/integrations/gapiService.ts` (~3,100 lines) - orchestrator with wrapper functions
- **Modular Gmail modules**: `src/integrations/gmail/` - specialized functionality
  - `send/compose.ts` - Email sending, draft saving
  - `send/replyDrafts.ts` - Reply draft lifecycle (create/update/delete/send)
  - `fetch/messages.ts` - Message fetching, threading
  - `operations/labels.ts` - Label management
  - `operations/mutations.ts` - Message state changes (trash, read, starred)
  - `parsing/` - Body extraction, charset handling

### Draft Management Architecture
**Critical Pattern**: Drafts in threads auto-load into reply composer

```typescript
// When fetching threads, filter out drafts from display
const draftMessage = sorted.find(msg => msg.labelIds?.includes('DRAFT'));
if (draftMessage) {
  const nonDraftMessages = sorted.filter(msg => !msg.labelIds?.includes('DRAFT'));
  setThreadMessages(nonDraftMessages);
  
  // Fetch FULL draft content (not partial)
  const fullDraft = await getEmailById(draftMessage.id);
  setReplyContent(fullDraft.body);
  setShowReplyComposer(true);
  setDraftId(draftMessage.id);
}
```

**Draft ID Tracking**: Store BOTH `draftId` (Gmail draft ID) and `messageId` (for UI removal):
- Gmail API uses draft ID for operations
- UI lists use message ID
- Track both to properly remove drafts from UI after send/discard

**Auto-save Pattern**: Reply drafts use refs to avoid stale closures in timers:
```typescript
const replyContentRef = useRef(replyContent);
// Update ref when value changes
replyContentRef.current = newContent;
// Use ref in saveDraft callback to avoid recreating function
const saveDraft = useCallback(() => {
  const content = replyContentRef.current; // Always current value
}, []); // Empty deps - stable function
```

### Context Architecture
**Provider Hierarchy** (see `src/providers/`):
```
CoreProviders (global, wraps entire app):
  - AuthProvider
  - SecurityProvider
  - ProfileProvider
  - LabelProvider

FeatureProviders (route-specific, wraps Layout):
  - EmailPreloaderProvider
  - ContactsProvider
  - FilterCreationProvider
  - LayoutStateProvider
  - EmailListProvider
  - ComposeProvider
```

**Context Pattern**: All contexts follow error-throwing hook pattern:
```typescript
export function useMyContext() {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

### State Management Patterns

**Optimistic UI Updates**: Update local state immediately, sync with Gmail in background:
```typescript
// ⚡ INSTANT: Update UI
const updatedEmail = { ...email, isRead: true };
setEmail(updatedEmail);
onEmailUpdate?.(updatedEmail);

// 🔄 BACKGROUND: Sync with Gmail
markAsRead(email.id).catch(() => {
  // Revert on error
  setEmail(email);
});
```

**Event-Driven Updates**: Custom events for cross-component coordination:
- `draft-created` - Increment draft counter
- `email-deleted` - Remove from UI, update counters
- `inbox-unread-24h` - Update recent unread count
- `inbox-refetch-required` - Trigger email list refresh

**Repository Pattern** (transitioning): `emailRepository` as single source of truth:
```typescript
// Add to repository
emailRepository.addEmail(email);

// Remove from repository (triggers UI updates via events)
emailRepository.deleteEmail(emailId);
window.dispatchEvent(new CustomEvent('email-deleted', { 
  detail: { emailId } 
}));
```

## Development Workflows

### Running the App
```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
```

### Gmail API Authentication
- Uses Google Identity Services (GIS) for OAuth
- Required scopes: gmail.modify, gmail.send, gmail.labels, contacts.readonly
- Token refresh handled automatically in `gapiService.ts`
- Auth state managed in `AuthContext` → `ProfileContext`

### Working with Drafts
**Creating reply drafts**:
1. User types in reply composer → auto-save triggers after 3s
2. `createReplyDraft()` saves to Gmail, emits `draft-created` event
3. Counter increments, draft appears in Drafts folder

**Loading existing drafts**:
1. Thread fetch detects DRAFT label → filters from thread display
2. Fetches full draft content via `getEmailById(draftId)`
3. Auto-loads into reply composer with `setShowReplyComposer(true)`
4. Sets `isDirty: false` to show "Continuing draft" badge

**Sending/discarding**:
1. Call `deleteDraft(draftId)` or Gmail send API
2. Emit `email-deleted` event with message ID (not draft ID!)
3. Counter decrements, draft removed from UI

### Email Threading
- Threads fetched via `fetchThreadMessages(threadId)`
- Messages sorted chronologically (oldest first)
- Latest non-draft message auto-expanded
- Drafts hidden from thread display but loaded into composer

## Common Gotchas

1. **Draft ID vs Message ID**: Gmail drafts have BOTH. Use draft ID for API calls, message ID for UI updates.

2. **Stale Closures in Timers**: Use refs for values accessed in debounced/throttled callbacks:
   ```typescript
   const valueRef = useRef(value);
   useEffect(() => { valueRef.current = value; }, [value]);
   ```

3. **Context Dependencies**: `ProfileContext` depends on `AuthContext` - always check provider hierarchy in `CoreProviders.tsx`

4. **Gmail API Rate Limits**: Use `queueGmailRequest()` wrapper for automatic retry with exponential backoff

5. **Cache Invalidation**: Clear caches when switching profiles:
   ```typescript
   clearEmailCacheForProfileSwitch();
   clearCurrentAccessToken();
   ```

6. **Event Listeners**: Always clean up in useEffect return:
   ```typescript
   useEffect(() => {
     window.addEventListener('draft-created', handler);
     return () => window.removeEventListener('draft-created', handler);
   }, []);
   ```

## File Structure Navigation

- `src/integrations/gapiService.ts` - Gmail API orchestrator (check here first for Gmail operations)
- `src/integrations/gmail/` - Modular Gmail functionality (reference implementations)
- `src/services/emailService.ts` - High-level email operations (uses gapiService internally)
- `src/contexts/` - React contexts (auth, profile, labels, contacts, layout)
- `src/components/email/` - Email UI components (list, viewer, compose)
- `src/pages/Compose.tsx` - Full-screen compose mode (new emails, standalone drafts)
- `src/components/email/EmbeddedViewEmailClean.tsx` - Thread viewer with inline reply composer
- `README/` - Extensive architecture docs (read when refactoring major systems)

## Testing Approach
Currently no formal test suite. Manual testing workflow:
1. Create draft → verify counter increments
2. Navigate away, return → verify draft auto-loads
3. Send draft → verify removed from UI and counter decrements
4. Discard draft → verify permanent deletion (not trash)

## Code Style Conventions

- **Logging**: Use emoji prefixes for grep-ability: `📝 Draft`, `🗑️ Delete`, `✅ Success`, `❌ Error`
- **Async Handlers**: Always wrap in try-catch with console.error for debugging
- **Comments**: Explain WHY not WHAT. Mark race conditions, timing issues prominently.
- **Component Size**: If >500 lines, consider extracting hooks or sub-components
- **Type Safety**: Avoid `any`, prefer `unknown` or proper types from `src/types/index.ts`

---

**For major refactoring**: Review relevant docs in `README/` folder (e.g., `EMAIL_ARCHITECTURE_ANALYSIS.md`, `REFACTORING_NOTES.md`)
