import { ReactNode } from 'react';
import { ContactsProvider } from '../contexts/ContactsContext';
import { EmailPreloaderProvider } from '../contexts/EmailPreloaderContext';
import { FilterCreationProvider } from '../contexts/FilterCreationContext';
import { LayoutStateProvider } from '../contexts/LayoutStateContext';
import { EmailListProvider } from '../contexts/EmailListContext';
import { ComposeProvider } from '../contexts/ComposeContext';

/**
 * Feature Providers
 * 
 * These providers are specific to authenticated app routes.
 * They wrap the Layout component in App.tsx.
 * 
 * Provider hierarchy:
 * 1. EmailPreloaderProvider - Background email prefetching
 * 2. ContactsProvider - Contact management
 * 3. FilterCreationProvider - Email filter creation
 * 4. LayoutStateProvider - Unified UI layout state (replaces 3 separate contexts)
 * 5. EmailListProvider - Email list management
 * 6. ComposeProvider - Compose modal state
 */
export function FeatureProviders({ children }: { children: ReactNode }) {
  return (
    <EmailPreloaderProvider>
      <ContactsProvider>
        <FilterCreationProvider>
          <LayoutStateProvider>
            <EmailListProvider>
              <ComposeProvider>
                {children}
              </ComposeProvider>
            </EmailListProvider>
          </LayoutStateProvider>
        </FilterCreationProvider>
      </ContactsProvider>
    </EmailPreloaderProvider>
  );
}
