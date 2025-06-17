
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { LocationBanner } from "./LocationBanner";
import { PanchangCalendar } from "./PanchangCalendar";
import { PanchangDetailsModal } from "./PanchangDetailsModal";
import { ReminderSystemSheet } from "./ReminderSystemSheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { UserLocation, ProcessedPanchangDay, DailyPanchangDetail, ParsedJsonData } from "@/types/panchang";
import { getLocationDetails, getMonthlyPanchang, getDailyPanchangDetails } from "@/lib/actions";
import { Loader2, AlertTriangle, BellIcon as BellIconLucide } from "lucide-react";
import { startOfMonth, isSameMonth, getYear, getMonth, format } from "date-fns";


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
    let resolvedLat: number = 12.9716; // Default: Bengaluru
    let resolvedLon: number = 77.5946; // Default: Bengaluru
    const defaultTimezoneOffset = "5.5"; // Default IST

    try {
      if (coords) {
        resolvedLat = coords.latitude;
        resolvedLon = coords.longitude;
        console.log(`[Client] Using provided coords: lat=${resolvedLat}, lon=${resolvedLon}`);
      } else {
        console.log(`[Client] Using default coords (Bengaluru): lat=${resolvedLat}, lon=${resolvedLon}`);
      }

      console.log(`[Client] Attempting to call getLocationDetails with lat: ${resolvedLat}, lon: ${resolvedLon}`);
      const locDetails = await getLocationDetails(resolvedLat, resolvedLon);
      console.log("[Client] getLocationDetails returned:", locDetails);

      if (locDetails) { // locDetails is UserLocation, timezoneOffset is guaranteed string
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
          timezoneOffset: defaultTimezoneOffset, // Ensure this is a string
        });
      }
    } catch (error) {
      console.error("[Client] Error in fetchAndSetLocation's try-catch block:", error);
      toast({ title: "Critical Location Error", description: "An unexpected error occurred while retrieving location. Using default.", variant: "destructive" });
      setLocation({
        latitude: resolvedLat, // Fallback to defaults
        longitude: resolvedLon,
        city: "Bengaluru (Catch)",
        state: "Karnataka (Catch)",
        country: "India (Catch)",
        timezoneOffset: defaultTimezoneOffset, // Ensure this is a string
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
          fetchAndSetLocation(); // Call without coords to use defaults
        }
      );
    } else {
      console.warn("[Client] Geolocation not supported by browser.");
      toast({ title: "Geolocation Not Supported", description: "Your browser does not support geolocation. Using default location.", variant: "default" });
      fetchAndSetLocation(); // Call without coords to use defaults
    }
  }, [fetchAndSetLocation, toast]);


  const fetchMonthlyData = useCallback(async (year: number, month: number, loc: UserLocation) => {
    console.log(`[Client] fetchMonthlyData triggered for year: ${year}, month: ${month}, and location:`, loc);
    // loc.timezoneOffset is now guaranteed to be a string by UserLocation type and getLocationDetails/fetchAndSetLocation logic
    if (!loc) { // Should not happen if location state is always set
      console.warn("[Client] fetchMonthlyData: Location missing. Aborting monthly fetch.", loc);
      toast({ title: "Panchang Error", description: "Location details are unavailable. Cannot fetch monthly panchang.", variant: "destructive" });
      setPanchangLoading(false);
      return;
    }
    setPanchangLoading(true);
    try {
      console.log(`[Client] fetchMonthlyData: Calling getMonthlyPanchang with year: ${year}, month: ${month}, location:`, loc);
      const data = await getMonthlyPanchang(year, month, loc);
      console.log("[Client] fetchMonthlyData: Received data from getMonthlyPanchang:", data && data.length > 0 ? `${data.length} entries` : "Empty or null data", data ? data.slice(0,2) : null);
      setMonthlyPanchang(data);
      console.log("[Client] fetchMonthlyData: monthlyPanchang state updated. Count:", data ? data.length : 0);
    } catch (error) {
      console.error("[Client] Error fetching monthly panchang in fetchMonthlyData:", error);
      toast({ title: "Panchang Error", description: "Failed to load monthly panchang data.", variant: "destructive" });
      setMonthlyPanchang([]);
    } finally {
      setPanchangLoading(false);
      console.log("[Client] fetchMonthlyData: Panchang loading finished.");
    }
  }, [toast]);

  useEffect(() => {
    console.log("[Client] useEffect for fetching monthly data triggered. Location:", location, "LocationLoading:", locationLoading, "CurrentDisplayMonth:", currentDisplayMonth);
    // location.timezoneOffset is now a guaranteed string, so no need to check for its presence explicitly if location object exists.
    if (location && !locationLoading) {
      console.log("[Client] Conditions met for fetching monthly data. Calling fetchMonthlyData.");
      const yearToFetch = getYear(currentDisplayMonth);
      const monthToFetch = getMonth(currentDisplayMonth) + 1; // 1-indexed for action
      fetchMonthlyData(yearToFetch, monthToFetch, location);
    } else {
      console.log("[Client] Conditions NOT met for fetching monthly data. Location available:", !!location, "Not loading:", !locationLoading);
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

    const dateStringForAPI = format(date, "yyyy-MM-dd");
    console.log(`[Client] handleDateSelect: User clicked ${date.toDateString()}, formatted for API: ${dateStringForAPI}. Location being used:`, location);

    try {
      const details = await getDailyPanchangDetails(dateStringForAPI, location);
      console.log("[Client] handleDateSelect: Received daily details from action:", details ? `Data for ${details.month_name}, ${details.day_name}` : "No details received");
      setDailyDetails(details);
    } catch (error) {
      console.error("[Client] Error fetching daily details in handleDateSelect:", error);
      toast({ title: "Details Error", description: "Failed to load panchang details for the selected date.", variant: "destructive" });
      setDailyDetails(null);
    } finally {
      setDetailsLoading(false);
      console.log("[Client] handleDateSelect: Finished. Daily details state:", dailyDetails);
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
    <div className="container mx-auto p-2 sm:p-4 space-y-4 md:space-y-6 min-h-screen flex flex-col">
      <header className="text-center py-4 md:py-6">
        <div className="flex justify-center mb-3 sm:mb-4">
          <Image
            src="https://i.postimg.cc/SNYhRqFn/VDS-Logo-Black.png" 
            alt="Vaidic Dharma Sansthan Logo"
            width={100} 
            height={100} 
            className="w-20 sm:w-24 md:w-28 h-auto object-contain" 
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-headline font-bold text-primary tracking-tight">
          Vaidic Dharma Sansthan Panchang
        </h1>
        <p className="text-sm sm:text-md md:text-lg text-muted-foreground mt-1 sm:mt-2">
          Your daily guide to auspicious timings and vedic insights.
        </p>
      </header>

      <LocationBanner location={location} loading={locationLoading} />

      <div className="flex justify-end mb-2 sm:mb-4">
        <Button 
          onClick={() => setIsReminderSheetOpen(true)} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2"
        >
          <BellIconLucide className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2" /> Set Reminder
        </Button>
      </div>

      {panchangLoading && locationLoading ? (
        <div className="flex flex-col items-center justify-center flex-grow py-10">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mb-3 sm:mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading Panchang...</p>
        </div>
      ) : !location ? (
         <div className="flex flex-col items-center justify-center flex-grow py-10 bg-card p-4 sm:p-6 rounded-lg shadow-lg">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-3 sm:mb-4" />
          <p className="text-destructive text-md sm:text-lg font-semibold">Location information is unavailable.</p>
          <p className="text-muted-foreground text-center text-xs sm:text-sm">Please enable location services or check your connection. <br/>Panchang cannot be displayed without location.</p>
        </div>
      ) : (
        <main className="flex-grow">
        {console.log("[Client] Rendering PanchangCalendar. monthlyPanchang length:", monthlyPanchang.length, "isLoading:", panchangLoading)}
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
        originalSelectedDate={selectedDate}
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

      <footer className="text-center py-6 md:py-8 mt-auto border-t border-border">
        <p className="text-xs sm:text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaidic Dharma Sansthan Panchang. All rights reserved.
        </p>
        <p className="text-[0.6rem] sm:text-xs text-muted-foreground/70 mt-1">
          Panchang data provided for informational purposes. Consult with a qualified priest for important occasions.
        </p>
      </footer>
    </div>
  );
}

