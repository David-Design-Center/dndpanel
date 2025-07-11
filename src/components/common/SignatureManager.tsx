import React, { useState, useEffect } from 'react';
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
    if (!currentProfile) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const success = await updateProfileSignature(currentProfile.id, signature);
      
      if (success) {
        setSuccess('Signature saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Failed to save signature');
      }
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature. Please try again.');
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Email Signature</h2>
          <p className="text-sm text-gray-600">
            Your signature will be automatically added to the emails you send.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleUseDefault}
          >
            Use Default
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw size={14} className="mr-1" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={14} className="mr-1" />
            Preview
          </Button>
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
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <RichTextEditor
            value={signature}
            onChange={setSignature}
            minHeight="200px"
            disabled={isSaving}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          <strong>HTML Support:</strong> You can use HTML tags, including iframe embeds from Google Drive or other sources.
        </p>
      </div>

      <div className="flex justify-end">
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

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Signature Preview"
        size="lg"
      >
        <div className="p-6 bg-white">
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="text-sm text-gray-600 mb-4">
              This is how your signature will appear in emails:
            </div>
            <div 
              className="email-isolation-container p-4 border border-gray-200 rounded-lg bg-gray-50"
              dangerouslySetInnerHTML={{ __html: signature }}
            />
          </div>
          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="flex items-center"
            >
              <X size={16} className="mr-2" />
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SignatureManager;