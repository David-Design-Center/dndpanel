import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { SecurityProvider } from './contexts/SecurityContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { LabelProvider } from './contexts/LabelContext';
import { OutOfOfficeProvider } from './contexts/OutOfOfficeContext';
import { OutOfOfficeSettingsProvider } from './contexts/OutOfOfficeSettingsContext';
import microsoftGraphService from './services/microsoftGraphService';
import { Toaster } from './components/toaster';

// Initialize Microsoft Graph service early to handle redirect responses
microsoftGraphService.initialize().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <SecurityProvider>
            <ProfileProvider>
              <LabelProvider>
                <OutOfOfficeProvider>
                  <OutOfOfficeSettingsProvider>
                    <App />
                  </OutOfOfficeSettingsProvider>
                </OutOfOfficeProvider>
              </LabelProvider>
            </ProfileProvider>
          </SecurityProvider>
        </AuthProvider>
        <Toaster />
      </BrowserRouter>
    </StrictMode>
  );
}).catch((error) => {
  console.error('Failed to initialize Microsoft Graph service:', error);
  // Still render the app even if MSAL initialization fails
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <SecurityProvider>
            <ProfileProvider>
              <LabelProvider>
                <OutOfOfficeProvider>
                  <OutOfOfficeSettingsProvider>
                    <App />
                  </OutOfOfficeSettingsProvider>
                </OutOfOfficeProvider>
              </LabelProvider>
            </ProfileProvider>
          </SecurityProvider>
        </AuthProvider>
        <Toaster />
      </BrowserRouter>
    </StrictMode>
  );
});