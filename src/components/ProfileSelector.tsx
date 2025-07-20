import { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { User, UserCircle, Lock, ChevronDown, ArrowRight } from 'lucide-react';

function ProfileSelector() {
  const { profiles, currentProfile, selectProfile, error, clearProfile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfileId) return;
    
    const success = await selectProfile(selectedProfileId, passcode);
    
    if (success) {
      setShowPasscodeInput(false);
      setPasscode('');
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      // Reset passcode state when closing dropdown
      setShowPasscodeInput(false);
      setPasscode('');
    }
  };

  return (
    <div className="relative">
      <div className="border border-gray-200 rounded-lg bg-white">
        <button 
          className="flex items-center px-4 py-2 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100 rounded-t-lg w-full"
          onClick={toggleDropdown}
        >
          <span className="mr-3">
            <UserCircle size={20} className="text-gray-600" />
          </span>
          <span className="flex-1 text-left">{currentProfile?.name || 'Select Profile'}</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Switch Profile option underneath the name */}
        {currentProfile && (
          <button
            onClick={clearProfile}
            className="flex items-center px-4 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 w-full text-left border-t border-gray-100 rounded-b-lg transition-colors"
          >
            <ArrowRight size={12} className="mr-2" />
            <span>Switch Profile</span>
          </button>
        )}
      </div>
      
      {isOpen && !showPasscodeInput && (
        <div className="absolute left-0 mt-1 w-full z-10 bg-white rounded-md shadow-lg py-1 border border-gray-200">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentProfile?.id === profile.id ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
              }`}
              onClick={() => handleProfileClick(profile.id)}
            >
              <User size={16} className="mr-2" />
              <span>{profile.name}</span>
              {profile.passcode && <Lock size={12} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </div>
      )}
      
      {showPasscodeInput && (
        <div className="absolute left-0 mt-1 w-full z-10 bg-white rounded-md shadow-lg p-3 border border-gray-200">
          <form onSubmit={handlePasscodeSubmit}>
            <p className="text-sm font-medium mb-2">
              Enter passcode for {profiles.find(p => p.id === selectedProfileId)?.name}:
            </p>
            <div className="mb-2">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Passcode"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-3 py-1 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              >
                Submit
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                onClick={() => {
                  setShowPasscodeInput(false);
                  setPasscode('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ProfileSelector;