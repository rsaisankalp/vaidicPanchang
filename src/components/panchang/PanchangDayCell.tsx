
"use client";

import type { ProcessedPanchangDay } from "@/types/panchang";
import { cn } from "@/lib/utils";
import { Sunrise, Sunset, Star } from "lucide-react";

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
        "h-full p-2 flex flex-col justify-between text-xs transition-all duration-200 ease-in-out transform hover:scale-105",
        isCurrentMonth ? "bg-card/80 hover:bg-card" : "bg-muted/30 hover:bg-muted/50",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/20",
        isToday && !isSelected && "bg-accent/20",
        "rounded-md shadow-sm border border-border/50"
      )}
      aria-label={`Panchang for ${day.fullDate.toDateString()}`}
    >
      <div className="flex justify-between items-center">
        <span
          className={cn(
            "font-bold",
            isCurrentMonth ? "text-foreground" : "text-muted-foreground",
            isSelected && "text-primary-foreground"
          )}
        >
          {day.dayOfMonth}
        </span>
        {day.tithi && (
          <span 
            className={cn(
              "text-xs font-medium", 
              isCurrentMonth ? "text-accent-foreground/80" : "text-muted-foreground/70",
              isSelected && "text-primary-foreground/90"
            )}
          >
            {day.tithi}
          </span>
        )}
      </div>
      
      <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
        {day.sunrise && (
          <div className="flex items-center text-muted-foreground/80 group-hover:text-foreground/90 transition-colors">
            <Sunrise className="w-3 h-3 mr-1 text-yellow-500" />
            <span>{day.sunrise}</span>
          </div>
        )}
        {day.sunset && (
          <div className="flex items-center text-muted-foreground/80 group-hover:text-foreground/90 transition-colors">
            <Sunset className="w-3 h-3 mr-1 text-orange-500" />
            <span>{day.sunset}</span>
          </div>
        )}
      </div>

      {day.specialEvent && (
        <div className="mt-auto pt-1 text-[10px] text-center text-primary font-semibold truncate" title={day.specialEvent}>
           <Star className="w-3 h-3 mr-1 inline-block text-yellow-400" /> {day.specialEvent}
        </div>
      )}
      {!day.specialEvent && day.nakshatra && (
         <div className="mt-auto pt-1 text-[9px] text-center text-muted-foreground truncate" title={day.nakshatra}>
            {day.nakshatra}
         </div>
      )}
    </div>
  );
}
