import { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import RichTextEditor from './RichTextEditor';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCw, Check, X } from 'lucide-react';
import { 
  fetchGmailSignature, 
  updateGmailSignature 
} from '../../services/gmailSignatureService';
import { useToast } from '../ui/use-toast';

function SignatureManager() {
  const { currentProfile } = useProfile();
  const { isGmailSignedIn } = useAuth();
  const { toast } = useToast();
  const [signature, setSignature] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gmailSyncStatus, setGmailSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Auto-load signature from Gmail on mount
  useEffect(() => {
    if (currentProfile?.userEmail && isGmailSignedIn) {
      loadSignatureFromGmail();
    } else {
      setIsLoading(false);
    }
  }, [currentProfile?.userEmail, isGmailSignedIn]);

  // Load signature directly from Gmail
  const loadSignatureFromGmail = async () => {
    if (!currentProfile?.userEmail) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📝 Loading signature from Gmail for:', currentProfile.userEmail);
      const gmailSig = await fetchGmailSignature(currentProfile.userEmail);
      
      setSignature(gmailSig || '');
      setGmailSyncStatus('synced');
      console.log('✅ Loaded signature from Gmail, length:', gmailSig?.length || 0);
      
    } catch (err) {
      console.error('❌ Error loading Gmail signature:', err);
      setError('Failed to load signature from Gmail. Please try again.');
      setGmailSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save signature to Gmail only
  const handleSave = async () => {
    if (!currentProfile?.userEmail) {
      setError('No email configured for this profile');
      return;
    }

    try {
      setIsSaving(true);
      setGmailSyncStatus('syncing');
      setError(null);
      
      console.log('📝 Saving signature to Gmail for:', currentProfile.userEmail);
      console.log('📝 Signature length:', signature.length);
      
      await updateGmailSignature(currentProfile.userEmail, signature);
      
      setGmailSyncStatus('synced');
      console.log('✅ Saved signature to Gmail');
      
      toast({
        title: "Signature saved",
        description: "Your signature has been saved to Gmail.",
      });
      
    } catch (err) {
      console.error('❌ Error saving signature to Gmail:', err);
      setGmailSyncStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to save signature. Please try again.';
      setError(errorMessage);
      
      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      });
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

  if (!currentProfile.userEmail) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          This profile doesn't have an email address configured.
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading signature from Gmail...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-6">
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
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save to Gmail'
          )}
        </Button>
      </div> 
    </div>
  );
}

export default SignatureManager;