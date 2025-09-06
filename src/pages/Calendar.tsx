import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CalendarIcon } from 'lucide-react';
import GoogleCalendar from '../components/calendar/GoogleCalendar';
import CalendarSidebar from '../components/calendar/CalendarSidebar';

const Calendar: React.FC = () => {
  const { isGmailSignedIn } = useAuth();
  const navigate = useNavigate();
  const [activeCalendars, setActiveCalendars] = useState(['primary']);
  const calendarRef = useRef<any>(null);

  const handleCalendarToggle = (calendarId: string, visible: boolean) => {
    if (visible) {
      setActiveCalendars(prev => [...prev, calendarId]);
    } else {
      setActiveCalendars(prev => prev.filter(id => id !== calendarId));
    }
  };

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
    <div className="h-full flex">
      <CalendarSidebar 
        onCalendarToggle={handleCalendarToggle}
        activeCalendars={activeCalendars}
        onRefreshCalendar={handleRefreshCalendar}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Manage your schedule and events</p>
        </div>
        
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full p-4">
            <GoogleCalendar ref={calendarRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;