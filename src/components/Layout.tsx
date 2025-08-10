import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useEmailPreloader } from '../contexts/EmailPreloaderContext';
import ProfileSelectionScreen from './ProfileSelectionScreen';
import { InboxLayoutProvider } from '../contexts/InboxLayoutContext';
import { FoldersColumnProvider } from '../contexts/FoldersColumnContext';
import { PanelSizesProvider } from '../contexts/PanelSizesContext';
import { EmailListProvider } from '../contexts/EmailListContext';

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

  const handleCompose = () => {
    navigate('/compose');
  };

  // Check if we're on an email-related route that should use 3-column layout
  const isEmailRoute = location.pathname.startsWith('/inbox') || 
                      location.pathname.startsWith('/unread');

  return (
    <FoldersColumnProvider>
      <PanelSizesProvider>
        <EmailListProvider>
          <InboxLayoutProvider>
            <div className="flex h-screen overflow-hidden bg-gray-50">
              {/* Ghost Preloader Indicator */}
              {isPreloading && (
                <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>👻 Loading emails...</span>
                </div>
              )}
              {isGhostPreloadComplete && showSuccess && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                  🚀 All emails ready!
                </div>
              )}
              
              <Sidebar onCompose={handleCompose} />
              <div className="flex flex-col flex-1 overflow-hidden">
                {isEmailRoute ? (
                  <main className="flex-1 overflow-hidden">
                    <div className="w-full h-full">
                      <Outlet />
                    </div>
                  </main>
                ) : (
                  <main className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-6xl mx-auto">
                      <Outlet />
                    </div>
                  </main>
                )}
              </div>
            </div>
          </InboxLayoutProvider>
        </EmailListProvider>
      </PanelSizesProvider>
    </FoldersColumnProvider>
  );
}

export default Layout;