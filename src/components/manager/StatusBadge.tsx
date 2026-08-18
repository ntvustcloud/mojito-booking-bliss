import { cn } from "@/lib/utils";
import type { AppointmentStatus, BookingType, TechnicianState } from "@/data/manager-mock";

const APPOINTMENT_TONE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-status-info-bg text-status-info-fg",
  Cancelled: "bg-destructive/10 text-destructive",
};

const BOOKING_TONE: Record<BookingType, string> = {
  Appointment: "bg-status-info-bg text-status-info-fg",
  "Walk-In": "bg-status-warn-bg text-status-warn-fg",
};

const TECH_TONE: Record<TechnicianState, string> = {
  Available: "bg-status-live-bg text-status-live-fg",
  "In Service": "bg-status-info-bg text-status-info-fg",
  Break: "bg-status-warn-bg text-status-warn-fg",
  Off: "bg-status-neutral-bg text-status-neutral-fg",
};

const base =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap";

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return <span className={cn(base, APPOINTMENT_TONE[status], className)}>{status}</span>;
}

export function BookingTypeBadge({
  type,
  className,
}: {
  type: BookingType;
  className?: string;
}) {
  return <span className={cn(base, BOOKING_TONE[type], className)}>{type}</span>;
}

export function GroupBadge({ count }: { count: number }) {
  return (
    <span className={cn(base, "bg-secondary text-secondary-foreground")}>Group · {count}</span>
  );
}

export function TechStateBadge({
  state,
  className,
}: {
  state: TechnicianState;
  className?: string;
}) {
  return <span className={cn(base, TECH_TONE[state], className)}>{state}</span>;
}
