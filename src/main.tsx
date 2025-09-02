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
import { Toaster } from './components/toaster';

// Track app start time for first paint optimizations
(window as any).__appStartTime = Date.now();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <SecurityProvider>
        <ProfileProvider>
          <LabelProvider>
            <OutOfOfficeSettingsProvider>
              <OutOfOfficeProvider>
                <App />
              </OutOfOfficeProvider>
            </OutOfOfficeSettingsProvider>
          </LabelProvider>
        </ProfileProvider>
        </SecurityProvider>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
);