Here are comprehensive test scenarios to verify the Contextual Move implementation works correctly:

## Manual Move Tests (via MoveToFolderDialog)

### From Inbox
| Test | Source | Target | Expected Remove | Expected Add | Expected Result |
|------|--------|--------|-----------------|--------------|-----------------|
| 1.1 | Inbox | Custom folder "Invoices" | `['INBOX']` | `['Label_123']` | Email only in Invoices |
| 1.2 | Inbox | Inbox (same folder) | `[]` | `['INBOX']` | No change |
| 1.3 | Inbox | System folder "Spam" | `['INBOX']` | `['SPAM']` | Email in Spam, not Inbox |
| 1.4 | Inbox | System folder "Starred" | `['INBOX']` | `['STARRED']` | Email starred + in Inbox |

### From Custom Label Folder
| Test | Source | Target | Expected Remove | Expected Add | Expected Result |
|------|--------|--------|-----------------|--------------|-----------------|
| 2.1 | "Invoices" | "Clients" | `['Invoices_ID']` | `['Clients_ID']` | Email only in Clients |
| 2.2 | "Invoices" | "Invoices/Test" (nested) | `['Invoices_ID']` | `['Test_ID']` | Email only in nested folder |
| 2.3 | "Invoices/Test" | "Invoices" (parent) | `['Test_ID']` | `['Invoices_ID']` | Email in parent, not nested |
| 2.4 | "Invoices" | Inbox | `['Invoices_ID']` | `['INBOX']` | Email back in Inbox |
| 2.5 | "Invoices" | Same "Invoices" | `[]` | `['Invoices_ID']` | No change |

### From System Folders
| Test | Source | Target | Expected Remove | Expected Add | Expected Result |
|------|--------|--------|-----------------|--------------|-----------------|
| 3.1 | Sent | "Invoices" | `[]` | `['Invoices_ID']` | Email in both Sent + Invoices |
| 3.2 | Drafts | Inbox | `[]` | `['INBOX']` | Email in both Drafts + Inbox |
| 3.3 | All Mail | "Clients" | `[]` | `['Clients_ID']` | Email in Clients (still in All Mail) |

---

## Drag & Drop Tests

### From Inbox (Drag Source)
| Test | Drag From | Drop On | Expected Remove | Expected Add | UI Feedback |
|------|-----------|---------|-----------------|--------------|-------------|
| 4.1 | Inbox emails | "Invoices" folder | `['INBOX']` | `['Invoices_ID']` | Success toast |
| 4.2 | Inbox emails | "Trash" folder | Special API | Trash emails | Dialog → confirm |
| 4.3 | Inbox emails | "Spam" folder | `['INBOX']` | `['SPAM']` | Success toast |
| 4.4 | Inbox emails | Custom label (new) | `['INBOX']` | `[New_ID]` | Dialog → filter option |

### From Custom Label (Drag Source)  
| Test | Drag From | Drop On | Expected Remove | Expected Add | UI Feedback |
|------|-----------|---------|-----------------|--------------|-------------|
| 5.1 | "Invoices" emails | "Clients" folder | `['Invoices_ID']` | `['Clients_ID']` | Success toast |
| 5.2 | "Invoices" emails | Inbox | `['Invoices_ID']` | `['INBOX']` | Success toast |
| 5.3 | "Work/Reports" emails | "Work" (parent) | `['Reports_ID']` | `['Work_ID']` | Success toast |
| 5.4 | "Invoices" emails | "Trash" | Special API | Trash emails | Dialog → confirm |

### Multi-Selection Drag & Drop
| Test | Selection | Drag From | Drop On | Expected Behavior |
|------|-----------|-----------|---------|-------------------|
| 6.1 | 5 emails selected | "Invoices" | "Clients" | All 5 moved contextually |
| 6.2 | 50 emails selected | Inbox | Custom label | All 50 moved, dialog shown |
| 6.3 | Mixed read/unread | "Work" | Inbox | Counters updated correctly |

---

## Edge Cases & Error Scenarios

### Same Folder Operations
| Test | Action | Expected Behavior |
|------|--------|-------------------|
| 7.1 | Move "Invoices" emails to "Invoices" | No API call, no change |
| 7.2 | Drag Inbox email to Inbox | No API call, no change |

### Cross-Profile & Network Issues  
| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| 8.1 | Network fails during move | Optimistic UI reverts, error toast |
| 8.2 | Switch profile mid-drag | Drag cancelled |
| 8.3 | Gmail quota exceeded | Error toast, no UI change |

### Dialog Flow Tests
| Test | Dialog Type | Action | Expected Behavior |
|------|-------------|--------|-------------------|
| 9.1 | Trash dialog | Confirm | Emails moved to Trash |
| 9.2 | Trash dialog | Cancel | No change, emails stay |
| 9.3 | Custom label dialog | Create filter | Emails moved + filter created |
| 9.4 | Custom label dialog | Skip filter | Emails moved, no filter |

---

## Console Verification

For each test, verify these console logs appear:

### Manual Move (useEmailSelection.ts)
```
📦 Moving X emails to "Target Label"
   Remove: [source_label] (or "none")  
   Add: [target_label]
```

### Drag & Drop (Layout.tsx)
```
📦 Drop: Moving X emails to "Target Label" 
   Source: pageType (label: labelId)
   Remove: [source_label], Add: [target_label]
```

### Dialog Confirmation
```  
📦 MoveConfirm: Adding [target], Removing [source] (or "none")
```

---

## Quick Test Checklist

**✅ Basic Contextual Move**
- [ ] Inbox → Custom folder (removes INBOX, adds custom)
- [ ] Custom → Inbox (removes custom, adds INBOX) 
- [ ] Custom → Custom (removes old, adds new)
- [ ] Nested → Parent (removes nested, adds parent)

**✅ System Folder Behavior**
- [ ] Sent → Custom (adds custom, keeps Sent)
- [ ] Drafts → Inbox (adds INBOX, keeps Drafts)

**✅ Special Cases**
- [ ] → Spam (removes source, adds SPAM)
- [ ] → Trash (uses special API via dialog)
- [ ] Same folder moves (no change)

**✅ UI & UX**
- [ ] Counter updates correctly
- [ ] Optimistic UI + revert on error
- [ ] Toast messages show correct info
- [ ] Dialogs work for Trash/custom labels

**✅ Drag & Drop**
- [ ] Source info captured correctly
- [ ] Multi-selection drag works
- [ ] Dialog flow preserved

This covers all the major variations and edge cases of the Contextual Move implementation.