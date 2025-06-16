
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
import { startOfMonth, isSameMonth, parseISO } from "date-fns";

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
    console.log("[Client] fetchAndSetLocation called. Coords:", coords);
    setLocationLoading(true);
    let resolvedLat: number;
    let resolvedLon: number;

    try {
      if (coords) {
        resolvedLat = coords.latitude;
        resolvedLon = coords.longitude;
        console.log(`[Client] Using provided coords: lat=${resolvedLat}, lon=${resolvedLon}`);
      } else {
        resolvedLat = 12.9716; // Bengaluru
        resolvedLon = 77.5946;
        console.log(`[Client] Using default coords (Bengaluru): lat=${resolvedLat}, lon=${resolvedLon}`);
      }

      console.log(`[Client] Attempting to call getLocationDetails with lat: ${resolvedLat}, lon: ${resolvedLon}`);
      const locDetails = await getLocationDetails(resolvedLat, resolvedLon);
      console.log("[Client] getLocationDetails returned:", locDetails);

      if (locDetails) {
        setLocation(locDetails);
        console.log("[Client] Location set successfully:", locDetails);
      } else {
        console.warn("[Client] getLocationDetails returned null. Setting default location object.");
        toast({ title: "Location API Error", description: "Failed to fetch location details from API. Using default.", variant: "destructive" });
        setLocation({
          latitude: resolvedLat,
          longitude: resolvedLon,
          city: "Bengaluru (Default)",
          state: "Karnataka (Default)",
          country: "India (Default)",
          timezoneOffset: "5.5",
        });
      }
    } catch (error) {
      console.error("[Client] Error in fetchAndSetLocation's try-catch block:", error);
      toast({ title: "Critical Location Error", description: "An unexpected error occurred while retrieving location. Using default.", variant: "destructive" });
      setLocation({ 
        latitude: 12.9716,
        longitude: 77.5946,
        city: "Bengaluru (Catch)",
        state: "Karnataka (Catch)",
        country: "India (Catch)",
        timezoneOffset: "5.5",
      });
    } finally {
      setLocationLoading(false);
      console.log("[Client] fetchAndSetLocation finished.");
    }
  }, [toast]);

  useEffect(() => {
    console.log("[Client] Initial useEffect for geolocation triggered.");
    if (navigator.geolocation) {
      console.log("[Client] Geolocation API is available.");
      navigator.geolocation.getCurrentPosition(
        (position) => { 
          console.log("[Client] Geolocation success:", position.coords);
          fetchAndSetLocation(position.coords);
        },
        (error) => { 
          console.warn(`[Client] Geolocation API error: ${error.message} (Code: ${error.code})`);
          let description = `Could not get your current location (${error.message}). Using default.`;
          if (error.code === 1) description = "Location permission denied. Using default location.";
          else if (error.code === 2) description = "Location unavailable. Using default location.";
          else if (error.code === 3) description = "Location request timed out. Using default location.";
          
          toast({ title: "Geolocation Error", description, variant: "default" });
          fetchAndSetLocation(); 
        }
      );
    } else {
      console.warn("[Client] Geolocation not supported by browser.");
      toast({ title: "Geolocation Not Supported", description: "Your browser does not support geolocation. Using default location.", variant: "default" });
      fetchAndSetLocation(); 
    }
  }, [fetchAndSetLocation, toast]);


  const fetchMonthlyData = useCallback(async (monthISO: string, loc: UserLocation) => {
    console.log("[Client] fetchMonthlyData triggered for monthISO:", monthISO, "and location:", loc);
    if (!loc || !loc.timezoneOffset) {
      console.warn("[Client] fetchMonthlyData: Location or timezoneOffset missing. Aborting monthly fetch.", loc);
      toast({ title: "Panchang Error", description: "Location details are incomplete. Cannot fetch monthly panchang.", variant: "destructive" });
      setPanchangLoading(false);
      return;
    }
    setPanchangLoading(true);
    try {
      console.log("[Client] fetchMonthlyData: Calling getMonthlyPanchang with monthISO:", monthISO, "location:", loc);
      const data = await getMonthlyPanchang(monthISO, loc);
      console.log("[Client] fetchMonthlyData: Received data from getMonthlyPanchang:", data && data.length > 0 ? `${data.length} entries` : "Empty or null data", data ? data.slice(0,2) : null);
      setMonthlyPanchang(data);
      console.log("[Client] fetchMonthlyData: monthlyPanchang state updated. Count:", data.length, "Current state:", monthlyPanchang.slice(0,2));
    } catch (error) {
      console.error("[Client] Error fetching monthly panchang in fetchMonthlyData:", error);
      toast({ title: "Panchang Error", description: "Failed to load monthly panchang data.", variant: "destructive" });
      setMonthlyPanchang([]); 
    } finally {
      setPanchangLoading(false);
      console.log("[Client] fetchMonthlyData: Panchang loading finished.");
    }
  }, [toast]); // monthlyPanchang removed from deps to avoid re-fetch loop on setMonthlyPanchang

  useEffect(() => {
    console.log("[Client] useEffect for fetching monthly data triggered. Location:", location, "LocationLoading:", locationLoading, "CurrentDisplayMonth:", currentDisplayMonth);
    if (location && !locationLoading && location.timezoneOffset) { 
      console.log("[Client] Conditions met for fetching monthly data. Calling fetchMonthlyData with currentDisplayMonth.toISOString():", currentDisplayMonth.toISOString());
      fetchMonthlyData(currentDisplayMonth.toISOString(), location);
    } else {
      console.log("[Client] Conditions NOT met for fetching monthly data. Location available:", !!location, "Not loading:", !locationLoading, "TimezoneOffset present:", !!location?.timezoneOffset);
       if (!locationLoading && !location?.timezoneOffset) {
         console.warn("[Client] Location data is available but timezoneOffset is missing. Monthly panchang will not be fetched.");
       }
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
    console.log("[Client] handleMonthChange called with newMonthDate:", newMonthDate);
    const newStartOfMonth = startOfMonth(newMonthDate);
    if (!isSameMonth(newStartOfMonth, currentDisplayMonth)) {
        console.log("[Client] Month changed. Updating currentDisplayMonth to:", newStartOfMonth);
        setCurrentDisplayMonth(newStartOfMonth);
    } else {
        console.log("[Client] Month is the same. No update to currentDisplayMonth.");
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
        {console.log("[Client] Rendering PanchangCalendar. monthlyPanchang length:", monthlyPanchang.length, "isLoading:", panchangLoading, "Data sample:", monthlyPanchang.slice(0,2))}
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
          setIsDetailsModalOpen(false); 
          setIsReminderSheetOpen(true); 
        }}
      />
      
      <ReminderSystemSheet
        isOpen={isReminderSheetOpen}
        onClose={() => setIsReminderSheetOpen(false)}
        currentDate={selectedDate || new Date()} 
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
