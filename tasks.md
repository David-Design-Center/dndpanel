# Folder Moves & Compose Expansion

Email management upgrades: drag/drop moves, bulk move dialog, compose resize, spam-drag automation, and rule retroactivity.

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


- Change the viewemail. Keep the collapsable style for emails but don't use it. Make it very simple to diffirintiate. The new way will be 
- The list must be refreshed for actions to take effect - we’ll fix today after the call.
- Signature is added by default, not yet on replies. We’ll make sure you see the signature in each email before sending. Will fix this tomorrow.
- We’ll add CC on replies. Will fix this tomorrow.