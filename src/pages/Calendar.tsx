import React from 'react';

const Calendar: React.FC = () => {
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