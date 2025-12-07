# Folder Moves & Compose Expansion

Email management upgrades: drag/drop moves, bulk move dialog, compose resize, spam-drag automation, and rule retroactivity.

---

## Phase 1: Quick Wins

### 1. Compose Expansion (~2 hours) ✅
- [x] Add `isExpanded` state to `ComposeContext`
- [x] Add expand/collapse toggle button in compose header
- [x] Update container classes: normal `w-[600px]` → expanded `inset-4` (full screen minus margins)
- [x] Test focus and keyboard handling in expanded mode
- [x] Add metadata dropdown of each email. from: Sender name and email, to: Recipients, date: Full date and time, subject: Email subject, cc: CC recipients (if any)

**Files:** `src/contexts/ComposeContext.tsx`, `src/pages/Compose.tsx`

---

### 2. Bulk Move Dialog (~3 hours) ✅
- [x] Add "Move" button to bulk action bar in `EmailPageLayout.tsx`
- [x] Create `MoveToFolderDialog` component with folder picker (reuse `TreeView` + `labelTree`)
- [x] Implement `handleMoveSelected(labelId)` in `useEmailSelection` hook
- [x] Call `applyLabelsToEmail` for each selected email (or batch if available)
- [x] Refresh label counts via `LabelContext` after move
- [x] Test with multiple selected emails

**Files:** `src/components/email/EmailPageLayout.tsx`, `src/components/email/EmailPageLayout/hooks/useEmailSelection.ts`, new `MoveToFolderDialog.tsx`

---

## Phase 2: Core Feature

### 3. Drag Emails Into Folders (~5 hours) ✅
- [x] Remove `restrictToVerticalAxis` modifier from `DndContext`
- [x] Add `useDroppable` to folder items in `FoldersColumn.tsx`
- [x] Create event bridge or lift `DndContext` to share between EmailPageLayout and FoldersColumn
- [x] Implement real `handleDragEnd` → detect folder drop → call `applyLabelsToEmail`
- [x] Add visual feedback (highlight folder on drag-over)
- [x] Handle special cases: Trash (use `markEmailAsTrash`), Spam (add SPAM label)
- [x] Multi-email drag: if dragged email is in selection, move all selected emails
- [x] Drag overlay shows count badge for multiple emails
- [ ] Test drag from email list to sidebar folders

**Files:** 
- `src/contexts/EmailDndContext.tsx` (NEW - shared DnD context with sensors, handlers, drag overlay)
- `src/components/email/DroppableFolderItem.tsx` (NEW - drop target wrapper with visual feedback)
- `src/components/layout/Layout.tsx` (wraps email routes with EmailDndProvider)
- `src/components/email/EmailPageLayout.tsx` (removed local DndContext, registers email source)
- `src/components/email labels/FoldersColumn.tsx` (system folders + tree nodes wrapped with DroppableFolderItem)
- `src/components/ui/tree-view.tsx` (added nodeWrapper prop)

---

## Phase 3: Advanced Features (MCP Research Required)

### 4. Auto Rule Creation for Spam Drag (~3 hours)
- [ ] **MCP:** Verify Gmail filter criteria options (domain filtering, rate limits)
- [ ] When drop target is SPAM, prompt user: "Create filter for sender?"
- [ ] Extract sender email/domain from dragged email
- [ ] Call `createGmailFilter({ from: sender }, { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] })`
- [ ] Optionally store filter metadata in Supabase for UI display
- [ ] Test filter creation and verify future emails are caught

**Files:** `src/integrations/gmail/operations/filters.ts`, drag handler in EmailPageLayout

---

### 5. Retroactive Rule Apply (~4 hours)
- [ ] **MCP:** Confirm `batchModify` API exists, limits (max IDs per call), rate limits
- [ ] After creating filter, offer "Apply to existing emails?" prompt
- [ ] Implement search: `messages.list({ q: 'from:sender@example.com' })`
- [ ] Implement batch apply: `messages.batchModify({ ids, addLabelIds, removeLabelIds })`
- [ ] Add to `emailService.ts` or new `batchOperations.ts`
- [ ] Show progress indicator for large batches
- [ ] Handle rate limits via `requestQueue.ts`
- [ ] Test with varying email counts

**Files:** `src/services/emailService.ts` or new file, UI for progress

---

## Open Questions

- [x] Compose expansion: Full-screen option or just 75%? → Implemented as full screen with margins (`inset-4`)
- [ ] Drag feedback: Ghost preview of email, or just highlight target folder?
- [ ] Auto spam rule: Always prompt, or setting for silent auto-create?
- [ ] Retroactive apply: Max emails to process? Show progress bar?

---

## Notes

- DnD infrastructure exists (`@dnd-kit/core` installed, sensors configured)
- `handleDragEnd` in EmailPageLayout is currently a stub
- `useEmailSelection` exposes `selectedEmails: Set<string>`
- `applyLabelsToEmail` and `createGmailFilter` already exist
- Gmail filters are forward-only; retroactive requires manual batch operation
