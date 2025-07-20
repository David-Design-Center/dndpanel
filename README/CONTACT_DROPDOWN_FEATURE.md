# Contact Dropdown Feature

This implementation adds a smart contact dropdown to the email compose screen that integrates with Google People API to provide email address suggestions.

## Features

- **Prioritized Contact Display**: Shows "frequently contacted" contacts first, followed by other contacts
- **Real-time Filtering**: Updates suggestions instantly as the user types
- **Limit to Top 5**: Shows only the most relevant 5 contacts to avoid overwhelming the user
- **Smart Search**: Searches both contact names and email addresses
- **Visual Indicators**: Shows "Frequent" badges for frequently contacted people
- **Profile Avatars**: Displays contact photos when available

## Architecture

### 1. Type Definitions (`src/types/index.ts`)
- Added `Contact` interface for standardized contact representation

### 2. Google API Integration (`src/integrations/gapiService.ts`)
- Added `fetchPeopleConnections()` - fetches user's contacts including frequently contacted
- Added `fetchOtherContacts()` - fetches broader contact list
- Updated scopes to include `https://www.googleapis.com/auth/contacts.readonly`

### 3. Contact Service (`src/services/contactService.ts`)
- `ContactService` singleton class manages contact data
- Processes and combines contacts from multiple sources
- Handles deduplication (prioritizes "My Contacts" over "Other Contacts")
- Provides filtering and search functionality
- Sorts by priority: frequently contacted first, then alphabetically

### 4. React Context (`src/contexts/ContactsContext.tsx`)
- `ContactsProvider` manages global contact state
- `useContacts` hook provides access to contact data and search functionality
- Handles loading states and error management

### 5. UI Integration (`src/pages/Compose.tsx`)
- Modified "To" input field to include dropdown functionality
- Added state management for dropdown visibility and filtered contacts
- Implemented event handlers for input changes, focus, and blur
- Added contact selection functionality

### 6. Provider Setup (`src/main.tsx`)
- Wrapped app with `ContactsProvider` to make contact data available globally

## Usage

1. **Initial Load**: Contacts are automatically loaded when the app starts
2. **Dropdown Trigger**: When user clicks in the "To" field or starts typing
3. **Real-time Search**: As user types, dropdown updates with matching contacts
4. **Selection**: User can click on any contact to populate the "To" field
5. **Auto-hide**: Dropdown hides when user clicks outside or selects a contact

## Data Sources

- **People Connections**: Google Contacts and frequently contacted people
- **Other Contacts**: Email addresses from Gmail interactions
- **Prioritization**: Frequently contacted → Other contacts → Alphabetical

## Performance Considerations

- Contacts are loaded once and cached in memory
- Filtering is performed client-side for instant results
- Only top 5 results are displayed to maintain UI performance
- Dropdown has proper z-index and positioning

## Future Enhancements

- Multiple recipient support (comma-separated emails)
- Recent contacts prioritization
- Contact grouping by organization
- Keyboard navigation (arrow keys, Enter, Escape)
- Contact creation from dropdown
