import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CalendarIcon, Plus } from 'lucide-react';
import GoogleCalendar from '../components/calendar/GoogleCalendar';
import AddEventForm from '../components/calendar/AddEventForm';

const Calendar: React.FC = () => {
  const { isGmailSignedIn } = useAuth();
  const navigate = useNavigate();
  const calendarRef = useRef<any>(null);

  const handleRefreshCalendar = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  };

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
              Please connect to Gmail to access Google Calendar. This integration allows you to view and manage your calendar events directly from the dashboard.
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Connect to Gmail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Calendar</h1>
          </div>
          <div className="flex items-center space-x-2">
            <AddEventForm 
              trigger={
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  <Plus size={14} className="mr-1.5" />
                  <span>Add Event</span>
                </button>
              }
              onEventCreated={handleRefreshCalendar}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 pb-6">
        <div className="bg-white rounded-xl shadow-xl h-full">
          <GoogleCalendar ref={calendarRef} />
        </div>
      </div>
    </div>
  );
};

export default Calendar;