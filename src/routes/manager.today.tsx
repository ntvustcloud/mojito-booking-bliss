import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GroupBadge, StatusBadge } from "@/components/manager/StatusBadge";
import { NeedsAttention } from "@/components/manager/NeedsAttention";
import { TechnicianBoard } from "@/components/manager/TechnicianBoard";
import { AppointmentDrawer } from "@/components/manager/AppointmentDrawer";
import { WalkInDialog, type WalkInDraft } from "@/components/manager/WalkInDialog";
import {
  appointmentServiceLabel,
  appointmentStatus,
  appointmentTechnicianLabel,
  isGroup,
  technicianShifts,
  todayAppointments,
  type Appointment,
  type AppointmentStatus,
} from "@/data/manager-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manager/today")({
  head: () => ({
    meta: [
      { title: "Today — Mojito Manager Portal" },
      {
        name: "description",
        content:
          "Live salon board: who is coming today, who is waiting, who is in service and which technicians are free.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Today — Mojito Manager Portal" },
      { property: "og:description", content: "Live operational board for Mojito Nail Salon." },
    ],
  }),
  component: TodayBoard,
});

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "Scheduled",
  "Checked In",
  "Waiting",
  "Assigned",
  "In Service",
];

function TodayBoard() {
  // Mock local state — replace with shared salon data later.
  const [appointments, setAppointments] = useState<Appointment[]>(todayAppointments);
  const [openId, setOpenId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.minutes - b.minutes),
    [appointments],
  );

  const stats = useMemo(() => {
    const guests = appointments.flatMap((appointment) => appointment.guests);
    return {
      total: appointments.length,
      waiting: guests.filter((guest) => ["Waiting", "Checked In"].includes(guest.status)).length,
      inService: guests.filter((guest) => guest.status === "In Service").length,
      availableTechs: technicianShifts.filter((shift) => shift.state === "Available").length,
    };
  }, [appointments]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const active = appointments.find((appointment) => appointment.id === openId) ?? null;

  function updateGuest(
    appointmentId: string,
    guestId: string,
    patch: Partial<Appointment["guests"][number]>,
  ) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id !== appointmentId
          ? appointment
          : {
              ...appointment,
              guests: appointment.guests.map((guest) =>
                guest.id === guestId ? { ...guest, ...patch } : guest,
              ),
            },
      ),
    );
  }

  function handleWalkIn(draft: WalkInDraft) {
    const now = new Date();
    const id = `walkin-${now.getTime()}`;
    const label = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const name = draft.name.trim() || "Walk-In Guest";
    setAppointments((current) => [
      ...current,
      {
        id,
        time: label,
        minutes: now.getHours() * 60 + now.getMinutes(),
        title: name,
        primaryContact: name,
        phone: draft.phone.trim() || "—",
        source: "Walk-In",
        guests: [
          {
            id: `${id}-g`,
            name,
            serviceIds: draft.serviceIds,
            technicianId: draft.technicianId,
            status: draft.technicianId === "any" ? "Waiting" : "Assigned",
          },
        ],
      },
    ]);
    toast.success(`${name} added to waiting`);
  }

  return (
    <div className="min-w-0 flex-1 p-3 lg:p-5">
      {/* Header + operational stats */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-[1.75rem]">Today</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {stats.total} Appointments
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.waiting} Waiting
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.inService} In Service
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.availableTechs} Available Techs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => setWalkInOpen(true)}
          >
            <UserPlus className="size-4" aria-hidden />
            Walk-In
          </Button>
          <Button className="h-9 rounded-lg" onClick={() => setAppointmentOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Appointment
          </Button>
        </div>
      </header>

      <div className="mt-4">
        <NeedsAttention appointments={sorted} onOpen={(id) => setOpenId(id)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Today's appointments */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <h2 className="text-xs font-extrabold tracking-[0.12em] uppercase text-muted-foreground">
              Today's appointments
            </h2>
            <span className="text-xs font-bold text-muted-foreground">
              {sorted.filter((a) => ACTIVE_STATUSES.includes(appointmentStatus(a))).length} active
            </span>
          </div>

          <div className="hidden grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1.2fr)_7rem_7rem] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-extrabold tracking-wide uppercase text-muted-foreground sm:grid">
            <span>Time</span>
            <span>Customer</span>
            <span>Services</span>
            <span>Technician</span>
            <span>Status</span>
          </div>

          <ul className="divide-y divide-border">
            {sorted.map((appointment) => {
              const group = isGroup(appointment);
              return (
                <li key={appointment.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(appointment.id)}
                    className={cn(
                      "grid w-full grid-cols-1 gap-1 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50",
                      "sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1.2fr)_7rem_7rem] sm:items-center sm:gap-3",
                    )}
                  >
                    <span className="text-sm font-bold text-foreground">{appointment.time}</span>
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {appointment.title}
                    </span>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {appointmentServiceLabel(appointment)}
                    </span>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {appointmentTechnicianLabel(appointment)}
                    </span>
                    <span className="flex">
                      {group ? (
                        <GroupBadge count={appointment.guests.length} />
                      ) : (
                        <StatusBadge status={appointmentStatus(appointment)} />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <TechnicianBoard appointments={sorted} shifts={technicianShifts} />
      </div>

      <AppointmentDrawer
        appointment={active}
        open={Boolean(active)}
        onOpenChange={(open) => !open && setOpenId(null)}
        onGuestStatus={(appointmentId, guestId, status) =>
          updateGuest(appointmentId, guestId, {
            status,
            ...(status === "In Service"
              ? {
                  startedAt: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                }
              : {}),
          })
        }
        onGuestTechnician={(appointmentId, guestId, technicianId) =>
          updateGuest(appointmentId, guestId, { technicianId })
        }
      />

      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} onSubmit={handleWalkIn} />

      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New appointment</DialogTitle>
            <DialogDescription>
              Full appointment booking (customer, date, time, guests) comes next. Walk-ins can be
              added right now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setAppointmentOpen(false)}
            >
              Close
            </Button>
            <Button
              className="rounded-lg"
              onClick={() => {
                setAppointmentOpen(false);
                setWalkInOpen(true);
              }}
            >
              Add a walk-in instead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
