import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import microsoftGraphService from '../services/microsoftGraphService';
import Loading from '../components/common/Loading';

/**
 * Microsoft Authentication Redirect Handler
 * 
 * This component handles the redirect response from Microsoft OAuth.
 * It processes the authentication once and then redirects to prevent loops.
 */
const MicrosoftAuthRedirect = () => {
  const navigate = useNavigate();
  const [isHandling, setIsHandling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('Processing Microsoft authentication redirect...');
        
        // Only process if there's actually a hash in the URL (authentication response)
        if (!window.location.hash) {
          console.log('No hash found, redirecting to calendar...');
          navigate('/calendar', { replace: true });
          return;
        }

        // Handle the redirect response from Microsoft
        const response = await microsoftGraphService.getMsalInstance().handleRedirectPromise();
        
        if (response && response.account) {
          console.log('Microsoft authentication successful:', response.account.username);
          
          // Store the authentication success in sessionStorage to prevent re-processing
          sessionStorage.setItem('msalAuthComplete', 'true');
          
          // Navigate to calendar after successful authentication
          navigate('/calendar', { replace: true });
        } else {
          console.log('No authentication response found');
          navigate('/calendar', { replace: true });
        }
      } catch (error) {
        console.error('Error handling Microsoft authentication redirect:', error);
        setError(`Authentication failed: ${(error as any)?.message || 'Unknown error'}`);
        
        // Even if there's an error, navigate back to calendar after a short delay
        setTimeout(() => {
          navigate('/calendar', { replace: true });
        }, 3000);
      } finally {
        setIsHandling(false);
      }
    };

    // Check if we've already processed authentication in this session
    const authComplete = sessionStorage.getItem('msalAuthComplete');
    if (authComplete) {
      console.log('Authentication already processed, redirecting to calendar...');
      navigate('/calendar', { replace: true });
      return;
    }

    handleRedirect();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to calendar...</p>
        </div>
      </div>
    );
  }

  if (isHandling) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loading />
          <p className="mt-4 text-sm text-gray-600">
            Completing Microsoft authentication...
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default MicrosoftAuthRedirect;
