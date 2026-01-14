# GEMINI.MD: AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

* **Primary Goal:** A minimalist, custom email client built for **D&D Panel**. It is designed to interface directly with the **Gmail API** to provide a specialized inbox, drafting, and label management experience.
* **Architecture Style:** Client-side application with direct Google API integration (no backend proxy for email operations). Uses Supabase for application-specific backend needs.
* **Business Domain:** Interior Design operational dashboard (D&D Design Center), handling communications with designers, furniture vendors, and clients.

## 2. Core Technologies & Stack

* **Languages:** TypeScript 5.5, React 18.
* **Build System:** Vite 5.4.
* **Runtime:** Node.js (Development), Browser (Production).
* **State Management:** React Context (primary), Zustand, React Query (implied for data syncing potentially).
* **UI Framework:** Tailwind CSS 3.4, Shadcn/UI (Radix Primitives).
* **Key Libraries:**
    *   **Gmail Integration:** `gapi` (Google Client Library for JS).
    *   **Data Validation:** Zod, React Hook Form.
    *   **Utilities:** `date-fns`, `lucide-react`, `clsx`, `tailwind-merge`.
    *   **Rich Text:** `react-quill`.
    *   **Calendar:** `@fullcalendar`.
*   **Backend:** Supabase (Auth, Database for app data), Gmail API (Email data).

## 3. Architectural Patterns

* **Direct Gmail API Integration:**
    *   The application calls `window.gapi.client.gmail` directly from the browser.
    *   **Orchestrator:** `src/integrations/gapiService.ts` serves as the central orchestration layer.
    *   **Modules:** Functionality is modularized in `src/integrations/gmail/` (e.g., `send/`, `fetch/`, `operations/`).
    *   **Queueing:** `queueGmailRequest()` is used to handle rate limiting and retries.

* **Context-Based State Architecture:**
    *   **Core Providers:** `src/providers/` wraps the entire app (Auth, Security, Profile, Labels).
    *   **Feature Providers:** Route-specific providers wrap layouts (EmailList, Compose, Contacts).

* **Optimistic UI:**
    *   Local state is updated immediately for user actions (e.g., archiving, labeling).
    *   Syncs with Gmail in the background.
    *   Rolls back on error.

* **Event-Driven Coordination:**
    *   Uses custom window events for cross-component signaling: `draft-created`, `email-deleted`, `labels-need-refresh`, `inbox-refetch-required`.

* **Repository Pattern:**
    *   Transitioning towards `emailRepository` as the single source of truth.

## 4. Coding Conventions & Style Guide

* **Formatting:** Prettier (inferred), ESLint.
* **Naming Conventions:**
    *   Components: PascalCase (`EmailList.tsx`).
    *   Functions/Variables: camelCase (`getUnreadEmails`).
    *   Files: PascalCase for components, camelCase for logic/hooks.
* **Logging Standards:**
    *   Use emoji prefixes for grep-ability:
        *   `📝` Draft operations
        *   `🗑️` Delete operations
        *   `✅` Success
        *   `❌` Error/Failures
        *   `🔄` Execution/Queueing
        *   `🏷️` Label operations
        *   `📧` Email/API operations
* **Error Handling:**
    *   **Async Handlers:** MUST wrap in `try-catch` blocks.
    *   **Debugging:** Log errors to console with descriptive context.
* **Type Safety:**
    *   Avoid `any`. Use `unknown` with narrowing or proper types defined in `src/types/index.ts`.

## 5. Key Files & Entrypoints

* **Application Entry:** `src/main.tsx` (Bootstraps React, Router, and CoreProviders).
* **Main Layout:** `src/App.tsx`.
* **Gmail Service:** `src/integrations/gapiService.ts` (Major integration point).
* **Gmail Modules:** `src/integrations/gmail/` (Read this to understand specific API logic).
* **Contexts:** `src/contexts/` (State definitions).
* **Email Components:** `src/components/email/`.
* **Configuration:**
    *   `.env`: Environment variables.
    *   `vite.config.ts`: Build configuration.
    *   `tailwind.config.js`: Design system (colors, animations).

## 6. Development & Testing Workflow

* **Package Manager:** `npm`.
* **Local Development:**
    *   Run `npm run dev` to start the Vite development server.
* **Linting:**
    *   Run `npm run lint` to check code quality.
* **Deployment:**
    *   Netlify (inferred from `netlify.toml`).

## 7. Specific Instructions for AI Collaboration

### ⚠️ CRITICAL: Gmail API Usage
*   **Documentation First:** **ALWAYS** verify Gmail API endpoints and behaviors against official documentation before implementation. Do NOT blindly copy existing patterns, as some may be legacy or undocumented.
*   **Drafts vs Messages:**
    *   Gmail Drafts (`drafts` resource) and Messages (`messages` resource) are distinct but related.
    *   **Gotcha:** A draft has both a `draftId` and a `message.id`. Use `draftId` for API calls (update/send), but use `message.id` for UI rendering and tracking.

### Common Pitfalls to Avoid
1.  **Stale Closures:** Use refs for values accessed in debounced/throttled callbacks in hooks.
2.  **Context Dependencies:** Be aware of the provider hierarchy. `ProfileContext` depends on `AuthContext`.
3.  **Rate Limits:** Never call `gapi` directly in a loop without the `queueGmailRequest()` wrapper.
4.  **Cache Invalidation:** Ensure caches are cleared when switching profiles or implementing major state changes (`clearEmailCacheForProfileSwitch()`).
5.  **Event Listeners:** Always clean up custom event listeners in `useEffect` return functions.

### Infrastructure & Security
*   **Secrets:** Never hardcode API keys or credentials. Use `.env` variables.
*   **Safety:** Ensure any changes to authentication or token handling are secure.

### Backend Authentication via Service Account (CRITICAL)
*   **Method:** Domain-Wide Delegation (Service Account Impersonation).
*   **Key:** `GOOGLE_SA_KEY` (JSON) stored in Supabase Edge Functions Secrets.
*   **Mechanism:**
    *   Backend functions (e.g., `gmail-sync`, `refresh-gmail-token`) sign a JWT using the Service Account private key.
    *   They "impersonate" the target user (e.g., `david.v@dnddesigncenter.com`).
    *   **NO User Refresh Tokens:** Do NOT look for `gmail_refresh_token` in the `profiles` table for backend operations. The Service Account bypasses this requirement for domain users.
