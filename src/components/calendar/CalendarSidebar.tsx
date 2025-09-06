import React, { useState } from 'react';
import { Plus, Palette } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import AddEventForm from './AddEventForm';

interface CalendarSidebarProps {
  onCalendarToggle: (calendarId: string, visible: boolean) => void;
  activeCalendars: string[];
  onRefreshCalendar?: () => void;
}

const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ onCalendarToggle, activeCalendars, onRefreshCalendar }) => {
  const [calendars] = useState([
    {
      id: 'primary',
      name: 'My Calendar',
      color: '#3788d8',
      owner: true
    }
  ]);

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Calendars</h2>
        </div>

        {/* My Calendars */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">My Calendars</h3>
          </div>
          
          <div className="space-y-2">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="flex items-center space-x-3 py-1">
                <Checkbox
                  checked={activeCalendars.includes(calendar.id)}
                  onCheckedChange={(checked) => onCalendarToggle(calendar.id, checked as boolean)}
                  className="data-[state=checked]:bg-blue-600"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="text-sm text-gray-700 truncate">{calendar.name}</span>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded">
                  <Palette size={12} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <AddEventForm 
              trigger={
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                  <Plus size={14} />
                  <span>Add Event</span>
                </button>
              }
              onEventCreated={onRefreshCalendar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;
