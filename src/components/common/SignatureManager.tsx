import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import RichTextEditor from './RichTextEditor';
import { Button } from '../ui/button';
import { Save, RotateCcw, Eye, X } from 'lucide-react';
import Modal from './Modal';

// Default signatures
const DEFAULT_SIGNATURES: {[key: string]: string} = {
  Dimitry: `
    <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
      <p style="margin: 0; padding: 0;"><strong>D&D Design Center</strong></p>
      <p style="margin: 0; padding: 0;">2615 East 17 street</p>
      <p style="margin: 0; padding: 0;">Brooklyn NY 11235</p>
      <p style="margin: 0; padding: 0;">Tel: (718) 934-7100</p>
      <p style="margin: 0; padding: 0;">Email: info@dnddesigncenter.com</p>
      <p style="margin: 0; padding: 0;"><a href="https://www.dnddesigncenter.com" style="color: #007bff; text-decoration: none;">www.dnddesigncenter.com</a></p>
    </div>
  `,
  David: `
    <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
      <iframe src="https://drive.google.com/file/d/1Rg-btxeibQ4KGL_cwoja0bM0oajLFRUj/preview" width="500" height="80" allow="autoplay" style="border: none;"></iframe>
    </div>
  `,
  Natalia: `
    <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
      <p style="margin: 0; padding: 0;"><strong>NATALIA LANDA</strong></p>
      <p style="margin: 0; padding: 0;">Designer</p>
      <p style="margin: 0; padding: 0;">D&D design center</p>
      <p style="margin: 0; padding: 0;">2615 East 17 street</p>
      <p style="margin: 0; padding: 0;">Brooklyn New York, 11235</p>
      <p style="margin: 0; padding: 0;">T-718-934-7100</p>
      <p style="margin: 0; padding: 0;"><a href="https://www.dnddesigncenter.com" style="color: #007bff; text-decoration: none;">www.dnddesigncenter.com</a></p>
      <p style="margin: 0; padding: 0;">Natalia.Landa2615@gmail.com</p>
    </div>
  `,
  Marti: `
    <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
      <iframe src="https://drive.google.com/file/d/19vC1cBePeyN79OM6RLL-ksPMC8vtXndL/preview" width="500" height="80" allow="autoplay" style="border: none;"></iframe>
    </div>
  `
};

function SignatureManager() {
  const { currentProfile, updateProfileSignature } = useProfile();
  const [signature, setSignature] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current profile signature when profile changes
  useEffect(() => {
    if (currentProfile) {
      setSignature(currentProfile.signature || '');
    }
  }, [currentProfile]);

  // Reset signature to profile's saved signature
  const handleReset = () => {
    if (currentProfile) {
      setSignature(currentProfile.signature || '');
    }
  };

  // Reset to default signature for current profile
  const handleUseDefault = () => {
    if (currentProfile) {
      const defaultSig = DEFAULT_SIGNATURES[currentProfile.name] || '';
      setSignature(defaultSig);
    }
  };

  // Save signature to database
  const handleSave = async () => {
    if (!currentProfile) {
      setError('No profile selected');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      console.log('SignatureManager: Attempting to save signature for profile:', currentProfile.name, currentProfile.id);
      console.log('SignatureManager: Signature content length:', signature.length);
      
      // Test if we can read the profile first
      console.log('SignatureManager: Testing profile read access...');
      
      const success = await updateProfileSignature(currentProfile.id, signature);
      
      if (success) {
        setSuccess('Signature saved successfully!');
        console.log('SignatureManager: Signature saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Failed to save signature - updateProfileSignature returned false');
      }
    } catch (err) {
      console.error('SignatureManager: Error saving signature:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save signature. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        Please select a profile to manage signatures.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600">
          {success}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Edit Signature
        </label>
        <div className="rounded-lg overflow-hidden">
          <RichTextEditor
            value={signature}
            onChange={setSignature}
            minHeight="300px"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="flex justify-start pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Signature
            </>
          )}
        </Button>
      </div> 
    </div>
  );
}

export default SignatureManager;