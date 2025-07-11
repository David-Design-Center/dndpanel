import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function EmailStatus() {
  const { isGmailSignedIn } = useAuth();

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm">
      {isGmailSignedIn ? (
        <>
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-green-700">Gmail connected</span>
        </>
      ) : (
        <>
          <AlertCircle size={16} className="text-amber-500" />
          <span className="text-amber-700">Gmail not connected</span>
        </>
      )}
    </div>
  );
}

export default EmailStatus;