import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { useOutOfOfficeSettings } from '../../contexts/OutOfOfficeSettingsContext';
import { OutOfOfficeSettings } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Settings, Save, RotateCcw, AlertCircle } from 'lucide-react';

function OutOfOfficeManager() {
  const { currentProfile } = useProfile();
  const { getSettingsForProfile, updateSettings, isLoading: contextLoading, error: contextError } = useOutOfOfficeSettings();
  
  const [formData, setFormData] = useState<OutOfOfficeSettings>({
    forwardToEmail: '',
    autoReplyMessage: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings when profile changes
  useEffect(() => {
    if (currentProfile) {
      const settings = getSettingsForProfile(currentProfile.name);
      setFormData(settings);
    }
  }, [currentProfile, getSettingsForProfile]);

  const handleSave = async () => {
    if (!currentProfile) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings(currentProfile.name, formData);
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
    setFormData(defaultSettings);
  };

  const handleMessageChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      autoReplyMessage: value
    }));
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      forwardToEmail: value
    }));
  };

  // Don't show for profiles that don't support out-of-office
  if (!currentProfile || (currentProfile.name !== 'David' && currentProfile.name !== 'Marti')) {
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
        {/* Forward To Email */}
        <div className="space-y-2">
          <Label htmlFor="forwardEmail" className="text-sm font-medium text-gray-700">
            Forward Emails To
          </Label>
          <Input
            id="forwardEmail"
            type="email"
            placeholder="colleague@example.com"
            value={formData.forwardToEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            When you're out of office, incoming emails will be forwarded to this address.
          </p>
        </div>

        {/* Auto-Reply Message */}
        <div className="space-y-2">
          <Label htmlFor="autoReplyMessage" className="text-sm font-medium text-gray-700">
            Auto-Reply Message
          </Label>
          <Textarea
            id="autoReplyMessage"
            placeholder="Enter your out-of-office message..."
            value={formData.autoReplyMessage}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleMessageChange(e.target.value)}
            rows={8}
            className="w-full resize-none"
          />
          <p className="text-xs text-gray-500">
            This message will be automatically sent to people who email you while you're out of office.
            Basic HTML formatting is supported.
          </p>
        </div>

        {/* Preview */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Message Preview
          </Label>
          <div className="bg-gray-50 p-4 rounded-md border">
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formData.autoReplyMessage }}
            />
          </div>
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
              disabled={isSaving || !formData.forwardToEmail.trim() || !formData.autoReplyMessage.trim()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
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
