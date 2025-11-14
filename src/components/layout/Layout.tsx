import { useEffect, useState, Suspense, lazy } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import FoldersColumn from '../email labels/FoldersColumn';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useEmailPreloader } from '../../contexts/EmailPreloaderContext';
import { useFoldersColumn } from '../../contexts/FoldersColumnContext';
import ProfileSelectionScreen from '../profile/ProfileSelectionScreen';
import { InboxLayoutProvider } from '../../contexts/InboxLayoutContext';
import { FoldersColumnProvider } from '../../contexts/FoldersColumnContext';
import { PanelSizesProvider } from '../../contexts/PanelSizesContext';
import { EmailListProvider } from '../../contexts/EmailListContext';
import { ComposeProvider, useCompose } from '../../contexts/ComposeContext';

const Compose = lazy(() => import('../../pages/Compose'));

function Layout() {
  const { loading, isAdmin, userProfileId } = useAuth();
  const { currentProfile, isLoading: profileLoading, selectProfile } = useProfile();
  const { isPreloading, isGhostPreloadComplete } = useEmailPreloader();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false); // Prevent duplicate selection
  const [autoSelectionFailed, setAutoSelectionFailed] = useState(false); // Prevent infinite retry

  // Auto-select profile for non-admin users (only once)
  useEffect(() => {
    if (!loading && !profileLoading && !isAdmin && userProfileId && !currentProfile && !hasAutoSelected && !autoSelectionFailed) {
      // For staff members, automatically select their profile
      console.log('🚀 Auto-selecting profile for staff user:', userProfileId);
      setHasAutoSelected(true); // Set flag before async operation
      selectProfile(userProfileId, undefined, true).then((success) => { // Pass isAutoSelection = true
        console.log('✅ Profile auto-selection result:', success);
        if (!success) {
          console.log('❌ Profile auto-selection failed permanently, stopping retries');
          setAutoSelectionFailed(true); // Prevent infinite retries
          setHasAutoSelected(false); // Reset the selection flag
        }
      });
    }
  }, [loading, profileLoading, isAdmin, userProfileId, currentProfile, selectProfile, hasAutoSelected, autoSelectionFailed]);

  // Auto-hide success indicator after 3 seconds
  useEffect(() => {
    if (isGhostPreloadComplete) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isGhostPreloadComplete]);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If no profile is selected, show profile selection screen for all users
  if (!currentProfile) {
    return <ProfileSelectionScreen />;
  }

  // Check if we're on an email-related route that should use 3-column layout
  const isEmailRoute = location.pathname.startsWith('/inbox') || 
                      location.pathname.startsWith('/unread');

  return (
    <FoldersColumnProvider>
      <ComposeProvider>
        <LayoutContent 
          loading={loading}
          isAdmin={isAdmin}
          userProfileId={userProfileId}
          currentProfile={currentProfile}
          profileLoading={profileLoading}
          selectProfile={selectProfile}
          isPreloading={isPreloading}
          isGhostPreloadComplete={isGhostPreloadComplete}
          navigate={navigate}
          showSuccess={showSuccess}
          setShowSuccess={setShowSuccess}
          hasAutoSelected={hasAutoSelected}
          setHasAutoSelected={setHasAutoSelected}
          autoSelectionFailed={autoSelectionFailed}
          setAutoSelectionFailed={setAutoSelectionFailed}
          isEmailRoute={isEmailRoute}
        />
      </ComposeProvider>
    </FoldersColumnProvider>
  );
}

// Component that uses the FoldersColumn context
// Component that uses the FoldersColumn context
function LayoutContent({ 
  loading, 
  isAdmin, 
  userProfileId, 
  currentProfile, 
  profileLoading, 
  selectProfile, 
  setShowSuccess, 
  hasAutoSelected, 
  setHasAutoSelected, 
  autoSelectionFailed, 
  setAutoSelectionFailed, 
  isEmailRoute 
}: any) {
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useFoldersColumn();
  const { isComposeOpen, openCompose } = useCompose();
  const location = useLocation();
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger animation on route change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [location.pathname]);

  // Auto-select profile for non-admin users (only once)
  useEffect(() => {
    if (!loading && !profileLoading && !isAdmin && userProfileId && !currentProfile && !hasAutoSelected && !autoSelectionFailed) {
      // For staff members, automatically select their profile
      console.log('🚀 Auto-selecting profile for staff user:', userProfileId);
      setHasAutoSelected(true);
      selectProfile(userProfileId);
    } else if (!loading && !profileLoading && !isAdmin && !userProfileId && !autoSelectionFailed) {
      console.log('❌ No profile ID found for staff user');
      setAutoSelectionFailed(true);
    }
  }, [loading, profileLoading, isAdmin, userProfileId, currentProfile, hasAutoSelected, autoSelectionFailed, selectProfile, setHasAutoSelected, setAutoSelectionFailed]);

  // Handle profile switch success feedback
  useEffect(() => {
    if (currentProfile && !loading) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentProfile, loading, setShowSuccess]);

  const handleCompose = () => {
    openCompose();
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600 flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600">
          Please select a profile to continue
        </div>
      </div>
    );
  }

  return (
      <PanelSizesProvider>
        <EmailListProvider>
          <InboxLayoutProvider>
            <div className="flex h-screen overflow-hidden bg-gray-50">
              <Sidebar />
              
              {/* Folders Column - only for email routes */}
              {isEmailRoute && (
                <div className={`${isFoldersColumnExpanded ? 'w-64' : 'w-12'} border-r border-gray-200 transition-all duration-300 flex-shrink-0`}>
                  <FoldersColumn 
                    isExpanded={isFoldersColumnExpanded} 
                    onToggle={toggleFoldersColumn}
                    onCompose={handleCompose}
                  />
                </div>
              )}
              
              <div className="flex flex-col flex-1 overflow-hidden">
                {isEmailRoute ? (
                  <main className="flex-1 overflow-hidden" key={animationKey} style={{ animation: 'fadeInFromTop 0.6s ease-out' }}>
                    <div className="w-full h-full">
                      <Outlet />
                    </div>
                  </main>
                ) : (
                  <main className="flex-1 overflow-y-auto p-4" key={animationKey} style={{ animation: 'fadeInFromTop 0.6s ease-out' }}>
                    <div className="max-w-6xl mx-auto">
                      <Outlet />
                    </div>
                  </main>
                )}
              </div>
            </div>

            {/* Compose Popup - Rendered as overlay */}
            {isComposeOpen && (
              <Suspense fallback={null}>
                <Compose />
              </Suspense>
            )}
          </InboxLayoutProvider>
        </EmailListProvider>
      </PanelSizesProvider>
  );
}

export default Layout;