import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from '@/contexts/ProfileContext';
import { updateCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/services/calendarService';

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date({
    message: "Date is required",
  }),
  time: z.string().min(1, "Time is required"),
  period: z.enum(["AM", "PM"]),
  guests: z.string().optional(),
});

interface EditEventPopoverProps {
  event: any; // FullCalendar event object
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

const EditEventPopover: React.FC<EditEventPopoverProps> = ({ 
  event, 
  open,
  onOpenChange,
  onEventUpdated, 
  onEventDeleted 
}) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { toast } = useToast();
  const { currentProfile } = useProfile();

  // Parse existing event data
  console.log('🔍 Debug event data:', {
    eventStart: event?.start,
    eventStartType: typeof event?.start,
    eventStartString: event?.start?.toString(),
    eventTitle: event?.title,
    eventId: event?.id,
    allProperties: Object.keys(event || {}),
    rawEvent: event
  });
  
  // Check if this is a new event (created by clicking empty space)
  const isNewEvent = event?.extendedProps?.isNew === true;
  
  if (isNewEvent) {
    console.log('🆕 This is a new event');
  } else {
    console.log('✏️ This is an existing event');
  }
  
  // Get the event start time - use FullCalendar's display time directly
  let correctHour = 10; // Default fallback
  let correctMinute = 0;
  let eventStartDate: Date;
  
  if (event?.start) {
    eventStartDate = event.start instanceof Date ? event.start : new Date(event.start);
    
    // Since FullCalendar displays the time correctly (10am), the issue is in our parsing
    // Let's check the raw event data from Google Calendar
    const rawEvent = event?.extendedProps?.raw;
    if (rawEvent?.start?.dateTime) {
      console.log('📅 Raw Google Calendar event start:', rawEvent.start.dateTime);
      
      // Parse the dateTime string which should be in format like "2025-09-07T10:00:00-04:00"
      const dateTimeMatch = rawEvent.start.dateTime.match(/T(\d{2}):(\d{2})/);
      if (dateTimeMatch) {
        correctHour = parseInt(dateTimeMatch[1]);
        correctMinute = parseInt(dateTimeMatch[2]);
        console.log('✅ Extracted time from raw event:', correctHour, ':', correctMinute);
      }
    } else {
      // If no raw event, use the date object but adjust for timezone display
      // FullCalendar shows the correct time, so let's trust its internal handling
      // The event.start might already be adjusted for display timezone
      correctHour = eventStartDate.getHours();
      correctMinute = eventStartDate.getMinutes();
      console.log('⏰ Using Date object time:', correctHour, ':', correctMinute);
    }
  } else {
    eventStartDate = new Date();
  }
  
  const existingGuests = event?.extendedProps?.attendees?.map((att: any) => att.email).join(', ') || '';
  
  // Convert to 12-hour format using the correct NY time
  const hours24 = correctHour;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const timeString = `${hours12.toString().padStart(2, '0')}:${correctMinute.toString().padStart(2, '0')}`;
  
  console.log('🕐 Final time conversion:', {
    correctHour,
    correctMinute,
    hours12,
    period,
    timeString
  });

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      date: eventStartDate,
      time: timeString,
      period: period as "AM" | "PM",
      guests: existingGuests,
    },
  });

  const convertTo24Hour = (time: string, period: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    let hours24 = hours;
    
    if (period === 'PM' && hours !== 12) {
      hours24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hours24 = 0;
    }
    
    return { hours: hours24, minutes };
  };

  async function onSubmit(values: z.infer<typeof eventFormSchema>) {
    if (!currentProfile?.userEmail) {
      toast({
        title: "Error",
        description: "No user profile found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { hours, minutes } = convertTo24Hour(values.time, values.period);
      
      // Create New York timezone datetime
      const nyDateTime = new Date(values.date);
      nyDateTime.setHours(hours, minutes, 0, 0);
      
      // Create end time (1 hour later)
      const nyEndDateTime = new Date(nyDateTime);
      nyEndDateTime.setHours(nyEndDateTime.getHours() + 1);

      // Format for Google Calendar API with New York timezone
      const formatNYDateTime = (date: Date) => {
        const isDST = (date: Date) => {
          const year = date.getFullYear();
          const marchSecondSunday = new Date(year, 2, (14 - new Date(year, 2, 1).getDay()) % 7 + 1);
          const novemberFirstSunday = new Date(year, 10, (7 - new Date(year, 10, 1).getDay()) % 7 + 1);
          return date >= marchSecondSunday && date < novemberFirstSunday;
        };

        const timezone = isDST(date) ? '-04:00' : '-05:00';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00${timezone}`;
      };

      const updatedEvent = {
        summary: values.title,
        start: {
          dateTime: formatNYDateTime(nyDateTime),
          timeZone: "America/New_York",
        },
        end: {
          dateTime: formatNYDateTime(nyEndDateTime),
          timeZone: "America/New_York",
        },
        ...(values.guests && {
          attendees: values.guests.split(',').map((email: string) => ({
            email: email.trim(),
          })),
        }),
      };

      // Check if this is a new event or editing existing
      const isNewEvent = event.extendedProps?.isNew;

      if (isNewEvent) {
        // Create new event
        await createCalendarEvent(currentProfile.userEmail, updatedEvent);
        
        toast({
          title: "Success",
          description: "Event created successfully",
        });

        // Unselect the calendar selection
        const selectInfo = event.extendedProps?.selectInfo;
        if (selectInfo) {
          selectInfo.view.calendar.unselect();
        }
        
      } else {
        // Update existing event
        await updateCalendarEvent(currentProfile.userEmail, event.id, updatedEvent);

        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      }

      onOpenChange(false);
      onEventUpdated?.();

    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    }
  }

  const handleDelete = async () => {
    if (!currentProfile?.userEmail) return;

    if (confirm(`Are you sure you want to delete the event '${event.title}'?`)) {
      try {
        await deleteCalendarEvent(currentProfile.userEmail, event.id);

        toast({
          title: "Success",
          description: "Event deleted successfully",
        });

        onOpenChange(false);
        onEventDeleted?.();

      } catch (error: any) {
        console.error('Failed to delete event:', error);
        toast({
          title: "Error",
          description: "Failed to delete event",
          variant: "destructive",
        });
      }
    }
  };

  const timeOptions: string[] = [];
  for (let hour = 1; hour <= 12; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }

  const handleClose = () => {
    // If it's a new event, unselect the calendar selection
    if (isNewEvent) {
      const selectInfo = event?.extendedProps?.selectInfo;
      if (selectInfo) {
        selectInfo.view.calendar.unselect();
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {isNewEvent ? 'Create New Event' : 'Edit Event'}
            {!isNewEvent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time Fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal"
                            >
                              {field.value ? field.value.toLocaleDateString() : "Select date"}
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[60]" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDatePickerOpen(false);
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Fields */}
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-48">
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="period"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Guests Field */}
              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guests (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email1@example.com, email2@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {isNewEvent ? 'Create Event' : 'Update Event'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventPopover;
