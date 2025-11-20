import { Suspense, lazy, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import FoldersColumn from '../email labels/FoldersColumn';
import { ProfileGuard } from '../profile/ProfileGuard';
import { useLayoutState } from '../../contexts/LayoutStateContext';
import { useCompose } from '../../contexts/ComposeContext';

const Compose = lazy(() => import('../../pages/Compose'));

function Layout() {
  const location = useLocation();
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useLayoutState();
  const { isComposeOpen, openCompose } = useCompose();

  // Check if we're on an email-related route that should show folders column
  const isEmailRoute = location.pathname.startsWith('/inbox') || 
                       location.pathname.startsWith('/unread');

  // Animation key to keep EmailPageLayout mounted when viewing email details
  const animationKey = useMemo(() => {
    if (isEmailRoute) {
      const basePath = location.pathname.split('/email/')[0];
      return basePath || location.pathname;
    }
    return location.pathname;
  }, [location.pathname, isEmailRoute]);

  const handleCompose = () => {
    openCompose();
  };

  return (
    <ProfileGuard>
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
    </ProfileGuard>
  );
}

export default Layout;
