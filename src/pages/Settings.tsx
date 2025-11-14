import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SignatureManager from '../components/common/SignatureManager';
import OutOfOfficeManager from '../components/common/OutOfOfficeManager';
import SettingsFilters from '../components/email labels/SettingsFilters';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useFilterCreation } from '../contexts/FilterCreationContext';
import { 
  PenTool, 
  Clock, 
  Filter, 
  Mail,
  X
} from 'lucide-react';

function Settings() {
  const { isGmailSignedIn, signInGmail, signOutGmail } = useAuth();
  const { currentProfile } = useProfile();
  const { filterCreation } = useFilterCreation();
  const [activeSection, setActiveSection] = useState<'signature' | 'outofoffice' | 'filters' | null>(null);
  const location = useLocation();

  // Check if current profile has domain email
  const isDomainUser = currentProfile?.userEmail?.endsWith('@dnddesigncenter.com') || false;

  // Check if we should auto-open filters section from context menu or filter creation context
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    // Check URL parameters first
    if (tabParam === 'filters') {
      setActiveSection('filters');
    }
    
    // Check filter creation context
    if (filterCreation.isCreating && filterCreation.shouldOpenCreate) {
      setActiveSection('filters');
    }
    
    // Legacy: Check location state
    const state = location.state as any;
    if (state?.createFilter) {
      setActiveSection('filters');
    }
  }, [location.search, location.state, filterCreation.isCreating, filterCreation.shouldOpenCreate]);

  const handleSignInGmail = async () => {
    if (!currentProfile) {
      alert('Please select a profile first.');
      return;
    }

    try {
      await signInGmail(currentProfile);
    } catch (error) {
      console.error('Failed to sign in to Gmail:', error);
      
      // Check if it's an external user error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('External email accounts')) {
        alert('External email accounts require additional setup. Please check the email Connection section for more information.');
      } else {
        alert('Failed to connect to email. Please check console for details.');
      }
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
      </div>
      
      <div className="space-y-4">
        {/* Email Connection Card - Keep at top as requested */}
        <div
          className="p-3 rounded-xl shadow-xl"
          style={{
            background: "linear-gradient(135deg, #000000 0%, #4b5563 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div
                className="p-2 mr-3 rounded-full shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #000000 0%, #4b5563 100%)",
                }}
              >
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div>
          <h3 className="font-semibold text-base text-gray-100">Email Connection</h3>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${isGmailSignedIn ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-white">
                    {isGmailSignedIn 
                      ? `Connected (${currentProfile?.name || 'current profile'})` 
                      : 'Not connected'}
                  </span>
                </div>
              </div>
            </div> 
            {isGmailSignedIn ? (
              <button 
                onClick={handleSignOutGmail}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition-colors animate-pulse"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={handleSignInGmail}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors animate-pulse"
                disabled={!currentProfile}
              >
                Connect
              </button>
            )}
          </div>  
          
          <p className="text-xs text-white">
            {isGmailSignedIn 
              ? `Gmail account is connected for ${currentProfile?.name} (${currentProfile?.userEmail || 'no email'}). You can view and send emails directly from this app.` 
              : currentProfile 
                ? isDomainUser
                  ? `Connect ${currentProfile.name}'s Gmail account (${currentProfile.userEmail}) to view and send emails directly from this app.`
                  : currentProfile.userEmail
                    ? `External Gmail account (${currentProfile.userEmail}) requires OAuth authentication. Click Connect to authenticate via Google's secure popup.`
                    : `Profile ${currentProfile.name} has no email configured. Please contact your administrator.`
                : 'Please select a profile first, then connect to Gmail.'}
          </p>
        </div>
        
        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Signature Card */}
          <div 
            className={`group cursor-pointer ${activeSection === 'signature' ? 'ring-1.5 ring-purple-500 ring-offset-1 rounded-lg' : ''}`} 
            onClick={() => setActiveSection(activeSection === 'signature' ? null : 'signature')}
          >
            <div className="h-20 rounded-t-lg bg-gradient-to-r from-purple-500 to-indigo-600 p-3 flex items-center justify-center shadow-md transform group-hover:-translate-y-1 transition-all duration-300">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-full shadow-lg">
                <PenTool className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-b-lg shadow-md">
              <h3 className="font-bold text-base text-gray-800">Email Signature</h3>
              <p className="text-xs text-gray-600">Customize your email signature and template</p>
            </div>
          </div>
          
          {/* Out of Office Card */}
          <div 
            className={`group cursor-pointer ${activeSection === 'outofoffice' ? 'ring-1.5 ring-amber-500 ring-offset-1 rounded-lg' : ''}`}
            onClick={() => setActiveSection(activeSection === 'outofoffice' ? null : 'outofoffice')}
          >
            <div className="h-20 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-600 p-3 flex items-center justify-center shadow-md transform group-hover:-translate-y-1 transition-all duration-300">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-full shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-b-lg shadow-md">
              <h3 className="font-bold text-base text-gray-800">Out of Office</h3>
              <p className="text-xs text-gray-600">Set up automatic email responses when you're away</p>
            </div>
          </div>
          
          {/* Filters Card */}
          <div 
            className={`group cursor-pointer ${activeSection === 'filters' ? 'ring-1.5 ring-emerald-500 ring-offset-1 rounded-lg' : ''}`}
            onClick={() => setActiveSection(activeSection === 'filters' ? null : 'filters')}
          >
            <div className="h-20 rounded-t-lg bg-gradient-to-r from-emerald-500 to-teal-600 p-3 flex items-center justify-center shadow-md transform group-hover:-translate-y-1 transition-all duration-300">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-full shadow-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-b-lg shadow-md">
              <h3 className="font-bold text-base text-gray-800">Rules</h3>
              <p className="text-xs text-gray-600">Manage rules to organize your inbox</p>
            </div>
          </div>
        </div>
        
        {/* Active Section */}
        {activeSection && (
          <div className="mt-4 animate-fadeIn">
            <div className="bg-white rounded-md shadow-sm p-2 relative">
              <button 
                className="absolute right-1 top-1 p-0.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => setActiveSection(null)}
              >
                <X className="w-2.5 h-2.5 text-gray-600" />
              </button>
              
              {activeSection === 'signature' && (
                <>
                  <div className="flex items-center mb-2">
                    <div className="p-1 mr-1.5 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 shadow-sm">
                      <PenTool className="w-2.5 h-2.5 text-purple-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-800">Email Signature</h2>
                  </div>
                  <div className="settings-expandable-content">
                    <SignatureManager />
                  </div>
                </>
              )}

              {activeSection === 'outofoffice' && (
                <>
                  <div className="flex items-center mb-2">
                    <div className="p-1 mr-1.5 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm">
                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-800">Out of Office</h2>
                  </div>
                  <div className="settings-expandable-content">
                    <OutOfOfficeManager />
                  </div>
                </>
              )}

              {activeSection === 'filters' && (
                <>
                  <div className="flex items-center mb-2">
                    <div className="p-1 mr-1.5 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-sm">
                      <Filter className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-800">Rules</h2>
                  </div>
                  <div className="settings-expandable-content">
                    <SettingsFilters />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;