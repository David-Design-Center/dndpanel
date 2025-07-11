import SignatureManager from '../components/common/SignatureManager';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

function Settings() {
  const { isGmailSignedIn, signInGmail, signOutGmail } = useAuth();
  const { currentProfile } = useProfile();

  const handleSignInGmail = async () => {
    if (!currentProfile) {
      alert('Please select a profile first.');
      return;
    }

    try {
      await signInGmail(currentProfile);
    } catch (error) {
      console.error('Failed to sign in to Gmail:', error);
      alert('Failed to connect to Gmail. Please check console for details.');
    }
  };

  const handleSignOutGmail = async () => {
    if (!currentProfile) {
      alert('Please select a profile first.');
      return;
    }

    try {
      await signOutGmail(currentProfile);
    } catch (error) {
      console.error('Failed to sign out from Gmail:', error);
      alert('Failed to disconnect from Gmail. Please check console for details.');
    }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isGmailSignedIn ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>
                {isGmailSignedIn 
                  ? `Gmail connected for ${currentProfile?.name || 'current profile'}` 
                  : 'Not connected to Gmail'}
              </span>
            </div>
            
            {isGmailSignedIn ? (
              <button 
                onClick={handleSignOutGmail}
                className="btn btn-secondary text-sm py-1"
              >
                Disconnect Gmail
              </button>
            ) : (
              <button 
                onClick={handleSignInGmail}
                className="btn btn-primary text-sm py-1"
                disabled={!currentProfile}
              >
                Connect to Gmail
              </button>
            )}
          </div>
          
          <p className="text-sm text-gray-600">
            {isGmailSignedIn 
              ? `Gmail account is connected for ${currentProfile?.name}. You can view and send emails directly from this app.` 
              : currentProfile 
                ? `Connect ${currentProfile.name}'s Gmail account to view and send emails directly from this app.`
                : 'Please select a profile first, then connect to Gmail.'}
          </p>
        </div>
        
        {/* Email Signature Manager */}
        <SignatureManager />
      </div>
    </div>
  );
}

export default Settings;