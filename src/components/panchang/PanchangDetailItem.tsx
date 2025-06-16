"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PanchangDetailItemProps {
  label: string;
  value?: string | number | null;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  highlight?: boolean;
}

export function PanchangDetailItem({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  labelClassName,
  highlight = false,
}: PanchangDetailItemProps) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col p-3 rounded-md transition-all",
        highlight ? "bg-primary/10" : "bg-background hover:bg-muted/50",
        className
      )}
    >
      <div className="flex items-center text-xs text-muted-foreground mb-0.5">
        {Icon && <Icon className={cn("w-3.5 h-3.5 mr-1.5", highlight ? "text-primary" : "text-accent")} />}
        <span className={cn("font-medium", labelClassName)}>{label}</span>
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-primary" : "text-foreground",
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  );
}
