
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
        "h-full p-1.5 flex flex-col text-xs transition-all duration-200 ease-in-out transform hover:scale-105",
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
              "font-bold text-lg",
              isSelected ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {day.dayOfMonth}
          </span>
          <div className={cn(
            "mt-0.5 space-y-px text-[10px] leading-tight",
            isSelected ? "text-primary/80" : "text-muted-foreground/90"
            )}
          >
            {day.sunrise && (
              <div className="flex items-center">
                <Sunrise className={cn("w-3 h-3 mr-1", isSelected ? "text-amber-600" : "text-amber-500")} />
                <span>{day.sunrise}</span>
              </div>
            )}
            {day.sunset && (
              <div className="flex items-center mt-px">
                <Sunset className={cn("w-3 h-3 mr-1", isSelected ? "text-orange-700" : "text-orange-600")} />
                <span>{day.sunset}</span>
              </div>
            )}
          </div>
        </div>
        {/* Right side: Tithi */}
        {day.tithi && (
          <span
            className={cn(
              "text-xs font-medium pt-0.5",
              isSelected ? "text-primary opacity-90" : isCurrentMonth ? "text-accent-foreground/80" : "text-muted-foreground/70"
            )}
          >
            {day.tithi}
          </span>
        )}
      </div>

      {/* Bottom part for Special Event / Nakshatra */}
      <div className="mt-auto pt-1 text-center">
        {day.specialEvent && (
          <div
            className={cn(
              "text-[10px] font-semibold truncate flex items-center justify-center",
              isSelected ? "text-primary" : "text-primary"
            )}
            title={day.specialEvent}
          >
            <Star className="w-3 h-3 mr-1 inline-block text-yellow-400 flex-shrink-0" />
            <span className="truncate">{day.specialEvent}</span>
          </div>
        )}
        {!day.specialEvent && day.nakshatra && (
          <div
            className={cn(
              "text-[9px] truncate",
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
