
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
  // console.log(`[PanchangDayCell] Rendering for date: ${day.date}`, day);

  return (
    <div
      className={cn(
        "h-full p-1 sm:p-1.5 flex flex-col text-xs transition-all duration-200 ease-in-out transform hover:scale-105",
        isCurrentMonth ? "bg-card/80 hover:bg-card" : "bg-muted/30 hover:bg-muted/50",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/20",
        isToday && !isSelected && "bg-accent/20",
        "rounded-md shadow-sm border border-border/50"
      )}
      aria-label={`Panchang for ${day.fullDate?.toDateString()}`}
    >
      <div className="flex justify-between items-start w-full">
        {/* Left side: Date + Sun/Moon */}
        <div>
          <span
            className={cn(
              "font-bold",
              "text-sm sm:text-base md:text-lg", 
              isSelected ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {day.dayOfMonth}
          </span>
          <div className={cn(
            "mt-0.5 space-y-px leading-tight",
             "text-[0.5rem] sm:text-[0.55rem] md:text-[0.6rem] lg:text-[0.65rem]", 
            isSelected ? "text-primary/80" : "text-muted-foreground/90"
            )}
          >
            {day.sunrise && (
              <div className="flex items-center">
                <Sunrise className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-px sm:mr-0.5 flex-shrink-0", isSelected ? "text-amber-600" : "text-amber-500")} />
                <span>{day.sunrise}</span>
              </div>
            )}
            {day.sunset && (
              <div className="flex items-center mt-px">
                <Sunset className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-px sm:mr-0.5 flex-shrink-0", isSelected ? "text-orange-700" : "text-orange-600")} />
                <span>{day.sunset}</span>
              </div>
            )}
          </div>
        </div>
        {/* Right side: Tithi */}
        {day.tithi && (
          <span
            className={cn(
              "font-medium pt-0.5 text-right", 
              "text-[0.5rem] sm:text-[0.6rem] md:text-[0.65rem] lg:text-xs", 
              isSelected ? "text-primary opacity-90" : isCurrentMonth ? "text-accent-foreground/80" : "text-muted-foreground/70",
              "pl-1" 
            )}
          >
            {day.tithi}
          </span>
        )}
      </div>

      {/* Bottom part for Special Event / Nakshatra */}
      <div className={cn(
        "mt-auto pt-0.5 sm:pt-1 text-center w-full",
        "hidden sm:block" // Hide on extra-small screens, show as block from 'sm' breakpoint
      )}>
        {day.specialEvent && (
          <div
            className={cn(
              "flex items-start justify-center w-full text-left", 
              isSelected ? "text-primary" : "text-primary"
            )}
            title={day.specialEvent}
          >
            <Star className={cn(
                "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-0.5 inline-block flex-shrink-0 mt-px", 
                isSelected ? "text-yellow-500" : "text-yellow-400"
            )} />
            <span className={cn(
              "font-semibold whitespace-normal leading-tight",
              "text-[0.45rem] sm:text-[0.5rem] md:text-[0.55rem] lg:text-[0.6rem]"
            )}>
              {day.specialEvent}
            </span>
          </div>
        )}
        {!day.specialEvent && day.nakshatra && (
          <div
            className={cn(
              "whitespace-normal leading-tight text-center",
              "text-[0.45rem] sm:text-[0.5rem] md:text-[0.55rem]",
              isSelected ? "text-primary opacity-80" : "text-muted-foreground"
            )}
            title={day.nakshatra}
          >
            {day.nakshatra}
          </div>
        )}
      </div>
    </div>
  );
}
