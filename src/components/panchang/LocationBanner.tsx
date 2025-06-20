
"use client";

import type { UserLocation } from "@/types/panchang";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationBannerProps {
  location: UserLocation | null;
  loading: boolean;
}

export function LocationBanner({ location, loading }: LocationBannerProps) {
  if (loading) {
    return (
      <div className="p-3 sm:p-4 bg-accent/10 rounded-lg shadow flex items-center justify-center animate-pulse">
        <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 bg-accent/20" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-3 sm:p-4 bg-destructive/10 text-destructive rounded-lg shadow flex items-center justify-center text-center">
        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-destructive flex-shrink-0" />
        <span className="text-xs sm:text-sm">
          Could not determine location. Panchang data may be inaccurate.
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 bg-accent/20 rounded-lg shadow-md flex items-center justify-center text-center">
      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-accent flex-shrink-0" />
      <p className="text-xs sm:text-sm md:text-base text-accent-foreground font-medium">
        Current Location:{" "}
        <span className="font-semibold text-primary">
          {location.city || "Unknown City"},{" "}
          {location.state || "Unknown State"},{" "}
          {location.country || "Unknown Country"}
        </span>
      </p>
    </div>
  );
}
