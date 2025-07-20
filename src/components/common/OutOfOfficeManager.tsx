import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { useOutOfOfficeSettings } from '../../contexts/OutOfOfficeSettingsContext';
import { OutOfOfficeSettings } from '../../types';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Settings, Save, RotateCcw, AlertCircle } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

function OutOfOfficeManager() {
  const { currentProfile } = useProfile();
  const { getSettingsForProfile, updateSettings, isLoading: contextLoading, error: contextError } = useOutOfOfficeSettings();
  
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

  const handleReset = () => {
    if (!currentProfile) return;
    const defaultSettings = getSettingsForProfile(currentProfile.name);
    setMessage(defaultSettings.autoReplyMessage || '');
  };

  // Don't show for profiles that don't support out-of-office
  if (!currentProfile || !['David', 'Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center mb-6">
        <Settings className="w-5 h-5 mr-2 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">
          Out of Office Settings - {currentProfile.name}
        </h2>
        {contextLoading && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

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
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <RichTextEditor
              value={message}
              onChange={setMessage}
              minHeight="300px"
              disabled={isSaving}
            />
          </div>
          <p className="text-xs text-gray-500">
            This message will be automatically sent to people who email you while you're out of office. Basic formatting is supported.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Default</span>
          </Button>

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
