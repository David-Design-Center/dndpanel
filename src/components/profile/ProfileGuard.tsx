import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import ProfileSelectionScreen from './ProfileSelectionScreen';

/**
 * ProfileGuard Component
 * 
 * Handles profile selection logic for all users (admin and staff).
 * For staff users, automatically selects their assigned profile.
 * For admin users, shows profile selection screen.
 * 
 * This component extracts profile management logic from Layout.tsx
 * to maintain Single Responsibility Principle.
 */
export function ProfileGuard({ children }: { children: ReactNode }) {
  const { loading, isAdmin, userProfileId } = useAuth();
  const { currentProfile, isLoading: profileLoading, selectProfile } = useProfile();
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [autoSelectionFailed, setAutoSelectionFailed] = useState(false);

  // Auto-select profile for non-admin users (only once)
  useEffect(() => {
    if (
      !loading &&
      !profileLoading &&
      !isAdmin &&
      userProfileId &&
      !currentProfile &&
      !hasAutoSelected &&
      !autoSelectionFailed
    ) {
      console.log('🚀 Auto-selecting profile for staff user:', userProfileId);
      setHasAutoSelected(true);
      
      selectProfile(userProfileId, undefined, true).then((success) => {
        console.log('✅ Profile auto-selection result:', success);
        if (!success) {
          console.log('❌ Profile auto-selection failed permanently, stopping retries');
          setAutoSelectionFailed(true);
          setHasAutoSelected(false);
        }
      });
    }
  }, [
    loading,
    profileLoading,
    isAdmin,
    userProfileId,
    currentProfile,
    selectProfile,
    hasAutoSelected,
    autoSelectionFailed,
  ]);

  // Show loading state
  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show profile selection screen if no profile is selected
  if (!currentProfile) {
    return <ProfileSelectionScreen />;
  }

  // Profile is selected, render children
  return <>{children}</>;
}
