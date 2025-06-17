
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ReminderForm } from "./ReminderForm";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReminderSystemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

export function ReminderSystemSheet({ isOpen, onClose, currentDate }: ReminderSystemSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-card p-0 flex flex-col" side="right">
        <SheetHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
          <SheetTitle className="text-xl sm:text-2xl font-headline text-primary">Reminder Settings</SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            Manage your Panchang notifications and reminders here.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow p-4 sm:p-6">
          <ReminderForm currentDate={currentDate} />
        </ScrollArea>
        <SheetFooter className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-border">
          <SheetClose asChild>
            <Button type="button" variant="outline" className="text-sm">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
