import { Phone, StickyNote } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupBadge, StatusBadge } from "@/components/manager/StatusBadge";
import {
  appointmentDuration,
  appointmentTotal,
  guestServiceLabel,
  isGroup,
  technicianName,
  workingTechnicians,
  type Appointment,
  type AppointmentStatus,
  type BookingGuest,
} from "@/data/manager-mock";

type Action = { label: string; next: AppointmentStatus; variant?: "primary" | "quiet" | "danger" };

/** Only status-appropriate actions are offered. */
function actionsFor(status: AppointmentStatus): Action[] {
  switch (status) {
    case "Scheduled":
      return [
        { label: "Check In", next: "Checked In", variant: "primary" },
        { label: "Cancel", next: "Cancelled", variant: "danger" },
        { label: "No Show", next: "No Show", variant: "quiet" },
      ];
    case "Checked In":
      return [
        { label: "Move to Waiting", next: "Waiting", variant: "primary" },
        { label: "Start Service", next: "In Service", variant: "quiet" },
        { label: "Cancel", next: "Cancelled", variant: "danger" },
      ];
    case "Waiting":
    case "Assigned":
      return [
        { label: "Start Service", next: "In Service", variant: "primary" },
        { label: "Cancel", next: "Cancelled", variant: "danger" },
      ];
    case "In Service":
      return [{ label: "Complete", next: "Completed", variant: "primary" }];
    default:
      return [];
  }
}

function actionClass(variant: Action["variant"]) {
  if (variant === "primary") return "bg-primary text-primary-foreground hover:bg-sage-deep";
  if (variant === "danger")
    return "border border-border bg-status-off-bg text-status-off-fg hover:bg-status-off-bg/70";
  return "border border-border bg-card text-foreground hover:bg-secondary";
}

function GuestBlock({
  guest,
  showName,
  onStatus,
  onTechnician,
}: {
  guest: BookingGuest;
  showName: boolean;
  onStatus: (guestId: string, status: AppointmentStatus) => void;
  onTechnician: (guestId: string, technicianId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        {showName && <p className="text-sm font-extrabold text-foreground">{guest.name}</p>}
        <StatusBadge status={guest.status} className="ml-auto" />
      </div>
      <p className="mt-1 text-sm text-foreground">{guestServiceLabel(guest)}</p>
      <p className="text-xs text-muted-foreground">
        Technician: {technicianName(guest.technicianId)}
        {guest.startedAt ? ` · Started ${guest.startedAt}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {actionsFor(guest.status).map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onStatus(guest.id, action.next)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${actionClass(action.variant)}`}
          >
            {action.label}
          </button>
        ))}
        {actionsFor(guest.status).length === 0 && (
          <span className="text-xs text-muted-foreground">No actions for this status.</span>
        )}
      </div>

      <div className="mt-3">
        <label className="text-xs font-bold text-muted-foreground">Assign technician</label>
        <Select
          value={guest.technicianId}
          onValueChange={(value) => onTechnician(guest.id, value)}
        >
          <SelectTrigger className="mt-1 h-9 rounded-lg text-sm">
            <SelectValue placeholder="Any available" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any available</SelectItem>
            {workingTechnicians.map((technician) => (
              <SelectItem key={technician.id} value={technician.id}>
                {technician.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AppointmentDrawer({
  appointment,
  open,
  onOpenChange,
  onGuestStatus,
  onGuestTechnician,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestStatus: (appointmentId: string, guestId: string, status: AppointmentStatus) => void;
  onGuestTechnician: (appointmentId: string, guestId: string, technicianId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {appointment && (
          <>
            <SheetHeader className="gap-1 border-b border-border">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg">{appointment.title}</SheetTitle>
                {isGroup(appointment) && <GroupBadge count={appointment.guests.length} />}
              </div>
              <p className="text-sm text-muted-foreground">
                Today · {appointment.time} · {appointmentDuration(appointment)} min · $
                {appointmentTotal(appointment)} est.
              </p>
            </SheetHeader>

            <div className="space-y-4 p-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <p className="font-bold text-foreground">
                  Primary contact: {appointment.primaryContact}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" aria-hidden /> {appointment.phone}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Source: {appointment.source}
                  {isGroup(appointment) ? ` · ${appointment.guests.length} guests` : ""}
                </p>
                {appointment.notes && (
                  <p className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                    <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {appointment.notes}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-extrabold tracking-[0.12em] uppercase text-muted-foreground">
                  {isGroup(appointment) ? "Guests" : "Appointment"}
                </h3>
                {appointment.guests.map((guest) => (
                  <GuestBlock
                    key={guest.id}
                    guest={guest}
                    showName={isGroup(appointment)}
                    onStatus={(guestId, status) =>
                      onGuestStatus(appointment.id, guestId, status)
                    }
                    onTechnician={(guestId, technicianId) =>
                      onGuestTechnician(appointment.id, guestId, technicianId)
                    }
                  />
                ))}
              </div>

              <div className="flex gap-2 border-t border-border pt-4">
                <Button variant="outline" className="flex-1 rounded-lg" size="sm">
                  Edit appointment
                </Button>
                <Button variant="outline" className="flex-1 rounded-lg" size="sm">
                  Print ticket
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
