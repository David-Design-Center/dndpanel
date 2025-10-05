import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useRef, useCallback, useMemo, forwardRef, useImperativeHandle, useState } from "react";
import { useToast } from "../ui/use-toast";
import { fetchCalendarEvents, updateCalendarEvent } from '@/services/calendarService';
import { useProfile } from '@/contexts/ProfileContext';
import EditEventPopover from './EditEventPopover';

interface GoogleCalendarProps {
  activeCalendarId?: string;
}

const GoogleCalendar = forwardRef<FullCalendar, GoogleCalendarProps>((_props, forwardedRef) => {
  const ref = useRef<FullCalendar | null>(null);
  const { toast } = useToast();
  const { currentProfile } = useProfile();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [editPopoverOpen, setEditPopoverOpen] = useState(false);

  // Expose the ref to parent components
  useImperativeHandle(forwardedRef, () => ref.current as FullCalendar);

  // Memoize plugins to prevent FullCalendar re-initialization
  const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin], []);

  // Memoized fetchEvents function to prevent recreation on every render
  const fetchEvents = useCallback(async (info: any, success: any, failure: any) => {
    if (!currentProfile?.userEmail) {
      failure(new Error('No user profile found'));
      return;
    }

    console.log('📅 FullCalendar requesting events for:', currentProfile.userEmail);
    console.log('📅 Date range:', info.startStr, 'to', info.endStr);
    
    try {
      const events = await fetchCalendarEvents(
        currentProfile.userEmail,
        info.startStr,
        info.endStr,
        'primary'
      );
      
      console.log('📅 Returning', events.length, 'events to FullCalendar');
      success(events);
    } catch (err: any) {
      console.error('❌ Failed to fetch events:', err);
      failure(err);
      toast({
        title: "Calendar Error",
        description: `Failed to fetch calendar events: ${err.message}`,
        variant: "destructive",
      });
    }
  }, [currentProfile?.userEmail, toast]);

  const createEvent = useCallback(async (selectInfo: any) => {
    // Create a temporary event object for the form
    const tempEvent = {
      id: 'temp-new-event',
      title: '',
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
      extendedProps: {
        selectInfo: selectInfo, // Store selectInfo for later use
        isNew: true
      }
    };

    setSelectedEvent(tempEvent);
    setEditPopoverOpen(true);
  }, []);

  const updateEvent = async (changeInfo: any) => {
    if (!currentProfile?.userEmail) return;

    const event = changeInfo.event;
    const updatedEvent = {
      summary: event.title,
      start: event.allDay 
        ? { date: event.startStr }
        : { dateTime: event.start.toISOString() },
      end: event.allDay 
        ? { date: event.endStr }
        : { dateTime: event.end.toISOString() },
    };

    try {
      await updateCalendarEvent(
        currentProfile.userEmail,
        event.id,
        updatedEvent
      );

      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    } catch (err) {
      console.error('Failed to update event:', err);
      changeInfo.revert();
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const handleEventClick = useCallback((clickInfo: any) => {
    // Prevent default FullCalendar behavior
    clickInfo.jsEvent.preventDefault();
    
    setSelectedEvent(clickInfo.event);
    setEditPopoverOpen(true);
  }, []);

  const handleEventUpdated = useCallback(() => {
    // Refresh the calendar events after an update
    if (ref.current) {
      const calendarApi = ref.current.getApi();
      calendarApi.refetchEvents();
    }
  }, []);

  const handleEventDeleted = useCallback(() => {
    // Remove the event from the calendar and close popover
    if (selectedEvent) {
      selectedEvent.remove();
    }
  }, [selectedEvent]);

  return (
    <div className="h-full">
      {/* Edit Event Popover */}
      {selectedEvent && (
        <EditEventPopover
          event={selectedEvent}
          open={editPopoverOpen}
          onOpenChange={(open) => {
            setEditPopoverOpen(open);
            if (!open) {
              setSelectedEvent(null);
            }
          }}
          onEventUpdated={handleEventUpdated}
          onEventDeleted={handleEventDeleted}
        />
      )}
      
      <div className="modern-calendar rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden h-full">      
        <FullCalendar
          ref={ref as any}
          plugins={plugins}
          initialView="dayGridMonth"
          timeZone="America/New_York"
          headerToolbar={{ 
            left: "prev,next today", 
            center: "title", 
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" 
          }}
          nowIndicator
          selectable
          editable
          dayMaxEvents={3}
          weekends={true}
          eventTimeFormat={{ 
            hour: "numeric", 
            minute: "2-digit", 
            meridiem: "short" 
          }}
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short"
          }}
          events={fetchEvents}
          select={createEvent}
          eventDrop={updateEvent}
          eventResize={updateEvent}
          eventClick={handleEventClick}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.8}
          eventDisplay="block"
          dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '17:00',
          }}
          eventMouseEnter={(_info) => {
            // Optional: show tooltip on hover
          }}
          eventDidMount={(info) => {
            // Modern event styling
            const eventEl = info.el;
            eventEl.style.borderRadius = '8px';
            eventEl.style.border = 'none';
            eventEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            eventEl.style.transition = 'all 0.2s ease';
            
            // Add subtle hover effect
            eventEl.addEventListener('mouseenter', () => {
              eventEl.style.transform = 'translateY(-1px)';
              eventEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            });
            
            eventEl.addEventListener('mouseleave', () => {
              eventEl.style.transform = 'translateY(0)';
              eventEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            });
            
            if (info.event.extendedProps.description) {
              eventEl.title = info.event.extendedProps.description;
            }
          }}
        />
      </div>
    </div>
  );
});

GoogleCalendar.displayName = 'GoogleCalendar';

export default GoogleCalendar;
