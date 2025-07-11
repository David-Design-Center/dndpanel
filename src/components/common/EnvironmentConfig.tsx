import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

function EnvironmentConfig() {
  const [showValues, setShowValues] = useState(false);
  
  const envVars = [
    { name: 'VITE_SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL },
    { name: 'VITE_SUPABASE_ANON_KEY', value: import.meta.env.VITE_SUPABASE_ANON_KEY },
    { name: 'VITE_GAPI_API_KEY', value: import.meta.env.VITE_GAPI_API_KEY },
    { name: 'VITE_GAPI_CLIENT_ID', value: import.meta.env.VITE_GAPI_CLIENT_ID },
  ];
  
  const toggleShowValues = () => {
    setShowValues(!showValues);
  };
  
  const maskValue = (value: string | undefined) => {
    if (!value) return '';
    return showValues ? value : value.substring(0, 4) + '...' + value.substring(value.length - 4);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Environment Configuration</h2>
        <button 
          onClick={toggleShowValues}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
        >
          {showValues ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      
      <div className="space-y-2">
        {envVars.map((env) => (
          <div key={env.name} className="flex items-center justify-between p-2 border-b border-gray-100">
            <span className="text-sm font-medium">{env.name}</span>
            <div className="flex items-center">
              {env.value ? (
                <>
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <span className="text-sm text-gray-600 font-mono">{maskValue(env.value)}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-red-500 mr-2" />
                  <span className="text-sm text-red-600">Not set</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
        <p>
          <strong>Security Note:</strong> Gmail refresh tokens and client secrets are now managed securely. 
          Each profile stores refresh tokens in the database, and token refresh is handled by secure Supabase Edge Functions.
        </p>
      </div>
      
      <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded text-sm text-green-700">
        <p>
          <strong>Multi-Account Setup:</strong> Each staff member can connect their own Gmail account. 
          When switching profiles, the Gmail connection will change to match the selected profile's account.
        </p>
      </div>
    </div>
  );
}

export default EnvironmentConfig;