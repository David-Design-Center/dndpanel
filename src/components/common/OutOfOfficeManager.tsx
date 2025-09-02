import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOutOfOfficeSettings } from '../../contexts/OutOfOfficeSettingsContext';
import { OutOfOfficeSettings } from '../../types';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Save, AlertCircle } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

function OutOfOfficeManager() {
  const { currentProfile } = useProfile();
  const { isGmailSignedIn } = useAuth();
  const { getSettingsForProfile, updateSettings, error: contextError } = useOutOfOfficeSettings();
  
  const [message, setMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings when profile changes
  useEffect(() => {
    if (currentProfile) {
      const settings = getSettingsForProfile(currentProfile.name);
      setMessage(settings.autoReplyMessage || '');
    }
  }, [currentProfile, getSettingsForProfile]);

  const handleSave = async () => {
    if (!currentProfile) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const currentSettings = getSettingsForProfile(currentProfile.name);
      const settings: OutOfOfficeSettings = {
        isOutOfOffice: currentSettings.isOutOfOffice, // Preserve the current status
        autoReplyMessage: message
      };
      await updateSettings(currentProfile.name, settings);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving out-of-office settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  // Show Gmail authentication warning first
  if (!isGmailSignedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          Please connect to Gmail to manage your out-of-office settings.
        </div>
      </div>
    );
  }

  // Show out-of-office manager for all authenticated profiles
  if (!currentProfile) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">

      {/* Error Display */}
      {(contextError || saveError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">
              {saveError || contextError}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Out-of-Office Rich Text Editor */}
        <div className="space-y-2">
          <Label htmlFor="outOfOfficeEditor" className="text-sm font-medium text-gray-700">
            Out of Office Auto-Reply Message
          </Label>
          <div className="rounded-lg overflow-hidden">
            <RichTextEditor
              value={message}
              onChange={setMessage}
              minHeight="300px"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">

          <div className="flex items-center space-x-3">
            {showSuccess && (
              <span className="text-green-600 text-sm font-medium">
                Settings saved successfully!
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !message.trim()}
              className="flex items-center space-x-2 bg-black hover:bg-grey"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutOfOfficeManager;
