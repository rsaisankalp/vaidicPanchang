
"use client";

import type { ProcessedPanchangDay } from "@/types/panchang";
import { cn } from "@/lib/utils";
import { Sunrise, Sunset, Star } from "lucide-react";
import React from "react";

interface PanchangDayCellProps {
  day: ProcessedPanchangDay;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
}

export function PanchangDayCell({
  day,
  isCurrentMonth,
  isSelected,
  isToday,
}: PanchangDayCellProps) {
  const tithiParts = day.tithi?.split(/([-\s])/); // Split by space or hyphen
  const tithiPrefix = tithiParts?.[0]; // "शु" or "कृ"
  const tithiNumber = tithiParts?.[2]; // The number part like "12"

  return (
    <div
      className={cn(
        "h-full p-0.5 sm:p-1 flex flex-col text-xs transition-all duration-200 ease-in-out",
        isCurrentMonth ? "bg-card/80 hover:bg-card" : "bg-muted/30 hover:bg-muted/50",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/10", // Changed bg-primary/20 to bg-primary/10
        isToday && !isSelected && "bg-accent/20",
        "rounded-md shadow-sm border border-border/50 overflow-hidden" // Added overflow-hidden
      )}
      aria-label={`Panchang for ${day.fullDate?.toDateString()}`}
    >
      {/* Default (xs): Only Date Number */}
      <div className={cn(
        "flex-grow flex flex-col items-center justify-center sm:hidden",
         isSelected ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
      )}>
        <span className={cn("font-bold text-lg", isSelected && "text-primary")}>
          {day.dayOfMonth}
        </span>
      </div>

      {/* sm breakpoint and up: More details */}
      <div className="hidden sm:flex sm:flex-col sm:h-full">
        {/* Top part: Date and Tithi */}
        <div className="flex justify-between items-start w-full mb-px">
          <span
            className={cn(
              "font-bold",
              "text-base md:text-lg", // Slightly smaller base for sm
              isSelected ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {day.dayOfMonth}
          </span>
          {day.tithi && (
            <span
              className={cn(
                "font-medium text-right whitespace-nowrap",
                "text-[0.55rem] md:text-[0.6rem] lg:text-xs", // Compact Tithi
                isSelected ? "text-primary opacity-90" : isCurrentMonth ? "text-accent-foreground/80" : "text-muted-foreground/70",
                "pl-0.5 pt-px"
              )}
              title={day.tithi}
            >
              {tithiPrefix}
              {tithiNumber && `-${tithiNumber.substring(0,2)}`} {/* Max 2 chars for number */}
            </span>
          )}
        </div>

        {/* Middle part: Sunrise/Sunset - hidden on sm, shown from md */}
        <div className={cn(
          "mt-px space-y-0 leading-tight",
          "text-[0.5rem] md:text-[0.55rem] lg:text-[0.6rem]",
          isSelected ? "text-primary/80" : "text-muted-foreground/90",
          "hidden md:block" 
        )}>
          {day.sunrise && (
            <div className="flex items-center">
              <Sunrise className={cn("mr-px flex-shrink-0", 
                                    "w-2 h-2 lg:w-2.5 lg:h-2.5",
                                    isSelected ? "text-amber-600" : "text-amber-500")} />
              <span>{day.sunrise}</span>
            </div>
          )}
          {day.sunset && (
            <div className="flex items-center mt-px">
              <Sunset className={cn("mr-px flex-shrink-0",
                                   "w-2 h-2 lg:w-2.5 lg:h-2.5", 
                                   isSelected ? "text-orange-700" : "text-orange-600")} />
              <span>{day.sunset}</span>
            </div>
          )}
        </div>

        {/* Bottom part: Special Event / Nakshatra - hidden on sm and md, shown from lg */}
        <div className={cn(
          "mt-auto pt-px text-center w-full",
          "hidden lg:block" 
        )}>
          {day.specialEvent && (
            <div
              className={cn(
                "flex items-start justify-center w-full text-left overflow-hidden",
                isSelected ? "text-primary" : "text-primary"
              )}
              title={day.specialEvent}
            >
              <Star className={cn(
                  "mr-0.5 inline-block flex-shrink-0 mt-px",
                  "w-2 h-2", 
                  isSelected ? "text-yellow-500" : "text-yellow-400"
              )} />
              <span className={cn(
                "font-semibold whitespace-normal leading-tight text-left", // Ensure text can wrap
                "text-[0.45rem]" 
              )}>
                {day.specialEvent}
              </span>
            </div>
          )}
          {!day.specialEvent && day.nakshatra && (
            <div
              className={cn(
                "whitespace-normal leading-tight text-center", // Ensure text can wrap
                "text-[0.45rem]", 
                isSelected ? "text-primary opacity-80" : "text-muted-foreground"
              )}
              title={day.nakshatra}
            >
              {day.nakshatra}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
