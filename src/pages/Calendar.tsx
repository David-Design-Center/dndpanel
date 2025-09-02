import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const Calendar: React.FC = () => {
  const { isGmailSignedIn } = useAuth();
  const navigate = useNavigate();

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    return (
      <div className="p-6 h-full">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to Gmail to access the Calendar. This page requires Gmail integration to manage your appointments and meetings.
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="btn btn-primary"
            >
              Go to Inbox to Connect Gmail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">Schedule your appointments and meetings</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)]">
        <iframe 
          src="https://cal.com/d-d-david/visit?embed=true&theme=light"
          className="h-full w-full rounded-lg"
          style={{ minHeight: '600px', border: 'none' }}
          title="Schedule a meeting"
        />
      </div>
    </div>
  );
};

export default Calendar;