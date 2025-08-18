import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { hasPasswordResetTokens } from '@/utils/authFlowUtils';
import { logPasswordResetAttempt } from '@/utils/securityLogging';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Function to check for password recovery session
    const checkForRecoverySession = async () => {
      try {
        // First, ensure the hash is processed
        const { data: session } = await supabase.auth.getSession();
        
        // Check if we have a recovery session or the URL contains recovery tokens
        const hasRecoveryTokens = hasPasswordResetTokens();
        
        if (session?.session || hasRecoveryTokens) {
          setReady(true);
          setHasValidSession(true);
          // Store the user email for display
          if (session?.session?.user?.email) {
            setUserEmail(session.session.user.email);
          }
        } else {
          // If no recovery session, wait a bit longer and try again
          setTimeout(async () => {
            const { data: retrySession } = await supabase.auth.getSession();
            if (retrySession?.session) {
              setReady(true);
              setHasValidSession(true);
              if (retrySession.session.user?.email) {
                setUserEmail(retrySession.session.user.email);
              }
            } else {
              console.warn('No recovery session found. User might need to click the reset link again.');
              setReady(true); // Allow user to see the form anyway
              setHasValidSession(false);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking recovery session:', error);
        setReady(true); // Allow user to proceed anyway
        setHasValidSession(false);
      }
    };

    checkForRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setHasValidSession(true);
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // SECURITY: Block submission if no valid session
    if (!hasValidSession) {
      setError('No valid reset session. Please request a new password reset link.');
      return;
    }

    setIsLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await updatePassword(password);
      if (error) {
        logPasswordResetAttempt(false, userEmail || undefined, error.message);
        setError(error.message);
      } else {
        logPasswordResetAttempt(true, userEmail || undefined);
        setMessage('Password updated successfully! Redirecting to login...');
        // Redirect to auth page after successful password update
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      logPasswordResetAttempt(false, userEmail || undefined, String(error));
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="animate-pulse text-gray-600">Preparing password reset...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold text-center mb-6">Set a new password</h1>
        
        {userEmail && hasValidSession && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 mb-4">
            ✅ Resetting password for: <strong>{userEmail}</strong>
          </div>
        )}
        
        {!hasValidSession && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            ❌ Invalid or expired reset session. Please request a new password reset link.
          </div>
        )}
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            disabled={!hasValidSession}
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={!hasValidSession}
          />
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
        
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            {message}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isLoading || !hasValidSession}
          className="w-full rounded-lg bg-black text-white py-3 px-4 font-medium hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Updating...' : hasValidSession ? 'Update Password' : 'Invalid Session'}
        </button>
        
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="text-sm text-gray-600 hover:text-gray-800 block w-full"
          >
            Back to login
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth/forgot')}
            className="text-sm text-blue-600 hover:text-blue-800 block w-full"
          >
            Request a new reset link
          </button>
        </div>
      </form>
    </div>
  );
}
