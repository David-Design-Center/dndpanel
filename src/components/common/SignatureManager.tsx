import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import RichTextEditor from './RichTextEditor';
import { Button } from '../ui/button';
import { AlertCircle } from 'lucide-react';

// Default signatures

function SignatureManager() {
  const { currentProfile, updateProfileSignature } = useProfile();
  const { isGmailSignedIn } = useAuth();
  const [signature, setSignature] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current profile signature when profile changes
  useEffect(() => {
    if (currentProfile) {
      setSignature(currentProfile.signature || '');
    }
  }, [currentProfile]);

  // Reset signature to profile's saved signature

  // Reset to default signature for current profile

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

  if (!isGmailSignedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          Please connect to Gmail to manage your email signature.
        </div>
      </div>
    );
  }

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
              Save
            </>
          )}
        </Button>
      </div> 
    </div>
  );
}

export default SignatureManager;