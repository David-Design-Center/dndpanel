## Pre-Launch Checklist (Gmail API Direct)

### Core Email Features
- [✅] Inbox loads emails via Gmail API pagination
- [✅] Message viewer renders full HTML bodies
- [✅] Labels sidebar shows all user/system labels
- [✅] Star/unstar updates immediately
- [✅] Read/unread toggles work correctly

### Drafts
- [✅] Draft list shows all drafts
- [✅] Discard button removes draft from UI immediately
- [✅] Auto-save creates/updates drafts (no duplicates)
- [✅] Manual save overwrites existing draft
- [✅] Send from draft navigates to inbox (not stale thread)

### Trash & Spam
- [ ] Trash view loads correctly
- [ ] Delete moves to trash
- [ ] Restore from trash works
- [ ] Empty trash confirmation works
- [ ] Spam view loads
- [ ] Mark as not spam works

### Compose
- [ ] Rich text editor works (bold, italic, lists)
- [ ] Attachments upload correctly
- [ ] Auto-save doesn't create duplicates
- [ ] Send succeeds
- [ ] Reply/forward prepopulates correctly
- [ ] Signature adds only once

### Labels/Folders
- [ ] Create label appears immediately
- [ ] Delete label removes immediately
- [ ] Apply label to email works
- [ ] Remove label works
- [ ] Label counters accurate

### Threading
- [ ] Thread view shows all messages
- [ ] Reply in thread works
- [ ] Thread navigation correct

### Search
- [ ] Search queries Gmail API
- [ ] Results display correctly
- [ ] Empty search handled

### Multi-Select & Bulk Actions
- [ ] Select multiple emails
- [ ] Bulk delete works
- [ ] Bulk label works
- [ ] Bulk mark read/unread works

### Error Handling
- [ ] Network errors show notifications
- [ ] Draft save failures retry
- [ ] Attachment download failures handled
- [ ] Large emails load correctly

### Performance
- [ ] Label counters load quickly (parallel fetch ✅ done)
- [ ] Email list scrolls smoothly
- [ ] Thread view opens fast
- [ ] No duplicate API calls

### UI/UX
- [ ] Loading states show appropriately
- [ ] Confirmations for destructive actions
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive
- [ ] No console errors