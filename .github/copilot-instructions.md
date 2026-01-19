# D&D Panel - Gmail Email Client

## ⚠️ CRITICAL: Gmail API Development Rule

**ALWAYS use the `workspace-developer` MCP to look up Gmail API documentation before:**
- Adding new Gmail API calls
- Modifying existing Gmail integration code  
- Debugging Gmail-related issues
- Proposing new email features

**Do NOT rely on patterns found in existing codebase.** Much of it was built without official documentation and may use deprecated or inefficient approaches. When in doubt, verify against current Gmail API docs via MCP.

---

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

### State Management Patterns
- **Optimistic UI**: Update local state immediately, sync with Gmail in background, revert on error
- **Event-Driven Updates**: Custom events for cross-component coordination (`draft-created`, `email-deleted`, `labels-need-refresh`, `inbox-refetch-required`)
- **Repository Pattern**: `emailRepository` as single source of truth (transitioning)

## File Structure Navigation

| Area | Path |
|------|------|
| Gmail API orchestrator | `src/integrations/gapiService.ts` |
| Gmail modules | `src/integrations/gmail/` |
| Email service layer | `src/services/emailService.ts` |
| React contexts | `src/contexts/` |
| Email UI components | `src/components/email/` |
| Thread viewer | `src/components/email/EmbeddedViewEmailClean.tsx` |
| Folders sidebar | `src/components/email labels/FoldersColumn.tsx` |

### 📖 EmbeddedViewEmail Architecture (Thread Viewer)

**For ANY issues with the email viewer/thread viewer component**, consult:
→ **`docs/EmbeddedViewEmail-Architecture.md`**

This document contains:
- Quick issue lookup table (symptom → file mapping)
- Module breakdown (hooks, components, utils)
- State ownership diagram
- Debugging workflow

The thread viewer was refactored from 4,108 lines into modular pieces:
- `hooks/useEmailActions.ts` - Trash, spam, star, important, move handlers
- `hooks/useDraftComposer.ts` - Auto-save drafts, dirty tracking, timers
- `hooks/useInlineImages.ts` - CID image resolution
- `components/` - Extracted modals (AttachmentPreview, CreateFilter, CreateLabel)
- `utils/` - Formatters, sender colors, reply recipient logic

## Code Style Conventions

- **Toast Notifications**: Use **sonner** library (`import { toast } from 'sonner'`). Do NOT use `useToast` from `@/components/ui/use-toast` - that hook is not connected to any Toaster component.
  - Success: `toast.success('Message')`
  - Error: `toast.error('Message')`
  - Info: `toast.message('Message')`
  - In EmbeddedViewEmailClean.tsx, sonner is imported as `sonnerToast` to avoid naming conflicts.
- **Logging**: Use emoji prefixes for grep-ability: `📝 Draft`, `🗑️ Delete`, `✅ Success`, `❌ Error`
- **Async Handlers**: Always wrap in try-catch with console.error for debugging
- **Comments**: Explain WHY not WHAT. Mark race conditions, timing issues prominently.
- **Component Size**: If >500 lines, consider extracting hooks or sub-components
- **Type Safety**: Avoid `any`, prefer `unknown` or proper types from `src/types/index.ts`

## Common Gotchas

1. **Draft ID vs Message ID**: Gmail drafts have BOTH. Use draft ID for API calls, message ID for UI updates.
2. **Stale Closures in Timers**: Use refs for values accessed in debounced/throttled callbacks.
3. **Context Dependencies**: `ProfileContext` depends on `AuthContext` - check provider hierarchy in `CoreProviders.tsx`
4. **Gmail API Rate Limits**: Use `queueGmailRequest()` wrapper for automatic retry with exponential backoff
5. **Cache Invalidation**: Clear caches when switching profiles via `clearEmailCacheForProfileSwitch()`
6. **Event Listeners**: Always clean up in useEffect return
