import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, User, LogOut, AlertCircle, Loader2, Clock, MapPin, Trash2 } from 'lucide-react';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import microsoftGraphService, { CalendarEvent } from '../services/microsoftGraphService';
import { useSecurity } from '../contexts/SecurityContext';

// Utility function to clean HTML content and extract plain text
const cleanHtmlContent = (htmlString: string): string => {
  if (!htmlString) return '';
  
  // Debug: log the raw content to help identify specific artifacts (temporarily disabled)
  // console.log('Raw HTML content:', htmlString);
  
  // Decode HTML entities first to handle encoded content
  const temp = document.createElement('div');
  temp.innerHTML = htmlString;
  let decodedString = temp.innerHTML;
  
  // Remove HTML comments (including email-specific ones like EmailQuote)
  // This regex handles multi-line comments and various comment formats
  decodedString = decodedString.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove CSS style blocks (case insensitive)
  decodedString = decodedString.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script blocks (case insensitive)
  decodedString = decodedString.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove meta tags and other head elements
  decodedString = decodedString.replace(/<meta[^>]*>/gi, '');
  decodedString = decodedString.replace(/<link[^>]*>/gi, '');
  
  // Remove email-specific elements and classes
  decodedString = decodedString.replace(/<div[^>]*class[^>]*EmailQuote[^>]*>[\s\S]*?<\/div>/gi, '');
  decodedString = decodedString.replace(/<div[^>]*id[^>]*EmailQuote[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove Outlook-specific elements
  decodedString = decodedString.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '');
  decodedString = decodedString.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
  
  // Additional cleanup for Exchange/Outlook artifacts
  decodedString = decodedString.replace(/\[cid:[^\]]+\]/gi, ''); // Remove CID references
  decodedString = decodedString.replace(/<img[^>]*>/gi, ''); // Remove image tags
  
  // Create a new temp element to extract text content
  const textExtractor = document.createElement('div');
  textExtractor.innerHTML = decodedString;
  const textContent = textExtractor.textContent || textExtractor.innerText || '';
  
  // Clean up extra whitespace, newlines, and common email artifacts
  const cleaned = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/From:.*?Sent:.*?To:.*?Subject:.*/gi, '')
    .replace(/-----Original Message-----.*$/gi, '')
    .replace(/________________________________.*$/gi, '')
    .replace(/^[\s\n]*$/, '') // Remove strings that are only whitespace
    .trim();
  
  // console.log('Cleaned content:', cleaned);
  return cleaned;
};

// Utility function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  const cleanText = cleanHtmlContent(text);
  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.substring(0, maxLength).trim() + '...';
};

// Event creation/editing modal component using Sheet
interface EventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
  event?: CalendarEvent | null;
  selectedDate?: Date;
}

// Generate time options for the dropdown (12-hour format with 15-minute increments)
const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = [];
  
  for (let hour = 12; hour >= 1; hour--) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24AM = hour === 12 ? 0 : hour;
      const time24PM = hour === 12 ? 12 : hour + 12;
      
      const minuteStr = minute.toString().padStart(2, '0');
      const hourStr = hour.toString();
      
      // AM times
      times.push({
        value: `${time24AM.toString().padStart(2, '0')}:${minuteStr}`,
        label: `${hourStr}:${minuteStr} AM`
      });
      
      // PM times
      times.push({
        value: `${time24PM.toString().padStart(2, '0')}:${minuteStr}`,
        label: `${hourStr}:${minuteStr} PM`
      });
    }
  }
  
  return times.sort((a, b) => a.value.localeCompare(b.value));
};

const EventSheet: React.FC<EventSheetProps> = ({ isOpen, onClose, onSave, onDelete, event, selectedDate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00'); // 24-hour format for internal use
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00'); // 24-hour format for internal use
  const [allDay, setAllDay] = useState(false);
  const [showAs, setShowAs] = useState<'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere'>('busy');

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (event) {
      // Editing existing event
      setTitle(event.title);
      setDescription(cleanHtmlContent(event.extendedProps?.description || ''));
      setLocation(event.extendedProps?.location || '');
      setAllDay(event.allDay || false);
      setShowAs((event.extendedProps?.showAs as any) || 'busy');
      
      // Convert the event times to New York timezone for display/editing
      const startDateTime = new Date(event.start);
      const endDateTime = new Date(event.end || event.start);
      
      // Convert to NY timezone for the form inputs
      const startDateNY = startDateTime.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const endDateNY = endDateTime.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      
      setStartDate(startDateNY);
      setEndDate(endDateNY);
      
      // Get 24-hour format times in NY timezone
      const startTimeNY = startDateTime.toLocaleTimeString('en-GB', { 
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const endTimeNY = endDateTime.toLocaleTimeString('en-GB', { 
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      setStartTime(startTimeNY);
      setEndTime(endTimeNY);
      
      console.log('Loading event for editing:', {
        originalStart: event.start,
        originalEnd: event.end,
        nyStartDate: startDateNY,
        nyEndDate: endDateNY,
        nyStartTime: startTimeNY,
        nyEndTime: endTimeNY
      });
    } else if (selectedDate) {
      // Creating new event - use the selected date as-is (don't convert timezone)
      // The user clicked on a specific calendar date, so use that date directly
      const dateStr = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const defaultStartTime = '13:00'; // 1:00 PM
      const defaultEndTime = '14:00';   // 2:00 PM
      
      setTitle('');
      setDescription('');
      setLocation('');
      setAllDay(false);
      setShowAs('busy');
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      
      console.log('Creating new event for date:', {
        selectedDate: selectedDate.toISOString(),
        dateStr,
        defaultStartTime,
        defaultEndTime
      });
    }
  }, [event, selectedDate]);

  const handleSave = () => {
    if (!title.trim()) return;

    let start: Date;
    let end: Date;
    
    if (allDay) {
      // For all-day events, use the date without time conversion
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    } else {
      // For timed events, create dates that represent the NY time the user selected
      // Get the timezone offset for New York on the target date
      const targetDate = new Date(`${startDate}T12:00:00`); // Use noon to avoid timezone edge cases
      
      // Use shortOffset to get the exact offset string (e.g., "GMT-4", "GMT-5")
      const offsetFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'America/New_York',
        timeZoneName: 'shortOffset'
      });
      
      const offsetPart = offsetFormatter.formatToParts(targetDate).find(part => part.type === 'timeZoneName')?.value;
      
      // Convert "GMT-4" to "-04:00" format
      let offset = '-05:00'; // Default to EST
      if (offsetPart) {
        const match = offsetPart.match(/GMT([+-])(\d+)/);
        if (match) {
          const sign = match[1];
          const hours = match[2].padStart(2, '0');
          offset = `${sign}${hours}:00`;
        }
      }
      
      console.log('Timezone detection:', {
        targetDate: targetDate.toISOString(),
        offsetPart,
        offset
      });
      
      const startTzString = `${startDate}T${startTime}:00${offset}`;
      const endTzString = `${endDate}T${endTime}:00${offset}`;
      
      start = new Date(startTzString);
      end = new Date(endTzString);
    }

    console.log('Saving event with times:', {
      startInput: `${startDate}T${startTime}`,
      endInput: `${endDate}T${endTime}`,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      startNY: start.toLocaleString("en-US", {timeZone: "America/New_York"}),
      endNY: end.toLocaleString("en-US", {timeZone: "America/New_York"})
    });

    const eventData: Partial<CalendarEvent> = {
      title: title.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      extendedProps: {
        description,
        location,
        showAs,
      },
    };

    if (event) {
      eventData.id = event.id;
    }

    onSave(eventData);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{event ? 'Edit Event' : 'New Event'}</SheetTitle>
          <SheetDescription>
            {event ? 'Update your calendar event details.' : 'Create a new calendar event.'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked as boolean)}
            />
            <Label htmlFor="allDay">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="showAs">Show as</Label>
            <Select value={showAs} onValueChange={(value) => setShowAs(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="oof">Out of Office</SelectItem>
                <SelectItem value="workingElsewhere">Working Elsewhere</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={!title.trim()} className="flex-1">
            {event ? 'Update' : 'Create'}
          </Button>
          {event && onDelete && (
            <Button onClick={onDelete} variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
function Calendar() {
  const { isDataLoadingAllowed } = useSecurity();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status and load data when allowed
  useEffect(() => {
    if (!isDataLoadingAllowed) {
      setLoading(false);
      setError('Please log in first to access calendar features');
      return;
    }

    const checkAuthAndLoadData = async () => {
      try {
        setLoading(true);
        
        // Check if we just completed authentication (to prevent double-processing)
        const authJustCompleted = sessionStorage.getItem('msalAuthComplete');
        if (authJustCompleted) {
          console.log('Authentication just completed, clearing flag and proceeding...');
          sessionStorage.removeItem('msalAuthComplete');
        }
        
        // Check if user is already authenticated through MSAL
        const authenticated = await microsoftGraphService.isSignedIn();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          console.log('User is already authenticated, loading data...');
          await loadUserProfile();
          await loadCalendarEvents();
        } else {
          console.log('User not authenticated - manual sign-in required');
          
          // Only try automatic login if we haven't just completed authentication
          if (!authJustCompleted) {
            console.log('Attempting automatic Microsoft login...');
            const autoLoginSuccess = await microsoftGraphService.tryAutoLogin();
            
            if (autoLoginSuccess) {
              console.log('Automatic login successful');
              setIsAuthenticated(true);
              await loadUserProfile();
              await loadCalendarEvents();
            }
          }
        }
      } catch (error) {
        console.error('Error during authentication or data loading:', error);
        setError('Failed to access calendar service');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [isDataLoadingAllowed]);

  const loadUserProfile = async () => {
    if (!isDataLoadingAllowed) {
      console.log('loadUserProfile: Blocked by security policy');
      return;
    }
    
    try {
      const profile = await microsoftGraphService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCalendarEvents = async () => {
    if (!isDataLoadingAllowed) {
      console.log('loadCalendarEvents: Blocked by security policy');
      return;
    }
    
    try {
      setLoading(true);
      // Load events for the next 3 months
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const calendarEvents = await microsoftGraphService.getCalendarEvents(startDate, endDate);
      setEvents(calendarEvents);
      setError(null);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!isDataLoadingAllowed) {
      setError('Please complete the main login process first');
      return;
    }
    
    // Prevent multiple simultaneous login attempts
    if (loading) {
      console.log('Login already in progress, ignoring duplicate request');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Clear any previous auth completion flags
      sessionStorage.removeItem('msalAuthComplete');

      console.log('Starting Microsoft authentication...');
      
      // Use popup authentication
      await microsoftGraphService.loginPopup();
      console.log('Popup authentication successful');
      
      // Debug: Show user account info for security configuration
      const accountInfo = microsoftGraphService.getCurrentAccountInfo();
      console.log('User account info for security config:', accountInfo);
      
      // After successful popup auth, get user profile and calendar data
      toast({
        variant: "success",
        title: "Successfully signed in",
        description: `Welcome ${accountInfo?.name || accountInfo?.email || 'User'}!`
      });
      setIsAuthenticated(true);
      await loadUserProfile();
      await loadCalendarEvents();
      
    } catch (error) {
      console.error('Login failed:', error);
      setError(`Login failed: ${(error as any)?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await microsoftGraphService.logout();
      setIsAuthenticated(false);
      setUserProfile(null);
      setEvents([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Don't automatically open the sheet - just show the events for this date
    setSelectedEvent(null);
  };

  const handleCreateEventForDate = () => {
    if (selectedDate) {
      setSelectedEvent(null);
      setIsSheetOpen(true);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setIsSheetOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (selectedEvent) {
        // Update existing event
        const graphEvent = microsoftGraphService.convertCalendarEventToGraphEvent(
          { ...selectedEvent, ...eventData },
          true
        );
        const updatedEvent = await microsoftGraphService.updateCalendarEvent(selectedEvent.id, graphEvent);
        setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e));
      } else {
        // Create new event
        const graphEvent = microsoftGraphService.convertCalendarEventToGraphEvent(eventData as CalendarEvent);
        const newEvent = await microsoftGraphService.createCalendarEvent(graphEvent);
        setEvents([...events, newEvent]);
      }
      setError(null);
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await microsoftGraphService.deleteCalendarEvent(selectedEvent.id);
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      setIsSheetOpen(false);
      setSelectedEvent(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      
      // Convert both dates to New York timezone for comparison
      const selectedDateNY = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const eventDateNY = eventDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      
      console.log(`Comparing dates (NY timezone): selected=${selectedDateNY} (from ${date.toDateString()}), event=${eventDateNY} (from ${eventDate.toISOString()})`);
      return eventDateNY === selectedDateNY;
    });
  };

  // Get the status color for an event
  const getEventStatusColor = (showAs: string) => {
    const colors = {
      free: 'bg-green-100 text-green-800 border-green-200',
      tentative: 'bg-orange-100 text-orange-800 border-orange-200',
      busy: 'bg-red-100 text-red-800 border-red-200',
      oof: 'bg-purple-100 text-purple-800 border-purple-200',
      workingElsewhere: 'bg-blue-100 text-blue-800 border-blue-200',
      unknown: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[showAs as keyof typeof colors] || colors.unknown;
  };

  // Format time for display (New York timezone, 12-hour format)
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    console.log(`Formatting time: ${dateString} -> ${formatted} (NY time)`);
    return formatted;
  };

  if (loading && !isAuthenticated) {
    return (
      <div className="fade-in h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Initializing calendar...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fade-in h-full flex flex-col">
        <div className="flex items-center mb-6">
          <div className="mr-3 p-2 bg-purple-100 rounded-full">
            <CalendarIcon className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Calendar</h1>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Connect Your Microsoft Calendar
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in with your Microsoft account to view, create, and manage your Outlook calendar events directly from this app.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <User className="w-4 h-4 mr-2" />
              )}
              Sign in with Microsoft
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="mr-3 p-2 bg-purple-100 rounded-full">
            <CalendarIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Calendar</h1>
            {userProfile && (
              <p className="text-sm text-gray-600">
                Connected as {userProfile.displayName} ({userProfile.mail || userProfile.userPrincipalName})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="inline-flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            onClick={() => setError(null)}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700"
          >
            ×
          </Button>
        </div>
      )}

      {/* Calendar Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Component */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Calendar</CardTitle>
                <Button
                  onClick={() => setSelectedDate(new Date())}
                  variant="outline"
                  size="sm"
                >
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading calendar events...</p>
                  </div>
                </div>
              ) : (
                <ShadcnCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  className="rounded-lg border shadow-sm"
                  modifiers={{
                    hasEvents: (date) => getEventsForDate(date).length > 0,
                    today: (() => {
                      // Get today's date in New York timezone
                      const nowNY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
                      return new Date(nowNY);
                    })()
                  }}
                  modifiersStyles={{
                    hasEvents: {
                      backgroundColor: '#dbeafe',
                      fontWeight: 'bold',
                      color: '#1e40af'
                    },
                    today: {
                      backgroundColor: '#a1a1a1',
                      fontWeight: 'bold'
                    }
                  }}
                  modifiersClassNames={{
                    hasEvents: 'relative after:absolute after:bottom-1 after:right-1 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full',
                    selected: 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          <Card className={selectedDate ? "" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Select a date'}
                  </CardTitle>
                  <CardDescription>
                    <div className="space-y-1">
                      <div>
                        {selectedDate && getEventsForDate(selectedDate).length === 0 
                          ? 'No events scheduled'
                          : `${selectedDate ? getEventsForDate(selectedDate).length : 0} event(s)`
                        }
                      </div>
                      {selectedDate && <div className="text-xs">Times in Eastern Time</div>}
                    </div>
                  </CardDescription>
                </div>
                {selectedDate && (
                  <Button 
                    size="sm"
                    onClick={handleCreateEventForDate}
                    className="shrink-0"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Event
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {!selectedDate ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click on a date to view events</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">{/* Added max height and scroll for many events */}
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors hover:shadow-sm overflow-hidden"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 truncate">{event.title}</h4>
                          {!event.allDay && (
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(event.start)} - {formatTime(event.end || event.start)} ET
                            </div>
                          )}
                          {event.allDay && (
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              All day
                            </div>
                          )}
                          {event.extendedProps?.location && (
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3 mr-1 shrink-0" />
                              <span className="truncate">{event.extendedProps.location}</span>
                            </div>
                          )}
                          {event.extendedProps?.description && cleanHtmlContent(event.extendedProps.description).trim() && (
                            <p className="text-xs text-gray-500 mt-1 break-words overflow-hidden max-h-8 leading-4">
                              {truncateText(event.extendedProps.description, 80)}
                            </p>
                          )}
                        </div>
                        <Badge 
                          className={`text-xs ${getEventStatusColor(event.extendedProps?.showAs || 'unknown')} shrink-0 ml-2`}
                          variant="outline"
                        >
                          {event.extendedProps?.showAs || 'unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {getEventsForDate(selectedDate).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm mb-3">No events on this date</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCreateEventForDate}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create First Event
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedDate ? (
                <>
                  <Button 
                    variant="default" 
                    className="w-full justify-start"
                    onClick={handleCreateEventForDate}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event for {selectedDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedEvent(null);
                      setSelectedDate(new Date());
                      setIsSheetOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event Today
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedDate(new Date());
                    setIsSheetOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Event
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={loadCalendarEvents}
                disabled={loading}
              >
                <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Calendar
              </Button>
              {selectedDate && selectedDate.toDateString() !== new Date().toDateString() && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Go to Today
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Sheet */}
      <EventSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedEvent(null);
          setSelectedDate(undefined);
        }}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        event={selectedEvent}
        selectedDate={selectedDate}
      />
    </div>
  );
}

export default Calendar;