
"use client";

import * as React from "react";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProcessedPanchangDay, UserLocation } from "@/types/panchang";
import { PanchangDayCell } from "./PanchangDayCell";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface PanchangCalendarProps {
  location: UserLocation | null;
  monthlyPanchangData: ProcessedPanchangDay[];
  onDateSelect: (date: Date) => void;
  currentDisplayMonth: Date;
  setCurrentDisplayMonth: (date: Date) => void;
  selectedDate: Date | undefined;
  isLoading: boolean;
}

export function PanchangCalendar({
  monthlyPanchangData,
  onDateSelect,
  currentDisplayMonth,
  setCurrentDisplayMonth,
  selectedDate,
  isLoading,
}: PanchangCalendarProps) {

  const handleMonthChange = (month: Date) => {
    setCurrentDisplayMonth(startOfMonth(month));
  };

  const DayContent = React.useCallback(
    ({ date, displayMonth }: { date: Date; displayMonth: Date }) => {
      const dayPanchang = monthlyPanchangData.find((d) => {
        return d.fullDate && isSameDay(d.fullDate, date);
      });

      if (!dayPanchang) {
        return (
          <div className="h-full p-1 flex items-center justify-center text-xs rounded-md border border-border/30 bg-muted/20">
            <span className="font-bold text-muted-foreground">{date.getDate()}</span>
          </div>
        );
      }
      
      return (
        <PanchangDayCell
          key={date.toISOString()} 
          day={dayPanchang}
          isCurrentMonth={isSameMonth(date, displayMonth)}
          isSelected={!!selectedDate && isSameDay(date, selectedDate)}
          isToday={isSameDay(date, new Date())}
        />
      );
    },
    [monthlyPanchangData, selectedDate]
  );

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 rounded-lg shadow-xl bg-card animate-pulse">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 bg-muted" />
          <Skeleton className="h-6 w-28 sm:h-8 sm:w-32 bg-muted" />
          <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 bg-muted" />
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 md:h-24 w-full bg-muted rounded-md" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-1 sm:p-2 md:p-4 rounded-lg shadow-xl bg-card border border-border">
      <ShadcnCalendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        month={currentDisplayMonth}
        onMonthChange={handleMonthChange}
        className="w-full"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-2 sm:space-x-4 sm:space-y-0",
          month: "space-y-2 sm:space-y-4 w-full",
          caption: "flex justify-center items-center pt-1 relative px-4 mb-3 sm:mb-4", 
          caption_label: "text-sm sm:text-base md:text-lg font-headline font-semibold text-primary", 
          nav_button: "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 bg-transparent hover:bg-accent/20 p-0 text-accent",
          nav_button_previous: "absolute left-1", 
          nav_button_next: "absolute right-1",  
          table: "w-full border-collapse space-y-0.5 sm:space-y-1",
          head_row: "flex w-full mt-1 sm:mt-2",
          head_cell: "text-muted-foreground rounded-md w-full basis-0 grow font-normal text-[0.55rem] sm:text-[0.65rem] md:text-[0.75rem] justify-center flex pb-1", 
          row: "flex w-full mt-0.5 sm:mt-1 gap-0.5 sm:gap-1", // Reduced gap for smaller screens
          cell: cn(
            "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 w-full basis-0 grow aspect-[4/3] md:aspect-[5/4]", 
            "[&:has([aria-selected])]:bg-accent/10",
            "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            ),
          day: cn(
            "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0", // Reduced ring offset
          ),
          day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
          day_today: "bg-accent text-accent-foreground ring-1 ring-accent",
          day_outside: "text-muted-foreground opacity-50 aria-selected:bg-muted/50 aria-selected:text-muted-foreground",
          day_disabled:"text-muted-foreground opacity-50",
          day_hidden: "invisible",
        }}
        components={{
          DayContent: DayContent,
          IconLeft: () => <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:h-5" />,
          IconRight: () => <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:h-5" />,
          CaptionLabel: ({ displayMonth }) => (
            <span className="text-sm sm:text-base md:text-xl font-headline font-semibold text-primary">
              {format(displayMonth, "MMMM yyyy")}
            </span>
          ),
        }}
        showOutsideDays={true}
        fixedWeeks
      />
    </div>
  );
}
