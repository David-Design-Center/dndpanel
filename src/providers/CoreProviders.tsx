import { ReactNode } from 'react';
import { SecurityProvider } from '../contexts/SecurityContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { LabelProvider } from '../contexts/LabelContext';
import { OutOfOfficeProvider } from '../contexts/OutOfOfficeContext';
import { OutOfOfficeSettingsProvider } from '../contexts/OutOfOfficeSettingsContext';
import { BrandProvider } from '../contexts/BrandContext';

/**
 * Core App Providers
 * 
 * These providers are available throughout the entire application.
 * They are initialized early in the app lifecycle (in main.tsx).
 * 
 * Provider hierarchy (outer to inner):
 * 1. AuthProvider - Authentication state
 * 2. SecurityProvider - Authorization and security checks
 * 3. ProfileProvider - User profile management
 * 4. BrandProvider - Brand/vendor data
 * 5. LabelProvider - Gmail labels
 * 6. OutOfOfficeSettingsProvider - OOO settings data
 * 7. OutOfOfficeProvider - OOO state management
 */
export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SecurityProvider>
        <ProfileProvider>
          <BrandProvider>
            <LabelProvider>
              <OutOfOfficeSettingsProvider>
                <OutOfOfficeProvider>
                  {children}
                </OutOfOfficeProvider>
              </OutOfOfficeSettingsProvider>
            </LabelProvider>
          </BrandProvider>
        </ProfileProvider>
      </SecurityProvider>
    </AuthProvider>
  );
}
