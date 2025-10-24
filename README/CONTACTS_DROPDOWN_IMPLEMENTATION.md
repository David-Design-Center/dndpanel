# Contacts Dropdown Implementation - Invoice Generator

## Overview
Implemented a `ContactsDropdown` component for the Invoice Generator that allows users to:
1. Search and select existing contacts from Supabase
2. Auto-fill customer information when a contact is selected
3. Add new contacts by typing a name that doesn't exist
4. Automatically save new contacts to the Supabase `contacts` table when saving an invoice

## Files Created/Modified

### 1. **New Component: `ContactsDropdown.tsx`**
**Location:** `src/components/common/ContactsDropdown.tsx`

**Features:**
- Fetches contacts from Supabase via `fetchContacts()` service
- Displays contact names and emails in dropdown
- Search functionality - filters contacts by full name or email as user types
- "Add new contact" option appears when typed text doesn't match existing contacts
- Selects a contact to auto-fill: `customerName`, `address`, `city`, `state`, `zip`, `tel1`, `tel2`, `email`
- Follows the same pattern as `BrandDropdown` component
- Fixed positioning dropdown that appears above/below input as needed
- Loading state with spinner while fetching contacts
- Error handling for failed contact loads

**Props:**
```typescript
interface ContactsDropdownProps {
  value: string;                    // Current customer name value
  onChange: (contactData: {...}) => void;  // Callback when contact is selected
  className?: string;               // Optional CSS classes
  placeholder?: string;             // Input placeholder
}
```

### 2. **Modified: `InvoiceGenerator.tsx`**
**Location:** `src/pages/InvoiceGenerator.tsx`

**Changes:**
1. **Import Added:**
   ```typescript
   import ContactsDropdown from '../components/common/ContactsDropdown';
   import { fetchContacts, createContact } from '../services/contactsService';
   ```

2. **Handler Added:** `handleContactSelect()`
   - Updates invoice state with auto-filled contact information

3. **UI Modification - Customer Information Section:**
   - Replaced manual Customer Name input with `ContactsDropdown` component
   - Removed separate "Select Contact (Auto-fill)" field
   - Customer Name field now integrates the dropdown directly

4. **Contact Creation Logic in `saveInvoice()`:**
   - After saving invoice, checks if customer is new
   - If new customer, creates contact record in Supabase with:
     - Full name
     - Email
     - Phone number (combined tel1 and tel2)
     - Address
     - City
     - State
     - Zip code
   - Skips creation if contact already exists (case-insensitive check)
   - Doesn't fail invoice save if contact creation fails

## User Workflow

### Selecting an Existing Contact:
1. User clicks on Customer Name field
2. Dropdown opens showing message "Start typing to search contacts"
3. User types contact name or email
4. Matching contacts appear in dropdown
5. User clicks a contact
6. All customer fields auto-fill with contact data

### Adding a New Contact:
1. User types customer name that doesn't exist in dropdown
2. "Add '[name]' as new contact" option appears
3. User clicks the add option
4. Name is filled in, other fields remain empty for manual entry
5. When invoice is saved, new contact is automatically created in Supabase

## Database Integration

### Supabase `contacts` Table:
```sql
- id (UUID, primary key)
- full_name (text, required)
- email (text, nullable, unique)
- phone_1 (text, nullable)
- phone_2 (text, nullable)
- address (text, nullable)
- city (text, nullable)
- state (text, nullable)
- zip_code (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- created_by (text, nullable)
```

### How Contacts are Saved:
When an invoice is saved, the system:
1. Checks if customer name already exists in contacts
2. If new, creates contact with available information from invoice
3. Gracefully handles duplicate emails with existing unique constraint
4. Continues invoice save even if contact creation fails

## Technical Highlights

- **Performance:** Contacts are loaded only once when dropdown is first opened
- **Search:** Real-time filtering as user types
- **Positioning:** Fixed positioning ensures dropdown appears in correct viewport location on scroll
- **Error Handling:** Graceful fallbacks if contact loading fails
- **Type Safety:** Full TypeScript types for contacts and dropdown props
- **UX:** Matches BrandDropdown pattern for consistency across the app
- **Accessibility:** Proper keyboard navigation (Escape to close)

## Testing Checklist

- [ ] Dropdown opens when Customer Name field is clicked
- [ ] Contacts load from Supabase when dropdown opens
- [ ] Search filters contacts by name and email
- [ ] Selecting a contact auto-fills all fields correctly
- [ ] Phone numbers are formatted correctly (tel1 as area code, tel2 as number)
- [ ] "Add new contact" option appears for typed names
- [ ] New contacts are created when invoice is saved
- [ ] Duplicate names don't create duplicate contacts
- [ ] Invoice save succeeds even if contact creation fails
- [ ] Dropdown closes when contact is selected
- [ ] Dropdown closes when Escape key is pressed
- [ ] Dropdown closes when clicking outside

## Notes

- Phone numbers from existing contacts are split: first 3 digits go to `tel1`, remaining to `tel2`
- When creating new contacts from invoice, `tel1` and `tel2` are combined into single `phone_1` field
- Contact search is case-insensitive
- Empty field values are not sent to contact creation (only non-empty fields are included)
