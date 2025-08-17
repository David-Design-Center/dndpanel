import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure the hash is processed and a session is established for the recovery link
    // supabase-js v2 parses the hash on first auth call; this guarantees it happens.
    supabase.auth.getSession().finally(() => setReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
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
        setError(error.message);
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        // Redirect to auth page after successful password update
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
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
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
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
          disabled={isLoading}
          className="w-full rounded-lg bg-black text-white py-3 px-4 font-medium hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  );
}
