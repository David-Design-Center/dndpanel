import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSecurity } from './contexts/SecurityContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { EmailPreloaderProvider } from './contexts/EmailPreloaderContext';
import { FilterCreationProvider } from './contexts/FilterCreationContext';
import Loading from './components/common/Loading';
import { initSecurityMeasures } from './utils/security';
import { SECURITY_CONFIG } from './config/security';
import { GooeyFilter } from './components/ui/liquid-toggle';
import { hasPasswordResetTokens, isPasswordResetFlow } from './utils/authFlowUtils';
import { logUnauthorizedAccess } from './utils/securityLogging';
import { Toaster } from './components/ui/sonner';
import { LoadingProgressToast } from './components/common/LoadingProgressToast';

// Lazy load non-critical components only
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ViewEmail = lazy(() => import('./pages/ViewEmail'));
const Compose = lazy(() => import('./pages/Compose'));
const Settings = lazy(() => import('./pages/Settings'));
const Orders = lazy(() => import('./pages/Orders'));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator'));
const SupplierOrderGenerator = lazy(() => import('./pages/SupplierOrderGenerator'));
const InvoicesList = lazy(() => import('./pages/InvoicesList'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Shipments = lazy(() => import('./pages/Shipments'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Tutorials = lazy(() => import('./pages/Tutorials'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

// Import core email components directly for instant loading
import Layout from './components/layout/Layout';
import Inbox from './pages/Inbox';
import Unread from './pages/Unread';

// Protected route component for password reset - requires valid recovery tokens
const PasswordResetRoute = ({ children }: { children: React.ReactNode }) => {
  // Check if there are valid recovery tokens in the URL (hash or query params)
  const searchParams = new URLSearchParams(window.location.search);
  const hasHashTokens = hasPasswordResetTokens();
  const hasQueryTokens = searchParams.has('access_token') && searchParams.has('type') && 
                       searchParams.get('type') === 'recovery';
  
  if (!hasHashTokens && !hasQueryTokens) {
    console.warn('⚠️ Unauthorized access attempt to password reset page without valid tokens');
    logUnauthorizedAccess('/auth/reset');
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isDataLoadingAllowed, isAuthenticated, isUserAuthorized } = useSecurity();
  
  // Check if this is a password reset flow by looking for reset tokens in URL
  const isResetFlow = isPasswordResetFlow();
  
  // Allow access to reset password flow ONLY if there are valid tokens
  if (isResetFlow && hasPasswordResetTokens()) {
    return <Navigate to="/auth/reset" replace />;
  }
  
  // SECURITY: Block access if data loading is not allowed (authentication required)
  if (!isDataLoadingAllowed) {
    return <Navigate to="/auth" replace />;
  }

  // SECURITY: Ensure authentication and authorization
  if (SECURITY_CONFIG.FEATURES.REQUIRE_INITIAL_AUTH && 
      (!isAuthenticated || !isUserAuthorized)) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  useEffect(() => {
    // Check for password reset tokens in URL and redirect to reset page
    const checkForPasswordReset = () => {
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check both hash (standard) and query params (in case of direct Supabase redirect)
      const hasHashTokens = hasPasswordResetTokens();
      const hasQueryTokens = searchParams.has('access_token') && searchParams.has('type') && 
                           searchParams.get('type') === 'recovery';
      
      if (hasHashTokens || hasQueryTokens) {
        // If we're not already on the reset page, redirect there
        if (window.location.pathname !== '/auth/reset') {
          const fullHash = hasHashTokens ? window.location.hash : 
                          `#access_token=${searchParams.get('access_token')}&type=recovery&expires_in=${searchParams.get('expires_in')}`;
          window.history.replaceState(null, '', '/auth/reset' + fullHash);
        }
      }
    };
    
    checkForPasswordReset();
    
    // Check for browser tab discarding (when browser unloads tab due to memory pressure)
    const checkForTabDiscard = () => {
      if ((document as any).wasDiscarded) {
        console.log('Tab was discarded by browser due to memory pressure');
      }
    };
    checkForTabDiscard();
    
    // Instead of reloading the page, refresh only necessary data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if tab was discarded
        checkForTabDiscard();
        
        // Dispatch custom events to refresh specific data without reloading
        window.dispatchEvent(new CustomEvent('tab-visible-refresh-data'));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initialize security measures
    initSecurityMeasures();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Note: Authentication initialization is now handled by individual contexts
  // when isDataLoadingAllowed becomes true

  return (
    <>
      <GooeyFilter />
      <LoadingProgressToast />
      <Toaster 
        position="top-right" 
        richColors
        expand={true}
        closeButton
      />
      <Routes>
        <Route path="/auth" element={
          <Suspense fallback={<Loading />}>
            <Auth />
          </Suspense>
        } />
        
        <Route path="/auth/reset" element={
          <PasswordResetRoute>
            <Suspense fallback={<Loading />}>
              <ResetPassword />
            </Suspense>
          </PasswordResetRoute>
        } />
        
        <Route path="/auth/forgot" element={
          <Suspense fallback={<Loading />}>
            <ForgotPassword />
          </Suspense>
        } />
        
        {/* Public routes - accessible without authentication */}
        <Route path="/privacy-policy" element={
          <Suspense fallback={<Loading />}>
            <PrivacyPolicy />
          </Suspense>
        } />
        <Route path="/terms-of-service" element={
          <Suspense fallback={<Loading />}>
            <TermsOfService />
          </Suspense>
        } />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <EmailPreloaderProvider>
                <ContactsProvider>
                  <FilterCreationProvider>
                    <Layout />
                  </FilterCreationProvider>
                </ContactsProvider>
              </EmailPreloaderProvider>
            </ProtectedRoute>
          }
        >
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/email/:id" element={<Inbox />} />
            <Route path="unread" element={<Unread />} />
            <Route path="unread/email/:id" element={<Unread />} />
            <Route path="email/:id" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <ViewEmail />
              </Suspense>
            } />
            <Route path="compose" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Compose />
              </Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Settings />
              </Suspense>
            } />
            <Route path="orders" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Orders />
              </Suspense>
            } />
            <Route path="supplier-order-generator" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <SupplierOrderGenerator />
              </Suspense>
            } />
            <Route path="supplier-order-generator/:orderId" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <SupplierOrderGenerator />
              </Suspense>
            } />
            <Route path="orders/create-customer-order" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoiceGenerator />
              </Suspense>
            } />
            <Route path="invoices" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoicesList />
              </Suspense>
            } />
            <Route path="invoice-generator" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoiceGenerator />
              </Suspense>
            } />
            <Route path="invoice-generator/:orderId" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoiceGenerator />
              </Suspense>
            } />
            <Route path="invoice/:orderId" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoiceGenerator />
              </Suspense>
            } />
            <Route path="invoice-view/:invoiceId" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <InvoiceView />
              </Suspense>
            } />
            <Route path="dashboard" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="shipments" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Shipments />
              </Suspense>
            } />
            <Route path="contacts" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Contacts />
              </Suspense>
            } />
            <Route path="calendar" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Calendar />
              </Suspense>
            } />
            <Route path="tutorials" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Tutorials />
              </Suspense>
            } />
          </Route>
        </Routes>
      </>
    );
}

export default App;
