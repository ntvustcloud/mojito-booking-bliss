import { Phone, StickyNote, Undo2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingTypeBadge, GroupBadge, StatusBadge } from "@/components/manager/StatusBadge";
import { formatMinutes } from "@/data/schedule";
import {
  appointmentDuration,
  appointmentTotal,
  bookingType,
  guestScheduledMinutes,
  guestServiceLabel,
  isGroup,
  technicianName,
  workingTechnicians,
  type Appointment,
  type BookingGuest,
} from "@/data/manager-mock";

/**
 * Booking detail. Deliberately minimal: assign a technician, cancel, or
 * restore. There is no service lifecycle to maintain — the schedule itself
 * says who is busy and when.
 */

function GuestBlock({
  guest,
  showName,
  onCancel,
  onRestore,
  onTechnician,
}: {
  guest: BookingGuest;
  showName: boolean;
  onCancel: (guestId: string) => void;
  onRestore: (guestId: string) => void;
  onTechnician: (guestId: string, technicianId: string) => void;
}) {
  const cancelled = guest.status === "Cancelled";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        {showName && <p className="text-sm font-extrabold text-foreground">{guest.name}</p>}
        <StatusBadge status={guest.status} className="ml-auto" />
      </div>
      <p className="mt-1 text-sm text-foreground">{guestServiceLabel(guest)}</p>
      <p className="text-xs text-muted-foreground">
        {guestScheduledMinutes(guest)} min · Technician: {technicianName(guest.technicianId)}
        {guest.startMinutes !== undefined && guest.technicianId !== "any"
          ? ` · ${formatMinutes(guest.startMinutes)}`
          : ""}
      </p>

      <div className="mt-3">
        <label className="text-xs font-bold text-muted-foreground">Technician</label>
        <Select
          value={guest.technicianId}
          onValueChange={(value) => onTechnician(guest.id, value)}
        >
          <SelectTrigger className="mt-1 h-9 rounded-lg text-sm">
            <SelectValue placeholder="Any Available" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Available</SelectItem>
            {workingTechnicians.map((technician) => (
              <SelectItem key={technician.id} value={technician.id}>
                {technician.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3">
        {cancelled ? (
          <button
            type="button"
            onClick={() => onRestore(guest.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
          >
            <Undo2 className="size-3.5" aria-hidden />
            Restore booking
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCancel(guest.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
          >
            <X className="size-3.5" aria-hidden />
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}

export function AppointmentDrawer({
  appointment,
  open,
  onOpenChange,
  onCancelGuest,
  onRestoreGuest,
  onGuestTechnician,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelGuest: (appointmentId: string, guestId: string) => void;
  onRestoreGuest: (appointmentId: string, guestId: string) => void;
  onGuestTechnician: (appointmentId: string, guestId: string, technicianId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {appointment && (
          <>
            <SheetHeader className="gap-1 border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{appointment.title}</SheetTitle>
                <BookingTypeBadge type={bookingType(appointment)} />
                {isGroup(appointment) && <GroupBadge count={appointment.guests.length} />}
              </div>
              <p className="text-sm text-muted-foreground">
                {bookingType(appointment) === "Walk-In" ? "Checked in" : "Booked"}{" "}
                {appointment.time} · {appointmentDuration(appointment)} min · $
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
                  {isGroup(appointment) ? "Guests" : "Booking"}
                </h3>
                {appointment.guests.map((guest) => (
                  <GuestBlock
                    key={guest.id}
                    guest={guest}
                    showName={isGroup(appointment)}
                    onCancel={(guestId) => onCancelGuest(appointment.id, guestId)}
                    onRestore={(guestId) => onRestoreGuest(appointment.id, guestId)}
                    onTechnician={(guestId, technicianId) =>
                      onGuestTechnician(appointment.id, guestId, technicianId)
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
