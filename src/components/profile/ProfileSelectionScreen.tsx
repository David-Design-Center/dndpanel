import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { User, Lock, Shield, UserCircle } from 'lucide-react';

function ProfileSelectionScreen() {
  const { profiles, selectProfile, error, isLoading } = useProfile();
  const [passcode, setPasscode] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);

  const handleProfileClick = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) return;
    
    // If the profile requires a passcode
    if (profile.passcode) {
      setSelectedProfileId(profileId);
      setShowPasscodeInput(true);
      setPasscode('');
    } else {
      // If no passcode required, directly select the profile
      await selectProfile(profileId);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfileId) return;
    
    const success = await selectProfile(selectedProfileId, passcode);
    
    if (success) {
      setShowPasscodeInput(false);
      setPasscode('');
    }
  };

  const handleBackToProfiles = () => {
    setShowPasscodeInput(false);
    setPasscode('');
    setSelectedProfileId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle size={32} className="text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {showPasscodeInput ? 'Enter Passcode' : 'Select Profile'}
            </h1>
            <p className="text-gray-600">
              {showPasscodeInput 
                ? `Enter the passcode for ${profiles.find(p => p.id === selectedProfileId)?.name}`
                : 'Choose a profile to access the panel'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Profile Selection */}
          {!showPasscodeInput && (
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No profiles available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Contact your administrator to set up profiles
                  </p>
                </div>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all group"
                    onClick={() => handleProfileClick(profile.id)}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4 group-hover:bg-primary-100">
                      <User size={20} className="text-gray-600 group-hover:text-primary-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-gray-900 group-hover:text-primary-700">
                        {profile.name}
                      </h3>
                    </div>
                    {profile.passcode && (
                      <Lock size={20} className="text-gray-400 group-hover:text-primary-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Passcode Input */}
          {showPasscodeInput && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div>
                <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Passcode
                </label>
                <input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter passcode"
                  autoFocus
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 font-medium transition-colors"
                >
                  Access Profile
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 font-medium transition-colors"
                  onClick={handleBackToProfiles}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            D&D Panel &copy; 2025. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfileSelectionScreen;
