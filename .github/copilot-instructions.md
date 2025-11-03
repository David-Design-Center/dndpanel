# Copilot Instructions for D&D Panel

## Project Overview
A React + TypeScript business management application combining Gmail client functionality with invoicing, inventory, shipments, and CRM features. Built with Vite, Supabase, and Google APIs (Gmail, Calendar, Contacts). The codebase is actively being refactored from monolithic to modular architecture.

## Critical Architecture Patterns

### 1. Email Repository Pattern (SINGLE SOURCE OF TRUTH)
**Location**: `src/services/emailRepository.ts`, `src/features/email/`

The email system underwent major refactoring to eliminate the "26+ parallel arrays" anti-pattern:

```typescript
// ❌ OLD (deprecated - still exists in EmailPageLayout.tsx but being phased out)
const [allTabEmails, setAllTabEmails] = useState({ all: [], unread: [], trash: [] });
const [categoryEmails, setCategoryEmails] = useState({...}); // Caused sync issues

// ✅ NEW (use this for all new email code)
import { emailRepository } from '@/services/emailRepository';
import { useEmailListManager } from '@/features/email/hooks';

const emailManager = useEmailListManager();
const emails = emailManager.getVisibleEmails(); // Auto-synced, no manual state
```

**Key Principle**: `emailRepository` stores emails in a single `Map<string, Email>`. All views (inbox, trash, unread) are **computed on-demand**, never stored separately. Mutations like delete/move are atomic and automatically update all derived views.

**Documentation**: See `README/EMAIL_ARCHITECTURE_ANALYSIS.md` and `README/PATH_B_PROGRESS.md` for the architectural decision record.

### 2. Google API Integration Strategy
**Location**: `src/integrations/gapiService.ts`, `src/integrations/gmail/`

Gmail API calls are organized in a modular structure (Phase 4-5 migration in progress):

```
src/integrations/gmail/
├── fetch/messages.ts      # Message/thread fetching
├── operations/           # Labels, mutations, filters, attachments
├── send/compose.ts       # Send & draft operations
├── contacts/profile.ts   # People API integration
└── utils/               # Parsing, encoding
```

**Migration in Progress**: `gapiService.ts` (3,102 lines) is being split into modules. When adding new Gmail functionality:
1. Create functions in appropriate `gmail/` subdirectory
2. Export from module, then re-export from `gapiService.ts` 
3. Do NOT add new code directly to `gapiService.ts`

**Authentication**: Domain-wide delegation tokens are managed server-side via Supabase Edge Functions (`supabase/functions/refresh-gmail-token/`). Frontend uses short-lived tokens. See `README/GMAIL_CLIENT_BATTLE_PLAN.md` for migration to full backend proxy.

### 3. Context-Based State Management
**Location**: `src/contexts/`

This app uses React Context extensively (not Zustand/Redux) for global state:

- `AuthContext.tsx` - Supabase authentication, profile selection
- `SecurityContext.tsx` - Authorization checks (allowed users list)
- `EmailPreloaderContext.tsx` - Background email prefetching
- `ContactsContext.tsx` - Contact management
- `BrandContext.tsx` - Brand/vendor data (consolidated from separate suppliers table)
- `LabelContext.tsx` - Gmail labels state

**Pattern**: Contexts wrap the entire app via `<Layout>` in `App.tsx`. Components access via hooks like `useAuth()`, `useSecurity()`.

### 4. Supabase Integration
**Location**: `src/lib/supabase.ts`, `supabase/functions/`

**Database**: Postgres with RLS (Row Level Security) policies per user
**Edge Functions**: 
- `refresh-gmail-token` - OAuth token refresh
- `fetch-gmail-thread` - Server-side Gmail API proxy
- `smart-responder` - AI email responses

**Critical Environment Variables** (must be set in Supabase dashboard):
```
GAPI_CLIENT_ID
GAPI_CLIENT_SECRET
```

**Pattern**: Frontend calls edge functions via `src/services/backendApi.ts`, never directly.

## Development Workflows

### Running the App
```bash
npm run dev        # Starts Vite dev server on http://localhost:5173
```

**Task**: Use `run_task` tool with `"Start Development Server"` for background execution.

### Path Aliases
TypeScript paths configured in `tsconfig.json`:
```typescript
import { Button } from '@/components/ui/button';  // Resolves to src/components/ui/button
```

### UI Components
**shadcn/ui** components in `src/components/ui/`. Use existing components before creating new ones. The design system uses Tailwind CSS with custom theme in `tailwind.config.js`.

### Testing
No formal test suite currently. Manual testing via browser. When making changes to email system, verify:
- Email counts match Gmail UI
- Delete removes from all views
- No duplicate emails after refresh

## Project-Specific Conventions

### Component Organization
```
src/
├── pages/              # Route components (Inbox, Orders, Dashboard, etc.)
├── components/
│   ├── common/         # Reusable components (dropdowns, modals)
│   ├── email/          # Email-specific UI
│   ├── layout/         # Layout wrappers (ThreeColumnLayout)
│   └── ui/             # shadcn/ui components
├── features/           # Feature modules (email system)
├── services/           # API clients (emailService, contactService)
├── contexts/           # React contexts
├── hooks/              # Custom hooks
└── utils/              # Pure utility functions
```

### Naming Patterns
- **Services**: `*Service.ts` - API interaction (e.g., `emailService.ts`)
- **Contexts**: `*Context.tsx` - Global state providers
- **Pages**: PascalCase, match route names (`Inbox.tsx`, `InvoiceGenerator.tsx`)
- **Handlers**: `handle*` prefix for event handlers
- **Getters**: `get*` or `fetch*` for async data retrieval

### Email System Specifics
When working with emails:

1. **Never manually filter/sync arrays** - use repository methods:
   ```typescript
   emailRepository.getInboxEmails()    // Returns fresh computed view
   emailRepository.deleteEmail(id)      // Atomic across all views
   ```

2. **Tab definitions**: `'all' | 'unread' | 'sent' | 'trash' | 'spam' | 'starred' | 'important' | 'archive' | 'allmail'`

3. **Labels are Gmail's UPPERCASE format**: `'INBOX'`, `'TRASH'`, `'SENT'`, etc.

4. **Categories**: `'primary' | 'updates' | 'promotions' | 'social'` (Gmail categories)

### Brand/Vendor Consolidation
**Important**: `suppliers` table is deprecated. All vendor data now lives in `brands` table. See `README/CONSOLIDATION_COMPLETE.md`. When handling supplier orders:

```typescript
// ✅ Correct
import { useBrand } from '@/contexts/BrandContext';
<BrandDropdown returnFullBrand={true} />

// ❌ Don't use
import { fetchSuppliers } from '@/services/suppliersService'; // Unused file
```

## Known Issues & Active Work

### Critical Bug: "Ghost Emails"
**Status**: Fixed via repository pattern but old code paths remain
**Problem**: Deleted emails could reappear due to parallel array desync
**Solution**: Always use `emailRepository` for mutations, not local state arrays
**Files**: See `README/EMAIL_ARCHITECTURE_ANALYSIS.md` for full diagnosis

### Refactoring in Progress
1. **EmailPageLayout.tsx** (2,747 lines) → Using modular `EmailPageLayout/` folder with extracted handlers
2. **gapiService.ts** (3,102 lines) → Splitting into `src/integrations/gmail/` modules
3. **Backend Migration**: Moving Gmail API calls to Supabase Edge Functions (see `README/GMAIL_CLIENT_BATTLE_PLAN.md`)

When editing these files, prefer adding to new modules over expanding monoliths.

## Security & Authentication

### Authorization Model
- **Allowed Users**: Hardcoded list in `src/config/security.ts` (`SECURITY_CONFIG.ALLOWED_USERS`)
- **RLS**: All Supabase tables filtered by `auth.uid()`
- **Password Reset**: Protected route checking for recovery tokens in URL

### Protected Routes
All routes except `/auth`, `/auth/forgot`, `/auth/reset`, `/privacy-policy`, `/terms-of-service` require authentication via `<ProtectedRoute>` wrapper in `App.tsx`.

### Token Management
- **Supabase**: Long-lived sessions via localStorage
- **Google**: Short-lived OAuth tokens refreshed via Edge Function
- **Never expose**: `GAPI_CLIENT_SECRET` to frontend (server-side only)

## README Documentation
Extensive documentation in `README/` folder:
- Architecture decisions (e.g., `EMAIL_ARCHITECTURE_ANALYSIS.md`)
- Migration guides (e.g., `PATH_B_INTEGRATION_GUIDE.md`)
- Feature implementations (e.g., `CONTACTS_DROPDOWN_IMPLEMENTATION.md`)
- Status reports (e.g., `COMPLETE_STATUS_REPORT.md`)

When making architectural changes, update or create a README doc explaining the pattern.

## Common Pitfalls

1. **Don't create parallel state for emails** - The repository pattern exists to prevent this
2. **Don't call Gmail API directly in components** - Use `emailService.ts` or `gapiService.ts`
3. **Don't mix old and new email patterns** - Prefer `useEmailListManager` over manual useState
4. **Don't hardcode Google Client ID/Secret** - Use environment variables
5. **Check `SecurityContext.isDataLoadingAllowed`** before fetching sensitive data

## Quick Reference Commands

```bash
# Development
npm run dev

# Build
npm run build
npm run preview

# Linting
npm run lint

# Supabase (requires Supabase CLI)
npx supabase functions deploy <function-name>
```

## Getting Help
When you encounter unfamiliar patterns:
1. Check `README/` folder for architectural documentation
2. Search for similar implementations in the codebase
3. Look for Context providers in `src/contexts/` for state access patterns
4. Check `emailRepository.ts` and `useEmailListManager.ts` for email patterns
