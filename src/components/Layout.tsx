import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import ProfileSelectionScreen from './ProfileSelectionScreen';
import { InboxLayoutProvider } from '../contexts/InboxLayoutContext';
import { FoldersColumnProvider } from '../contexts/FoldersColumnContext';
import { PanelSizesProvider } from '../contexts/PanelSizesContext';
import { EmailListProvider } from '../contexts/EmailListContext';

function Layout() {
  const { loading } = useAuth();
  const { currentProfile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If no profile is selected, show profile selection screen
  if (!currentProfile) {
    return <ProfileSelectionScreen />;
  }

  const handleCompose = () => {
    navigate('/compose');
  };

  // Check if we're on an email-related route that should use 3-column layout
  const isEmailRoute = location.pathname.startsWith('/inbox') || 
                      location.pathname.startsWith('/unread') || 
                      location.pathname.startsWith('/sent') || 
                      location.pathname.startsWith('/drafts') || 
                      location.pathname.startsWith('/trash');

  return (
    <FoldersColumnProvider>
      <PanelSizesProvider>
        <EmailListProvider>
          <InboxLayoutProvider>
            <div className="flex h-screen overflow-hidden bg-gray-50">
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