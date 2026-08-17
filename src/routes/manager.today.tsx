import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Crosshair, Plus, UserPlus } from "lucide-react";
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
import { NeedsAttention } from "@/components/manager/NeedsAttention";
import { AppointmentDrawer } from "@/components/manager/AppointmentDrawer";
import { WalkInDialog, type WalkInDraft } from "@/components/manager/WalkInDialog";
import {
  ScheduleBoard,
  type MoveRequest,
} from "@/components/manager/schedule/ScheduleBoard";
import { formatMinutes, snapToSlot } from "@/data/schedule";
import {
  initialTurnEvents,
  technicianBlockouts,
  technicianCheckIns,
  technicianName,
  technicianRows,
  technicianShifts,
  todayAppointments,
  type Appointment,
} from "@/data/manager-mock";
import { turnValueFor, type TurnEvent } from "@/data/turn-system";

export const Route = createFileRoute("/manager/today")({
  head: () => ({
    meta: [
      { title: "Today — Mojito Manager Portal" },
      {
        name: "description",
        content:
          "Live technician schedule board: who is working, who is available, who is waiting and where the day has open capacity.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Today — Mojito Manager Portal" },
      { property: "og:description", content: "Live technician schedule board for Mojito Nail Salon." },
    ],
  }),
  component: TodayBoard,
});

function TodayBoard() {
  // Mock local state — replace with shared salon data later.
  const [appointments, setAppointments] = useState<Appointment[]>(todayAppointments);
  const [turnEvents, setTurnEvents] = useState<TurnEvent[]>(initialTurnEvents);
  const [openId, setOpenId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [newSlot, setNewSlot] = useState<{ technicianId: string; start: number } | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const scrollToNowRef = useRef<(() => void) | null>(null);
  const [canScrollToNow, setCanScrollToNow] = useState(false);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [dateLabel, setDateLabel] = useState("");

  // Client-only clock (keeps SSR markup stable) that advances the time line.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    setDateLabel(
      date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    );
  }, [dayOffset]);

  const rows = useMemo(() => technicianRows(appointments, technicianShifts), [appointments]);

  const stats = useMemo(() => {
    const guests = appointments.flatMap((appointment) => appointment.guests);
    return {
      total: appointments.length,
      waiting: guests.filter((guest) => ["Waiting", "Checked In"].includes(guest.status)).length,
      inService: guests.filter((guest) => guest.status === "In Service").length,
      availableTechs: rows.filter((row) => row.state === "Available").length,
    };
  }, [appointments, rows]);

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

  /** Turn ledger only changes when a customer is actually accepted by a tech. */
  function recordTurn(
    technicianId: string,
    guestName: string,
    requestedTechnicianId: string | undefined,
    source: Appointment["source"],
    atMinutes: number,
  ): string | null {
    if (technicianId === "any") return null;
    const { value, kind } = turnValueFor(technicianId, requestedTechnicianId, source);
    const id = `turn-${technicianId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTurnEvents((current) => [
      ...current,
      {
        id,
        technicianId,
        atMinutes,
        kind,
        value,
        label:
          kind === "Requested"
            ? `${guestName} requested ${technicianName(technicianId)}`
            : kind === "Walk-In"
              ? `${guestName} — walk-in`
              : `${guestName} — salon assigned`,
      },
    ]);
    return id;
  }

  function handleMove(request: MoveRequest) {
    const { block, technicianId, start } = request;
    const previous = {
      technicianId: block.technicianId,
      startMinutes: block.start,
      status: block.status,
    };
    updateGuest(block.appointmentId, block.guestId, {
      technicianId,
      startMinutes: start,
      ...(technicianId !== "any" && block.status === "Waiting"
        ? { status: "Assigned" as const }
        : {}),
      ...(technicianId === "any" ? { status: "Waiting" as const } : {}),
    });
    const turnId = recordTurn(
      technicianId,
      block.guestName,
      block.requestedTechnicianId,
      block.source,
      start,
    );
    toast.success(
      technicianId === "any"
        ? `${block.guestName} moved back to waiting`
        : `${block.guestName} assigned to ${technicianName(technicianId)} at ${formatMinutes(start)}`,
      {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            updateGuest(block.appointmentId, block.guestId, previous);
            if (turnId) setTurnEvents((current) => current.filter((event) => event.id !== turnId));
            toast.info(`${block.guestName} move undone`);
          },
        },
      },
    );
  }

  const registerScrollToNow = useCallback((scrollToNow: (() => void) | null) => {
    scrollToNowRef.current = scrollToNow;
    setCanScrollToNow(Boolean(scrollToNow));
  }, []);

  function handleWalkIn(draft: WalkInDraft) {
    const now = new Date();
    const id = `walkin-${now.getTime()}`;
    const minutes = snapToSlot(now.getHours() * 60 + now.getMinutes());
    const name = draft.name.trim() || "Walk-In Guest";
    setAppointments((current) => [
      ...current,
      {
        id,
        time: formatMinutes(minutes),
        minutes,
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
            startMinutes: minutes,
          },
        ],
      },
    ]);
    if (draft.technicianId !== "any") {
      recordTurn(draft.technicianId, name, undefined, "Walk-In", minutes);
    }
    toast.success(
      draft.technicianId === "any"
        ? `${name} added to waiting`
        : `${name} assigned to ${technicianName(draft.technicianId)} · +1.0 turn`,
    );
  }

  return (
    <div className="min-w-0 flex-1 p-3 lg:p-4">
      {/* Compact operational top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">Today</h1>
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => setDayOffset((value) => value - 1)}
                className="rounded-l-lg px-1.5 py-1 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="min-w-[9.5rem] px-2 text-center text-xs font-bold text-foreground">
                {dateLabel || "\u00a0"}
              </span>
              <button
                type="button"
                aria-label="Next day"
                onClick={() => setDayOffset((value) => value + 1)}
                className="rounded-r-lg px-1.5 py-1 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            {dayOffset === 0 && canScrollToNow && (
              <Button
                variant="outline"
                className="h-8 rounded-lg px-2 text-xs"
                onClick={() => scrollToNowRef.current?.()}
              >
                <Crosshair className="size-3.5" aria-hidden />
                Now
              </Button>
            )}
            {dayOffset !== 0 && (
              <Button
                variant="ghost"
                className="h-8 rounded-lg text-xs"
                onClick={() => setDayOffset(0)}
              >
                Go to today
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-foreground sm:text-sm">
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
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => setWalkInOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Walk-In
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={() => {
              setNewSlot(null);
              setAppointmentOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Appointment
          </Button>
        </div>
      </header>

      <div className="mt-3">
        <NeedsAttention appointments={appointments} onOpen={(id) => setOpenId(id)} />
      </div>

      <div className="mt-3">
        <ScheduleBoard
          appointments={appointments}
          technicians={rows}
          blockouts={technicianBlockouts}
          turnEvents={turnEvents}
          checkIns={technicianCheckIns}
          registerScrollToNow={registerScrollToNow}
          nowMinutes={dayOffset === 0 ? nowMinutes : null}
          onOpenAppointment={(id) => setOpenId(id)}
          onMove={handleMove}
          onCreateAt={(technicianId, start) => {
            setNewSlot({ technicianId, start });
            setAppointmentOpen(true);
          }}
        />
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
              {newSlot
                ? `Pre-filled for ${technicianName(newSlot.technicianId)} at ${formatMinutes(newSlot.start)}. Full booking (customer, services, guests) comes next — walk-ins can be added right now.`
                : "Full appointment booking (customer, date, time, guests) comes next. Walk-ins can be added right now."}
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
