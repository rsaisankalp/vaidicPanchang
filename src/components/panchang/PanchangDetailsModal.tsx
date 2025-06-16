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
import { format, parseISO } from "date-fns";
import {
  Sun, Moon, CalendarDays, Thermometer, Compass, Clock, Users, Zap, ShieldAlert, Sunrise, Sunset, Star, BarChartHorizontalBig, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PanchangDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: (DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null;
  isLoading: boolean;
  onOpenReminderSheet: () => void;
}

export function PanchangDetailsModal({
  isOpen,
  onClose,
  details,
  isLoading,
  onOpenReminderSheet,
}: PanchangDetailsModalProps) {
  
  const renderDetails = () => {
    if (isLoading) {
      return <div className="min-h-[400px] flex items-center justify-center"><div className="loader ease-linear rounded-full border-4 border-t-4 border-muted h-12 w-12 mb-4 animate-spin border-t-primary"></div><p className="text-muted-foreground">Loading details...</p></div>;
    }
    if (!details) {
      return <p className="text-center text-muted-foreground py-8">No details available for this date.</p>;
    }

    const pData = details.parsed_json_data;

    return (
      <>
        <DialogHeader className="mb-4 border-b pb-4">
          <DialogTitle className="text-2xl font-headline text-primary flex items-center">
            <CalendarDays className="w-7 h-7 mr-3 text-primary" />
            Panchang for {format(parseISO(details.created_datetime.substring(0,10)), "MMMM d, yyyy")} ({details.day_name})
          </DialogTitle>
          {details.festive_name && (
             <DialogDescription className="!mt-1">
                <Badge variant="secondary" className="text-base bg-accent/20 text-accent-foreground py-1 px-3">
                  <Star className="w-4 h-4 mr-2 text-accent" />
                  {details.festive_name}
                </Badge>
             </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-200px)] pr-3">
          <div className="space-y-6">
            {/* Main Info Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-foreground/80 font-headline flex items-center"><Info className="w-5 h-5 mr-2 text-accent" />Key Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <PanchangDetailItem label="Hindu Month (Purnimanta)" value={pData?.hindu_maah.purnimanta} icon={CalendarDays} highlight />
                <PanchangDetailItem label="Paksha" value={details.paksha} icon={Moon} highlight />
                <PanchangDetailItem label="Tithi" value={pData?.tithi.details.tithi_name} icon={Star} />
                <PanchangDetailItem label="Tithi End Time" value={details.tithi_end_date_time} icon={Clock} />
                
                <PanchangDetailItem label="Nakshatra" value={pData?.nakshatra.details.nak_name} icon={Star} />
                <PanchangDetailItem label="Nakshatra End Time" value={details.nakshatra_end_date_time} icon={Clock} />
                <PanchangDetailItem label="Yoga" value={pData?.yog.details.yog_name} icon={BarChartHorizontalBig} />
                <PanchangDetailItem label="Yoga End Time" value={details.yog_end_date_time} icon={Clock} />
                <PanchangDetailItem label="Karana" value={pData?.karan.details.karan_name} icon={Users} />
                <PanchangDetailItem label="Karana End Time" value={details.karan_end_date_time} icon={Clock} />
              </div>
            </section>

            {/* Sun/Moon Times Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-foreground/80 font-headline flex items-center"><Sun className="w-5 h-5 mr-2 text-accent" />Celestial Timings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <PanchangDetailItem label="Sunrise" value={details.sunrise} icon={Sunrise} />
                <PanchangDetailItem label="Sunset" value={details.sunset} icon={Sunset} />
                <PanchangDetailItem label="Moonrise" value={details.moonrise} icon={Moon} />
                <PanchangDetailItem label="Moonset" value={details.moonset} icon={Moon} />
              </div>
            </section>

            {/* Astrological Details Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-foreground/80 font-headline flex items-center"><Compass className="w-5 h-5 mr-2 text-accent" />Astrological Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <PanchangDetailItem label="Sun Sign" value={details.sun_sign} icon={Sun} />
                <PanchangDetailItem label="Moon Sign" value={details.moon_sign} icon={Moon} />
                <PanchangDetailItem label="Ayana" value={details.ayana} icon={Compass} />
                <PanchangDetailItem label="Ritu" value={details.ritu} icon={Thermometer} />
                <PanchangDetailItem label="Moon Nivas" value={details.moon_nivas} icon={Moon} />
                <PanchangDetailItem label="Disha Shool" value={details.disha_shool} icon={Compass} />
              </div>
            </section>

            {/* Samvat Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-foreground/80 font-headline flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-accent" />Samvat Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <PanchangDetailItem label="Vikram Samvat" value={details.vikram_samvat} />
                <PanchangDetailItem label="Vikram Samvat Name" value={details.vkram_samvat_name} />
                <PanchangDetailItem label="Shaka Samvat" value={details.shaka_samvat} />
                <PanchangDetailItem label="Shaka Samvat Name" value={details.shaka_samvat_name} />
              </div>
            </section>

            {/* Muhurta Timings Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-foreground/80 font-headline flex items-center"><Clock className="w-5 h-5 mr-2 text-accent" />Auspicious/Inauspicious Timings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PanchangDetailItem 
                  label="Abhijit Muhurta" 
                  value={`${details.abhijit_muhurta_start} - ${details.abhijit_muhurta_end}`} 
                  icon={Zap} 
                  highlight={true}
                />
                <PanchangDetailItem 
                  label="Rahu Kaal" 
                  value={`${details.rahukaal_start_start} - ${details.rahukaal_start_end}`} 
                  icon={ShieldAlert} 
                  className="bg-destructive/10"
                  valueClassName="text-destructive"
                  labelClassName="text-destructive"
                />
                <PanchangDetailItem 
                  label="Guli Kaal" 
                  value={`${details.guliKaal_start} - ${details.guliKaal_end}`} 
                  icon={Clock} 
                />
                <PanchangDetailItem 
                  label="Yamghant Kaal" 
                  value={`${details.yamghant_kaal_start} - ${details.yamghant_kaal_end}`} 
                  icon={Clock} 
                />
              </div>
            </section>
            
            {pData?.tithi.details.summary && (
              <section>
                <h4 className="text-md font-semibold mb-1 text-accent-foreground/90">Tithi Summary:</h4>
                <p className="text-sm text-muted-foreground italic">{pData.tithi.details.summary}</p>
              </section>
            )}
            {pData?.nakshatra.details.summary && (
              <section>
                <h4 className="text-md font-semibold mb-1 text-accent-foreground/90">Nakshatra Summary:</h4>
                <p className="text-sm text-muted-foreground italic">{pData.nakshatra.details.summary}</p>
              </section>
            )}

          </div>
        </ScrollArea>
        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose} className="mr-2">Close</Button>
          <Button onClick={onOpenReminderSheet} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <BellIcon className="w-4 h-4 mr-2" /> Create Reminder
          </Button>
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-4xl w-[95vw] bg-card shadow-2xl rounded-lg max-h-[90vh]">
        {renderDetails()}
      </DialogContent>
    </Dialog>
  );
}

// A simple BellIcon as Lucide doesn't have one that perfectly fits
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
