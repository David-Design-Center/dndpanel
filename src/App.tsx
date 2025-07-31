import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSecurity } from './contexts/SecurityContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { EmailPreloaderProvider } from './contexts/EmailPreloaderContext';
import Loading from './components/common/Loading';
import { initSecurityMeasures } from './utils/security';
import { SECURITY_CONFIG } from './config/security';
import { GooeyFilter } from './components/ui/liquid-toggle';

// Lazy load non-critical components only
const Auth = lazy(() => import('./pages/Auth'));
const ViewEmail = lazy(() => import('./pages/ViewEmail'));
const Compose = lazy(() => import('./pages/Compose'));
const Settings = lazy(() => import('./pages/Settings'));
const Orders = lazy(() => import('./pages/Orders'));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator'));
const InvoicesList = lazy(() => import('./pages/InvoicesList'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Shipments = lazy(() => import('./pages/Shipments'));
const Calendar = lazy(() => import('./pages/Calendar'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

// Import core email components directly for instant loading
import Layout from './components/Layout';
import Inbox from './pages/Inbox';
import Unread from './pages/Unread';
import Sent from './pages/Sent';
import Drafts from './pages/Drafts';
import Trash from './pages/Trash';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isDataLoadingAllowed, isAuthenticated, isUserAuthorized } = useSecurity();
  
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
      <Routes>
        <Route path="/auth" element={
          <Suspense fallback={<Loading />}>
            <Auth />
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
                  <Layout />
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
            <Route path="sent" element={<Sent />} />
            <Route path="sent/email/:id" element={<Sent />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="drafts/email/:id" element={<Drafts />} />
            <Route path="trash" element={<Trash />} />
            <Route path="trash/email/:id" element={<Trash />} />
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
            <Route path="calendar" element={
              <Suspense fallback={<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div></div>}>
                <Calendar />
              </Suspense>
            } />
          </Route>
        </Routes>
      </>
    );
}

export default App;