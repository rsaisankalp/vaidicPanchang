"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LocationBanner } from "./LocationBanner";
import { PanchangCalendar } from "./PanchangCalendar";
import { PanchangDetailsModal } from "./PanchangDetailsModal";
import { ReminderSystemSheet } from "./ReminderSystemSheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { UserLocation, ProcessedPanchangDay, DailyPanchangDetail, ParsedJsonData } from "@/types/panchang";
import { getLocationDetails, getMonthlyPanchang, getDailyPanchangDetails } from "@/lib/actions";
import { Loader2, AlertTriangle, CalendarPlus, BellIcon as BellIconLucide } from "lucide-react";
import { addMonths, subMonths, startOfMonth, isSameMonth } from "date-fns";

const BellIcon = (props: React.SVGProps<SVGSVGElement>) => ( // Custom bell icon as per previous modal
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);


export default function VaidikVistaClient() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(startOfMonth(new Date()));
  const [monthlyPanchang, setMonthlyPanchang] = useState<ProcessedPanchangDay[]>([]);
  const [panchangLoading, setPanchangLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dailyDetails, setDailyDetails] = useState<(DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false);
  const { toast } = useToast();

  const fetchAndSetLocation = useCallback(async (coords?: GeolocationCoordinates) => {
    setLocationLoading(true);
    try {
      let lat, lon;
      if (coords) {
        lat = coords.latitude;
        lon = coords.longitude;
      } else {
        // Fallback or default location if needed, e.g. Bengaluru
        lat = 12.9716; 
        lon = 77.5946; 
        toast({ title: "Using Default Location", description: "Could not get your current location. Using Bengaluru as default.", variant: "default" });
      }
      
      const locDetails = await getLocationDetails(lat, lon);
      if (locDetails) {
        setLocation(locDetails);
      } else {
        toast({ title: "Location Error", description: "Failed to fetch location details. Using default.", variant: "destructive" });
        // Set a default location if API fails but coords were obtained
        if(coords) {
            setLocation({ latitude: coords.latitude, longitude: coords.longitude, city: "Unknown", state: "Unknown", country: "Unknown", timezoneOffset: "5.5" });
        } else {
             setLocation({ latitude: 12.9716, longitude: 77.5946, city: "Bengaluru", state: "Karnataka", country: "India", timezoneOffset: "5.5" });
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
      toast({ title: "Location Error", description: "Could not retrieve location information. Using default.", variant: "destructive" });
      setLocation({ latitude: 12.9716, longitude: 77.5946, city: "Bengaluru", state: "Karnataka", country: "India", timezoneOffset: "5.5" });
    } finally {
      setLocationLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchAndSetLocation(position.coords),
        (error) => {
          console.warn(`Geolocation error: ${error.message}`);
          toast({ title: "Geolocation Denied", description: "Location access was denied or unavailable. Using default location.", variant: "default" });
          fetchAndSetLocation(); // Fetch with default if geolocation fails
        }
      );
    } else {
      toast({ title: "Geolocation Not Supported", description: "Your browser does not support geolocation. Using default location.", variant: "default" });
      fetchAndSetLocation(); // Fetch with default if geolocation not supported
    }
  }, [fetchAndSetLocation, toast]);


  const fetchMonthlyData = useCallback(async (month: Date, loc: UserLocation) => {
    setPanchangLoading(true);
    try {
      const data = await getMonthlyPanchang(month, loc);
      setMonthlyPanchang(data);
    } catch (error) {
      console.error("Error fetching monthly panchang:", error);
      toast({ title: "Panchang Error", description: "Failed to load monthly panchang data.", variant: "destructive" });
    } finally {
      setPanchangLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (location && !locationLoading) {
      fetchMonthlyData(currentDisplayMonth, location);
    }
  }, [location, locationLoading, currentDisplayMonth, fetchMonthlyData]);

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    if (!location) {
      toast({ title: "Location Missing", description: "Cannot fetch details without location.", variant: "destructive" });
      return;
    }
    setDetailsLoading(true);
    setIsDetailsModalOpen(true);
    try {
      const details = await getDailyPanchangDetails(date, location);
      setDailyDetails(details);
    } catch (error) {
      console.error("Error fetching daily details:", error);
      toast({ title: "Details Error", description: "Failed to load panchang details for the selected date.", variant: "destructive" });
      setDailyDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleMonthChange = (newMonthDate: Date) => {
    if (!isSameMonth(newMonthDate, currentDisplayMonth)) {
        setCurrentDisplayMonth(startOfMonth(newMonthDate));
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 min-h-screen flex flex-col">
      <header className="text-center py-6">
        <h1 className="text-5xl font-headline font-bold text-primary tracking-tight">
          Vaidik Vista
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your daily guide to auspicious timings and vedic insights.
        </p>
      </header>

      <LocationBanner location={location} loading={locationLoading} />
      
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsReminderSheetOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md">
          <BellIconLucide className="w-5 h-5 mr-2" /> Set Reminder
        </Button>
      </div>

      {panchangLoading && locationLoading ? (
        <div className="flex flex-col items-center justify-center flex-grow py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading Vaidik Vista...</p>
        </div>
      ) : !location ? (
         <div className="flex flex-col items-center justify-center flex-grow py-10 bg-card p-6 rounded-lg shadow-lg">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive text-lg font-semibold">Location information is unavailable.</p>
          <p className="text-muted-foreground text-center">Please enable location services or check your connection. <br/>Panchang cannot be displayed without location.</p>
        </div>
      ) : (
        <main className="flex-grow">
          <PanchangCalendar
            location={location}
            monthlyPanchangData={monthlyPanchang}
            onDateSelect={handleDateSelect}
            currentDisplayMonth={currentDisplayMonth}
            setCurrentDisplayMonth={handleMonthChange}
            selectedDate={selectedDate}
            isLoading={panchangLoading}
          />
        </main>
      )}

      <PanchangDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        details={dailyDetails}
        isLoading={detailsLoading}
        onOpenReminderSheet={() => {
          setIsDetailsModalOpen(false); // Close details modal
          setIsReminderSheetOpen(true); // Open reminder sheet
        }}
      />
      
      <ReminderSystemSheet
        isOpen={isReminderSheetOpen}
        onClose={() => setIsReminderSheetOpen(false)}
        currentDate={selectedDate || new Date()} // Pass selected date or current date to reminder
      />

      <footer className="text-center py-8 mt-auto border-t border-border">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaidik Vista. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Panchang data provided for informational purposes. Consult with a qualified priest for important occasions.
        </p>
      </footer>
    </div>
  );
}
