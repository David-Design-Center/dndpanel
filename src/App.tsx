import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSecurity } from './contexts/SecurityContext';
import { ContactsProvider } from './contexts/ContactsContext';
import Loading from './components/common/Loading';
import { initSecurityMeasures } from './utils/security';
import { SECURITY_CONFIG } from './config/security';
import { GooeyFilter } from './components/ui/liquid-toggle';

// Lazy load components
const Auth = lazy(() => import('./pages/Auth'));
const Layout = lazy(() => import('./components/Layout'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Unread = lazy(() => import('./pages/Unread'));
const Sent = lazy(() => import('./pages/Sent'));
const Drafts = lazy(() => import('./pages/Drafts'));
const Trash = lazy(() => import('./pages/Trash'));
const ViewEmail = lazy(() => import('./pages/ViewEmail'));
const Compose = lazy(() => import('./pages/Compose'));
const Settings = lazy(() => import('./pages/Settings'));
const Orders = lazy(() => import('./pages/Orders'));
const CreatePriceRequest = lazy(() => import('./pages/CreatePriceRequest'));
const CreateCustomerOrder = lazy(() => import('./pages/CreateCustomerOrder'));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Shipments = lazy(() => import('./pages/Shipments'));
const Calendar = lazy(() => import('./pages/Calendar'));
const MicrosoftAuthRedirect = lazy(() => import('./pages/MicrosoftAuthRedirect'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

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
    // Always initialize security measures
    initSecurityMeasures();
  }, []);

  // Note: Authentication initialization is now handled by individual contexts
  // when isDataLoadingAllowed becomes true

  return (
    <>
      <GooeyFilter />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/microsoft-auth-redirect" element={<MicrosoftAuthRedirect />} />
          
          {/* Public routes - accessible without authentication */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ContactsProvider>
                  <Layout />
                </ContactsProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="unread" element={<Unread />} />
            <Route path="sent" element={<Sent />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="trash" element={<Trash />} />
            <Route path="email/:id" element={<ViewEmail />} />
            <Route path="compose" element={<Compose />} />
            <Route path="settings" element={<Settings />} />
            <Route path="orders" element={<Orders />} />
            <Route path="create-price-request" element={<CreatePriceRequest />} />
            <Route path="create-customer-order" element={<CreateCustomerOrder />} />
            <Route path="invoice-generator" element={<InvoiceGenerator />} />
            <Route path="invoice-generator/:orderId" element={<InvoiceGenerator />} />
            <Route path="invoice/:orderId" element={<InvoiceGenerator />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="calendar" element={<Calendar />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;