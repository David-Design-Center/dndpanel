import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import ProfileSelectionScreen from './ProfileSelectionScreen';

function Layout() {
  const { loading } = useAuth();
  const { currentProfile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar onCompose={handleCompose} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;