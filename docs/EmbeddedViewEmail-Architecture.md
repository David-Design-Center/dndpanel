# EmbeddedViewEmail - Architecture Reference

> **Purpose:** AI-navigable code map for debugging and maintenance.  
> **Last Updated:** 2026-01-17  
> **Main File:** `src/components/email/EmbeddedViewEmailClean.tsx` (3,272 lines)

---

## 📁 File Structure

```
src/components/email/
├── EmbeddedViewEmailClean.tsx          # Main component (orchestrator)
└── EmbeddedViewEmail/
    ├── index.ts                         # Re-exports
    ├── types.ts                         # TypeScript interfaces
    ├── components/
    │   ├── AttachmentPreviewModal.tsx   # Fullscreen attachment viewer
    │   ├── CreateFilterModal.tsx        # Gmail filter creation modal
    │   ├── CreateLabelModal.tsx         # New folder/label modal
    │   └── index.ts
    ├── hooks/
    │   ├── useEmailActions.ts           # Trash, spam, star, important, move
    │   ├── useDraftComposer.ts          # Auto-save drafts, dirty tracking
    │   ├── useInlineImages.ts           # CID image resolution
    │   └── index.ts
    └── utils/
        ├── formatters.ts                # Date, file size, initials formatting
        ├── senderColors.ts              # Avatar color generation
        ├── replyRecipients.ts           # Reply/ReplyAll recipient logic
        └── index.ts
```

---

## 🎯 Quick Issue Lookup

| User Reports | Look Here | File |
|--------------|-----------|------|
| "Trash button doesn't work" | `handleTrash` | `hooks/useEmailActions.ts` |
| "Spam button doesn't work" | `handleMarkAsSpam` | `hooks/useEmailActions.ts` |
| "Star toggle broken" | `handleToggleStarred` | `hooks/useEmailActions.ts` |
| "Important flag broken" | `handleToggleImportant` | `hooks/useEmailActions.ts` |
| "Move to folder broken" | `handleMoveToFolder` | `hooks/useEmailActions.ts` |
| "Mark as unread broken" | `handleMarkAsUnread` | `hooks/useEmailActions.ts` |
| "Draft not saving" | `saveDraft`, `handleDraftChange` | `hooks/useDraftComposer.ts` |
| "Draft saves too often/rarely" | `scheduleDebouncedSave` | `hooks/useDraftComposer.ts` |
| "Images not loading in email" | `loadInlineImagesForMessage` | `hooks/useInlineImages.ts` |
| "Attachment preview broken" | `AttachmentPreviewModal` | `components/AttachmentPreviewModal.tsx` |
| "Create filter modal broken" | `CreateFilterModal` | `components/CreateFilterModal.tsx` |
| "Create label modal broken" | `CreateLabelModal` | `components/CreateLabelModal.tsx` |
| "Reply recipients wrong" | `getReplyRecipients` | `utils/replyRecipients.ts` |
| "Date format wrong" | `formatEmailTime` | `utils/formatters.ts` |
| "Avatar color wrong" | `getSenderColor` | `utils/senderColors.ts` |
| "File size display wrong" | `formatFileSize` | `utils/formatters.ts` |

**For issues NOT in this table:** The logic is in `EmbeddedViewEmailClean.tsx`. Search for the relevant handler or JSX element.

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EmbeddedViewEmailClean.tsx                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Props: emailId, onEmailUpdate, onEmailDelete             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ State (50+ useState hooks)                               │   │
│  │ • email, threadMessages, loading, error                  │   │
│  │ • draftState (consolidated object)                       │   │
│  │ • showReplyComposer, replyMode, replyContent             │   │
│  │ • ccRecipients, bccRecipients                            │   │
│  │ • expandedMessages, loadedImages                         │   │
│  │ • Modal states (showCreateFilterModal, etc.)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐    │
│  │useEmailActions│   │useDraftComposer│   │useInlineImages │    │
│  │             │     │               │     │                │    │
│  │• handleTrash│     │• saveDraft    │     │• loadInline... │    │
│  │• handleSpam │     │• handleDraft  │     └─────────────────┘   │
│  │• handleStar │     │  Change       │                           │
│  │• etc.       │     │• timers       │                           │
│  └─────────────┘     └───────────────┘                           │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ JSX Render (~1,500 lines)                                │   │
│  │ • Toolbar (reply, forward, trash, more menu)             │   │
│  │ • Email header (sender, date, metadata dropdown)         │   │
│  │ • Thread messages (collapsed/expanded)                   │   │
│  │ • Reply composer (inline or fullscreen)                  │   │
│  │ • Modals (via createPortal)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Details

### `hooks/useEmailActions.ts` (~320 lines)

**Purpose:** All email state-changing actions with optimistic UI updates.

| Function | Gmail API | UI Update |
|----------|-----------|-----------|
| `handleTrash` | `trashEmail()` | Navigate back, emit `email-deleted` event |
| `handleMarkAsSpam` | `addLabels(['SPAM'])` | Navigate back, emit `email-deleted` event |
| `handleMoveToFolder` | `modifyLabels()` | Update `email.labelIds`, emit event |
| `handleMarkAsUnread` | `markAsUnread()` | Update `email.isRead`, emit event |
| `handleToggleImportant` | `addLabels/removeLabels(['IMPORTANT'])` | Toggle locally, emit event |
| `handleToggleStarred` | `starEmail/unstarEmail()` | Toggle locally, emit event |

**Dependencies:** Receives `email`, `setEmail`, `toast`, `onEmailUpdate`, `onEmailDelete` via options object.

---

### `hooks/useDraftComposer.ts` (~387 lines)

**Purpose:** Auto-save draft functionality with debouncing and conflict detection.

| Function | Description |
|----------|-------------|
| `saveDraft` | Create or update draft via Gmail API. Handles 404 (recreate) and 412 (version conflict). |
| `handleDraftChange` | Mark dirty + schedule debounced save. Call this on every content change. |
| `scheduleDebouncedSave` | 3s debounce timer + 30s failsafe timer. |
| `hashDraftState` | Content hash for change detection. |
| `isEmpty` | Check if draft content is empty (for auto-delete). |

**Managed Effects:**
- `beforeunload` - Save on page close
- Cleanup timers when composer closes

**Dependencies:** Receives many refs and state setters. Timer refs (`debounceSaveTimerRef`, `failsafeSaveTimerRef`) are shared with main component for navigation cleanup.

---

### `hooks/useInlineImages.ts` (~85 lines)

**Purpose:** Load inline images (cid: references) in email bodies.

| Function | Description |
|----------|-------------|
| `loadInlineImagesForMessage` | Fetch attachment data, replace cid: with data URLs, update message body. Retries 3x with 1s delay. |

**Dependencies:** Receives `loadedImages`, `threadMessages`, `setThreadMessages`, `setLoadedImages`.

---

### `components/AttachmentPreviewModal.tsx`

**Purpose:** Fullscreen overlay to view email attachments (images, PDFs).

**Props:**
```typescript
{
  attachment: { url: string; name: string; type: string } | null;
  onClose: () => void;
}
```

**Trigger:** Click on attachment thumbnail in email body.

---

### `components/CreateFilterModal.tsx`

**Purpose:** Modal for creating Gmail filters/rules based on sender.

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  labels: Label[];
  selectedLabelId: string;
  setSelectedLabelId: (id: string) => void;
  autoFilterFuture: boolean;
  setAutoFilterFuture: (value: boolean) => void;
  onSubmit: () => void;
}
```

---

### `components/CreateLabelModal.tsx`

**Purpose:** Modal for creating new Gmail labels/folders.

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  newLabelName: string;
  setNewLabelName: (name: string) => void;
  nestUnder: boolean;
  setNestUnder: (value: boolean) => void;
  parentLabel: string;
  setParentLabel: (label: string) => void;
  onSubmit: () => void;
}
```

---

### `utils/formatters.ts`

| Function | Input | Output |
|----------|-------|--------|
| `formatEmailTime(dateString)` | ISO date string | "2:30 PM" or "Jan 15" or "Jan 15, 2025" |
| `getInitials(name)` | "John Doe" | "JD" |
| `formatFileSize(bytes)` | 1536000 | "1.5 MB" |

---

### `utils/senderColors.ts`

| Function | Description |
|----------|-------------|
| `getSenderColor(email)` | Deterministic color from email hash (for avatar backgrounds) |
| `cleanDisplayName(name)` | Remove quotes and normalize display names |

---

### `utils/replyRecipients.ts`

| Function | Description |
|----------|-------------|
| `normalizeEmail(email)` | Lowercase, trim, extract from "Name <email>" format |
| `getReplyToMessage(threadMessages)` | Find the correct message to reply to in a thread |
| `getReplyRecipients(message, mode, currentUserEmail)` | Calculate To/CC for reply vs replyAll |

---

## 🔗 State Ownership

| State | Owner | Consumers |
|-------|-------|-----------|
| `email`, `threadMessages` | Main component | All hooks, modals |
| `draftState.*` (showComposer, content, etc.) | Main component | `useDraftComposer` |
| `loadedImages` | Main component | `useInlineImages` |
| `expandedMessages` | Main component | JSX, `useInlineImages` trigger |
| Modal states (`showCreateFilterModal`, etc.) | Main component | Modal components |
| Timer refs | Main component | `useDraftComposer`, navigation effect |

---

## ⚠️ Known Coupling Points

1. **Navigation Effect (lines ~470-560):** Clears timer refs and saves draft on email switch. Uses inline `createReplyDraft`/`updateReplyDraft` calls (not the hook) because it needs to capture state at the moment of navigation.

2. **Fullscreen Composer:** Still inline (~400 lines) because it accesses 20+ state variables. Would require context/reducer to extract.

3. **CC/BCC Handlers:** Inline because they call `handleDraftChange` and access contact search context.

4. **Send Handlers:** `handleSendReply`, `handleSendForward` are inline (~200 lines) because they touch many state variables.

---

## 🔍 Debugging Workflow

1. **Identify the symptom** (e.g., "star button doesn't update")
2. **Check Quick Issue Lookup table** above
3. **If found:** Go directly to that file
4. **If not found:** Search `EmbeddedViewEmailClean.tsx` for:
   - Handler name (e.g., `handleStar`, `onClickStar`)
   - JSX element (e.g., `<Star`, `star-button`)
5. **Trace the data flow:** Handler → API call → state update → UI re-render
6. **Check for event emissions:** Many handlers emit custom events like `email-deleted`, `inbox-refetch-required`

---

## 📝 When Adding New Features

1. **New email action?** Add to `useEmailActions.ts`
2. **New draft behavior?** Add to `useDraftComposer.ts`
3. **New modal?** Create in `components/`, add state in main component
4. **New utility?** Add to appropriate `utils/` file
5. **Complex feature touching many states?** Add inline to main component (document coupling)

---

## 🏷️ File Locations (Absolute Paths)

```
src/components/email/EmbeddedViewEmailClean.tsx
src/components/email/EmbeddedViewEmail/types.ts
src/components/email/EmbeddedViewEmail/hooks/useEmailActions.ts
src/components/email/EmbeddedViewEmail/hooks/useDraftComposer.ts
src/components/email/EmbeddedViewEmail/hooks/useInlineImages.ts
src/components/email/EmbeddedViewEmail/components/AttachmentPreviewModal.tsx
src/components/email/EmbeddedViewEmail/components/CreateFilterModal.tsx
src/components/email/EmbeddedViewEmail/components/CreateLabelModal.tsx
src/components/email/EmbeddedViewEmail/utils/formatters.ts
src/components/email/EmbeddedViewEmail/utils/senderColors.ts
src/components/email/EmbeddedViewEmail/utils/replyRecipients.ts
```
