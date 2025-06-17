
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DailyPanchangDetail, ParsedJsonData } from "@/types/panchang";
import { PanchangDetailItem } from "./PanchangDetailItem";
import { format } from "date-fns";
import {
  Sun, Moon, CalendarDays, Thermometer, Compass, Clock, Users, Zap, ShieldAlert, Sunrise, Sunset, Star, BarChartHorizontalBig, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PanchangDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSelectedDate: Date | undefined; 
  details: (DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null;
  isLoading: boolean;
  onOpenReminderSheet: () => void;
}

// A simple BellIcon as Lucide doesn't have one that perfectly fits
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);


export function PanchangDetailsModal({
  isOpen,
  onClose,
  originalSelectedDate,
  details,
  isLoading,
  onOpenReminderSheet,
}: PanchangDetailsModalProps) {

  const renderDetails = () => {
    if (isLoading) {
      return <div className="min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center"><div className="loader ease-linear rounded-full border-4 border-t-4 border-muted h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 animate-spin border-t-primary"></div><p className="text-muted-foreground text-sm sm:text-base">Loading details...</p></div>;
    }
    if (!details) {
      return <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No details available for this date.</p>;
    }

    const pData = details?.parsed_json_data;

    const displayDate = originalSelectedDate ? format(originalSelectedDate, "MMMM d, yyyy") : "Selected Date";
    const displayDayName = details?.day_name || '...';

    return (
      <>
        <DialogHeader className="mb-3 sm:mb-4 border-b pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-headline text-primary flex items-center">
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 mr-2 sm:mr-3 text-primary" />
            Panchang for {displayDate} ({displayDayName})
          </DialogTitle>
          {details?.festive_name && (
             <div className="!mt-1 sm:!mt-1.5">
                <Badge variant="secondary" className="text-xs sm:text-sm md:text-base bg-accent/20 text-accent-foreground py-1 px-2 sm:px-3">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-accent" />
                  {details.festive_name}
                </Badge>
             </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-200px)] pr-2 sm:pr-3 overflow-hidden">
          <div className="space-y-4 sm:space-y-6">
            
            <section>
              <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground/80 font-headline flex items-center"><Info className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />Key Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                <PanchangDetailItem label="Hindu Month (Purnimanta)" value={pData?.hindu_maah?.purnimanta} icon={CalendarDays} highlight />
                <PanchangDetailItem label="Paksha" value={details?.paksha} icon={Moon} highlight />
                <PanchangDetailItem label="Tithi" value={pData?.tithi?.details?.tithi_name} icon={Star} />
                <PanchangDetailItem label="Tithi End Time" value={details?.tithi_end_date_time} icon={Clock} />
                <PanchangDetailItem label="Nakshatra" value={pData?.nakshatra?.details?.nak_name} icon={Star} />
                <PanchangDetailItem label="Nakshatra End Time" value={details?.nakshatra_end_date_time} icon={Clock} />
                <PanchangDetailItem label="Yoga" value={pData?.yog?.details?.yog_name} icon={BarChartHorizontalBig} />
                <PanchangDetailItem label="Yoga End Time" value={details?.yog_end_date_time} icon={Clock} />
                <PanchangDetailItem label="Karana" value={pData?.karan?.details?.karan_name} icon={Users} />
                <PanchangDetailItem label="Karana End Time" value={details?.karan_end_date_time} icon={Clock} />
              </div>
            </section>

            <section>
              <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground/80 font-headline flex items-center"><Sun className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />Celestial Timings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <PanchangDetailItem label="Sunrise" value={details?.sunrise} icon={Sunrise} />
                <PanchangDetailItem label="Sunset" value={details?.sunset} icon={Sunset} />
                <PanchangDetailItem label="Moonrise" value={details?.moonrise} icon={Moon} />
                <PanchangDetailItem label="Moonset" value={details?.moonset} icon={Moon} />
              </div>
            </section>

            <section>
              <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground/80 font-headline flex items-center"><Compass className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />Astrological Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <PanchangDetailItem label="Sun Sign" value={details?.sun_sign} icon={Sun} />
                <PanchangDetailItem label="Moon Sign" value={details?.moon_sign} icon={Moon} />
                <PanchangDetailItem label="Ayana" value={details?.ayana} icon={Compass} />
                <PanchangDetailItem label="Ritu" value={details?.ritu} icon={Thermometer} />
                <PanchangDetailItem label="Moon Nivas" value={details?.moon_nivas} icon={Moon} />
                <PanchangDetailItem label="Disha Shool" value={details?.disha_shool} icon={Compass} />
              </div>
            </section>

            <section>
              <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground/80 font-headline flex items-center"><CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />Samvat Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <PanchangDetailItem label="Vikram Samvat" value={details?.vikram_samvat} />
                <PanchangDetailItem label="Vikram Samvat Name" value={details?.vkram_samvat_name} />
                <PanchangDetailItem label="Shaka Samvat" value={details?.shaka_samvat} />
                <PanchangDetailItem label="Shaka Samvat Name" value={details?.shaka_samvat_name} />
              </div>
            </section>

            <section>
              <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground/80 font-headline flex items-center"><Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />Auspicious/Inauspicious Timings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                <PanchangDetailItem
                  label="Abhijit Muhurta"
                  value={details?.abhijit_muhurta_start && details?.abhijit_muhurta_end ? `${details.abhijit_muhurta_start} - ${details.abhijit_muhurta_end}` : undefined}
                  icon={Zap}
                  highlight={true}
                />
                <PanchangDetailItem
                  label="Rahu Kaal"
                  value={details?.rahukaal_start_start && details?.rahukaal_start_end ? `${details.rahukaal_start_start} - ${details.rahukaal_start_end}` : undefined}
                  icon={ShieldAlert}
                  className="bg-destructive/10"
                  valueClassName="text-destructive"
                  labelClassName="text-destructive"
                />
                <PanchangDetailItem
                  label="Guli Kaal"
                  value={details?.guliKaal_start && details?.guliKaal_end ? `${details.guliKaal_start} - ${details.guliKaal_end}`: undefined}
                  icon={Clock}
                />
                <PanchangDetailItem
                  label="Yamghant Kaal"
                  value={details?.yamghant_kaal_start && details?.yamghant_kaal_end ? `${details.yamghant_kaal_start} - ${details.yamghant_kaal_end}`: undefined}
                  icon={Clock}
                />
              </div>
            </section>

            {pData?.tithi?.details?.summary && (
              <section>
                <h4 className="text-sm sm:text-md font-semibold mb-1 text-accent-foreground/90">Tithi Summary:</h4>
                <p className="text-xs sm:text-sm text-muted-foreground italic">{pData.tithi.details.summary}</p>
              </section>
            )}
            {pData?.nakshatra?.details?.summary && (
              <section>
                <h4 className="text-sm sm:text-md font-semibold mb-1 text-accent-foreground/90">Nakshatra Summary:</h4>
                <p className="text-xs sm:text-sm text-muted-foreground italic">{pData.nakshatra.details.summary}</p>
              </section>
            )}

          </div>
        </ScrollArea>
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t flex flex-col sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-sm">Close</Button>
          <Button onClick={onOpenReminderSheet} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto text-sm">
            <BellIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> Create Reminder
          </Button>
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl w-[90vw] sm:w-[95vw] bg-card shadow-2xl rounded-lg max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Panchang Details</DialogTitle>
        </DialogHeader>
        {renderDetails()}
      </DialogContent>
    </Dialog>
  );
}
