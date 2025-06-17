
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { EventTypeListItem, EventDetailsAPIResponse, ReminderCategory } from "@/types/panchang";
import React, { useEffect, useState } from "react";
import { getEventTypes, getEventDetails, saveReminderToSheet } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CalendarClock, CheckCircle, ListFilter, Tag, User, Phone } from "lucide-react";

const reminderFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }),
  category: z.enum(["tithi", "occasion", "festival"], {
    required_error: "You need to select a reminder category.",
  }),
  eventId: z.number().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must consent to notifications.",
  }),
});

type ReminderFormValues = z.infer<typeof reminderFormSchema>;

interface ReminderFormProps {
  currentDate: Date; 
}

export function ReminderForm({ currentDate }: ReminderFormProps) {
  const { toast } = useToast();
  const [eventTypeList, setEventTypeList] = useState<EventTypeListItem[]>([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventDetailsAPIResponse | null>(null);
  const [isLoadingEventTypes, setIsLoadingEventTypes] = useState(false);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      category: undefined,
      consent: false,
    },
  });

  const selectedCategory = form.watch("category");

  useEffect(() => {
    async function fetchEventTypesList() {
      if (selectedCategory) {
        setIsLoadingEventTypes(true);
        setSelectedEventDetails(null); 
        form.setValue("eventId", undefined); 
        try {
          const types = await getEventTypes(currentDate); 
          const modeIdMapping: Record<ReminderCategory, number> = {
            tithi: 2,
            occasion: 0,
            festival: 3,
          };
          const filteredTypes = types.filter(type => type.mode_id === modeIdMapping[selectedCategory]);
          setEventTypeList(filteredTypes);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load event types.", variant: "destructive" });
        } finally {
          setIsLoadingEventTypes(false);
        }
      } else {
        setEventTypeList([]);
      }
    }
    fetchEventTypesList();
  }, [selectedCategory, currentDate, toast, form]);

  const handleEventIdChange = async (eventIdStr: string) => {
    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) return;

    form.setValue("eventId", eventId);
    setIsLoadingEventDetails(true);
    setSelectedEventDetails(null);
    try {
      const details = await getEventDetails(eventId, currentDate);
      setSelectedEventDetails(details);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load event details.", variant: "destructive" });
    } finally {
      setIsLoadingEventDetails(false);
    }
  };

  async function onSubmit(data: ReminderFormValues) {
    setIsSubmitting(true);
    const selectedEventName = eventTypeList.find(e => e.default_event_id === data.eventId)?.event_name;
    
    const reminderData = {
      ...data,
      eventName: selectedEventName,
      nextDate: selectedEventDetails?.next_date,
      hinduMonth: selectedEventDetails?.hindu_month,
      tithiName: selectedEventDetails?.tithi_name,
      paksha: selectedEventDetails?.paksha,
      frequency: selectedEventDetails?.frequency,
    };

    try {
      const result = await saveReminderToSheet(reminderData);
      if (result.success) {
        toast({
          title: "Reminder Saved",
          description: result.message,
          action: <CheckCircle className="text-green-500" />,
        });
        form.reset();
        setSelectedEventDetails(null);
        setEventTypeList([]);
      } else {
        toast({
          title: "Save Failed",
          description: result.message,
          variant: "destructive",
          action: <AlertCircle className="text-red-500" />,
        });
      }
    } catch (error) {
       toast({
          title: "Error",
          description: "An unexpected error occurred while saving the reminder.",
          variant: "destructive",
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full shadow-lg border-border bg-card">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl font-headline text-primary flex items-center">
          <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
          Create Reminder
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Set up notifications for important Tithis, Occasions, or Festivals.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs sm:text-sm"><User className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" />Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} className="bg-input focus:ring-primary text-xs sm:text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs sm:text-sm"><Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" />Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Enter 10-digit phone number" {...field} className="bg-input focus:ring-primary text-xs sm:text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-2 sm:space-y-3">
                  <FormLabel className="flex items-center text-xs sm:text-sm"><ListFilter className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" />Choose Reminder Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 sm:space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="tithi" />
                        </FormControl>
                        <FormLabel className="font-normal text-xs sm:text-sm">By Panchang Tithi</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 sm:space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="occasion" />
                        </FormControl>
                        <FormLabel className="font-normal text-xs sm:text-sm">By Occasion</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 sm:space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="festival" />
                        </FormControl>
                        <FormLabel className="font-normal text-xs sm:text-sm">By Festival</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {selectedCategory && (
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-xs sm:text-sm"><Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" />Event Type</FormLabel>
                    <Select onValueChange={handleEventIdChange} defaultValue={field.value?.toString()} disabled={isLoadingEventTypes}>
                      <FormControl>
                        <SelectTrigger className="bg-input focus:ring-primary text-xs sm:text-sm">
                          <SelectValue placeholder={isLoadingEventTypes ? "Loading types..." : "Select an event"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeList.map((event) => (
                          <SelectItem 
                            key={`${event.mode_id}-${event.default_event_id}-${event.event_name}`} 
                            value={event.default_event_id.toString()} 
                            className="text-xs sm:text-sm"
                          >
                            {event.event_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            {isLoadingEventDetails && <p className="text-xs sm:text-sm text-muted-foreground text-center">Loading event details...</p>}
            
            {selectedEventDetails && (
              <Card className="p-3 sm:p-4 bg-muted/50 border-border">
                <CardHeader className="p-0 pb-1 sm:pb-2">
                  <CardTitle className="text-sm sm:text-md font-headline text-primary">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-0.5 sm:space-y-1 p-0">
                  <p><strong>Next Date:</strong> {selectedEventDetails.next_date} ({selectedEventDetails.day_name})</p>
                  <p><strong>Hindu Month:</strong> {selectedEventDetails.hindu_month}</p>
                  <p><strong>Tithi:</strong> {selectedEventDetails.tithi_name}</p>
                  <p><strong>Paksha:</strong> {selectedEventDetails.paksha}</p>
                  <p><strong>Frequency:</strong> {selectedEventDetails.frequency}</p>
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 sm:space-x-3 space-y-0 rounded-md border p-3 sm:p-4 shadow-sm bg-muted/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs sm:text-sm">
                      I give my consent to notify me through any communication medium.
                    </FormLabel>
                    <FormDescription className="text-xs">
                      You will receive reminders based on your selection.
                    </FormDescription>
                     <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="p-4 sm:p-6">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm" disabled={isSubmitting || isLoadingEventDetails || isLoadingEventTypes}>
              {isSubmitting ? (
                <><div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:h-4 border-b-2 border-primary-foreground mr-2"></div> Saving...</>
              ) : "Save Reminder"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
