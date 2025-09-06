import React, { useState, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PopoverContentInDialog } from "@/components/ui/PopoverInDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCalendarEvent } from '@/services/calendarService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from "@/components/ui/use-toast";

// Form schema with Zod validation
const eventFormSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required.",
  }),
  date: z.date({
    message: "Date is required.",
  }),
  time: z.string().min(1, {
    message: "Time is required.",
  }),
  guests: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

interface AddEventFormProps {
  trigger?: React.ReactNode;
  onEventCreated?: () => void;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ trigger, onEventCreated }) => {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { currentProfile } = useProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      time: "09:00:AM",
      guests: "",
      location: "",
      description: "",
    },
  });

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h: string) => {
    const parts = time12h.split(':');
    if (parts.length !== 3) return "09:00"; // fallback
    
    const [hour, minute, period] = parts;
    let hour24 = parseInt(hour);
    
    if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
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
      // Convert 12-hour format to 24-hour format
      const time24h = convertTo24Hour(values.time);
      
      // Create the date/time in New York timezone
      const [hours, minutes] = time24h.split(':');
      const year = values.date.getFullYear();
      const month = values.date.getMonth() + 1; // getMonth() returns 0-11
      const day = values.date.getDate();
      
      // Calculate end time (1 hour later)
      const startHour = parseInt(hours);
      const endHour = startHour + 1;
      let endDay = day;
      let endMonth = month;
      let endYear = year;
      
      // Handle hour overflow (e.g., 23:30 + 1 hour = 00:30 next day)
      if (endHour >= 24) {
        endDay += 1;
        // Handle month/year overflow if needed
        const daysInMonth = new Date(year, month, 0).getDate();
        if (endDay > daysInMonth) {
          endDay = 1;
          endMonth += 1;
          if (endMonth > 12) {
            endMonth = 1;
            endYear += 1;
          }
        }
      }
      
      // Determine if it's DST (Daylight Saving Time) - EST (-5) or EDT (-4)
      // DST runs from 2nd Sunday in March to 1st Sunday in November
      const isDST = (date: Date) => {
        const year = date.getFullYear();
        const march = new Date(year, 2, 1); // March 1st
        const november = new Date(year, 10, 1); // November 1st
        
        // Find 2nd Sunday of March
        const dstStart = new Date(year, 2, (14 - march.getDay()) % 7 + 8);
        // Find 1st Sunday of November  
        const dstEnd = new Date(year, 10, (7 - november.getDay()) % 7 + 1);
        
        return date >= dstStart && date < dstEnd;
      };
      
      const timezone = isDST(values.date) ? '-04:00' : '-05:00'; // EDT or EST
      
      // Format as proper ISO datetime with timezone
      const nyDateTime = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours}:${minutes}:00${timezone}`;
      const nyEndDateTime = `${endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}T${(endHour % 24).toString().padStart(2, '0')}:${minutes}:00${timezone}`;

      // Create event object for Google Calendar API
      const event = {
        summary: values.title,
        start: {
          dateTime: nyDateTime,
          timeZone: "America/New_York",  // Always use New York timezone
        },
        end: {
          dateTime: nyEndDateTime, // 1 hour duration
          timeZone: "America/New_York",  // Always use New York timezone
        },
        ...(values.location && { location: values.location }),
        ...(values.description && { description: values.description }),
        ...(values.guests && {
          attendees: values.guests.split(',').map((email: string) => ({
            email: email.trim(),
          })),
        }),
      };

      await createCalendarEvent(currentProfile.userEmail, event);

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      // Reset form and close dialog
      form.reset();
      setOpen(false);
      
      // Call the refresh callback if provided
      if (onEventCreated) {
        onEventCreated();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Event</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]" ref={contentRef}>
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                field.value.toLocaleDateString()
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContentInDialog 
                          className="w-auto p-0" 
                          align="start"
                          container={contentRef.current}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDatePickerOpen(false);
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContentInDialog>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Time *</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <Select
                              value={field.value ? field.value.split(':')[0] : ''}
                              onValueChange={(hour) => {
                                const currentTime = field.value || '09:00:AM';
                                const [, minute, period] = currentTime.split(':');
                                const newTime = `${hour}:${minute || '00'}:${period || 'AM'}`;
                                field.onChange(newTime);
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue placeholder="09" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const hour = i === 0 ? 12 : i;
                                  return (
                                    <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                                      {hour.toString().padStart(2, '0')}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={field.value ? field.value.split(':')[1] : ''}
                              onValueChange={(minute) => {
                                const currentTime = field.value || '09:00:AM';
                                const [hour, , period] = currentTime.split(':');
                                const newTime = `${hour || '09'}:${minute}:${period || 'AM'}`;
                                field.onChange(newTime);
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue placeholder="00" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 60 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={field.value ? field.value.split(':')[2] : ''}
                              onValueChange={(period) => {
                                const currentTime = field.value || '09:00:AM';
                                const [hour, minute] = currentTime.split(':');
                                const newTime = `${hour || '09'}:${minute || '00'}:${period}`;
                                field.onChange(newTime);
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue placeholder="AM" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        placeholder="Enter email addresses separated by commas" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Add email addresses of people you want to invite
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Field */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter event description" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Event</Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventForm;
