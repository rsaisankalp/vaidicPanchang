
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
        "h-full p-1 flex flex-col text-xs transition-all duration-200 ease-in-out transform hover:scale-105",
        isCurrentMonth ? "bg-card/80 hover:bg-card" : "bg-muted/30 hover:bg-muted/50",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/20",
        isToday && !isSelected && "bg-accent/20",
        "rounded-md shadow-sm border border-border/50"
      )}
      aria-label={`Panchang for ${day.fullDate?.toDateString()}`}
    >
      {/* Top part: Date and Tithi */}
      <div className="flex justify-between items-start w-full">
        <span
          className={cn(
            "font-bold",
            "text-sm sm:text-base md:text-lg",
            isSelected ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {day.dayOfMonth}
        </span>
        {day.tithi && (
          <span
            className={cn(
              "font-medium whitespace-nowrap pt-px sm:pt-0.5 text-right",
              "text-[0.5rem] sm:text-[0.6rem] md:text-[0.65rem] lg:text-xs",
              isSelected ? "text-primary opacity-90" : isCurrentMonth ? "text-accent-foreground/80" : "text-muted-foreground/70",
              "pl-1"
            )}
          >
            {day.tithi}
          </span>
        )}
      </div>

      {/* Middle part: Sunrise/Sunset - hidden on xs, shown from sm */}
      <div className={cn(
        "mt-0.5 space-y-px leading-tight",
        "text-[0.45rem] sm:text-[0.5rem] md:text-[0.55rem] lg:text-[0.6rem]",
        isSelected ? "text-primary/80" : "text-muted-foreground/90",
        "hidden sm:block" // Hidden by default (xs), shown from 'sm'
      )}>
        {day.sunrise && (
          <div className="flex items-center">
            <Sunrise className={cn("mr-px sm:mr-0.5 flex-shrink-0", 
                                  "w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3",
                                  isSelected ? "text-amber-600" : "text-amber-500")} />
            <span>{day.sunrise}</span>
          </div>
        )}
        {day.sunset && (
          <div className="flex items-center mt-px">
            <Sunset className={cn("mr-px sm:mr-0.5 flex-shrink-0",
                                 "w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3", 
                                 isSelected ? "text-orange-700" : "text-orange-600")} />
            <span>{day.sunset}</span>
          </div>
        )}
      </div>

      {/* Bottom part: Special Event / Nakshatra - hidden on xs and sm, shown from md */}
      <div className={cn(
        "mt-auto pt-0.5 text-center w-full",
        "hidden md:block" // Hidden by default (xs) and on 'sm', shown from 'md'
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
                "w-2 h-2 lg:w-2.5 lg:h-2.5", // Smaller base size for md, slightly larger for lg+
                isSelected ? "text-yellow-500" : "text-yellow-400"
            )} />
            <span className={cn(
              "font-semibold whitespace-normal leading-tight",
              "text-[0.45rem] lg:text-[0.55rem]" // Smallest text for md, slightly larger for lg+
            )}>
              {day.specialEvent}
            </span>
          </div>
        )}
        {!day.specialEvent && day.nakshatra && (
          <div
            className={cn(
              "whitespace-normal leading-tight text-center",
              "text-[0.45rem] lg:text-[0.5rem]", // Smallest text for md, slightly larger for lg+
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
