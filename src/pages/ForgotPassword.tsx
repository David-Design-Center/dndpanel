import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      // Check if user exists in our system first
      const { data: userData } = await supabase
        .from('user_credentials')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (!userData) {
        setError('No account found with this email address.');
        setIsLoading(false);
        return;
      }

      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          'Password reset email sent! Please check your inbox for instructions on how to reset your password.'
        );
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold text-center mb-2">Reset your password</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
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
          {isLoading ? 'Sending...' : 'Send Reset Email'}
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
