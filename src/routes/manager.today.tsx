import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarOff, ChevronLeft, ChevronRight, Crosshair, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NeedsAttention } from "@/components/manager/NeedsAttention";
import { AppointmentDrawer } from "@/components/manager/AppointmentDrawer";
import {
  QuickBookingDialog,
  type QuickBookingDraft,
  type QuickBookingSeed,
} from "@/components/manager/QuickBookingDialog";
import { BlockTimeDialog, type BlockTimeSeed } from "@/components/manager/BlockTimeDialog";
import { ColorGuide } from "@/components/manager/schedule/ColorGuide";

import { ScheduleBoard, type MoveRequest } from "@/components/manager/schedule/ScheduleBoard";
import {
  buildBlocks,
  formatMinutes,
  isWaitingNow,
  snapToSlot,
} from "@/data/schedule";
import {
  initialTurnEvents,
  technicianBlockouts as seedBlockouts,
  technicianCheckIns,
  technicianName,
  todayAppointments,
  type Appointment,
  type BookingGuest,
  type TechnicianBlockout,
} from "@/data/manager-mock";
import { technicianRows } from "@/data/technician-state";
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
      {
        property: "og:description",
        content: "Live technician schedule board for Mojito Nail Salon.",
      },
    ],
  }),
  component: TodayBoard,
});

function TodayBoard() {
  // Mock local state — replace with shared salon data later.
  const [appointments, setAppointments] = useState<Appointment[]>(todayAppointments);
  const [blockouts, setBlockouts] = useState<TechnicianBlockout[]>(seedBlockouts);
  const [turnEvents, setTurnEvents] = useState<TurnEvent[]>(initialTurnEvents);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSeed, setBookingSeed] = useState<QuickBookingSeed | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSeed, setBlockSeed] = useState<BlockTimeSeed | null>(null);
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

  const boardNow = dayOffset === 0 ? nowMinutes : null;
  const rows = useMemo(
    () => technicianRows(appointments, blockouts, boardNow),
    [appointments, blockouts, boardNow],
  );

  /** Everything on the top bar is inferred from the schedule + the clock. */
  const stats = useMemo(() => {
    const blocks = buildBlocks(appointments);
    return {
      total: appointments.length,
      waiting: blocks.filter((block) => isWaitingNow(block, boardNow)).length,
      inService: rows.filter((row) => row.state === "In Service").length,
      availableTechs: rows.filter((row) => row.state === "Available").length,
    };
  }, [appointments, rows, boardNow]);

  const active = appointments.find((appointment) => appointment.id === openId) ?? null;

  /** `startMinutes: undefined` clears a placement (card returns to its anchor). */
  type GuestPatch = Omit<Partial<BookingGuest>, "startMinutes"> & {
    startMinutes?: number | undefined;
  };

  function updateGuest(appointmentId: string, guestId: string, patch: GuestPatch) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id !== appointmentId
          ? appointment
          : {
              ...appointment,
              guests: appointment.guests.map((guest) => {
                if (guest.id !== guestId) return guest;
                const next: BookingGuest = { ...guest, ...patch } as BookingGuest;
                if ("startMinutes" in patch && patch.startMinutes === undefined) {
                  delete next.startMinutes;
                }
                return next;
              }),
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
    const previous: GuestPatch = {
      technicianId: block.technicianId,
      startMinutes: block.technicianId === "any" ? undefined : block.start,
    };
    // Dropping back to Waiting clears the placement so the card returns to its
    // original anchor time.
    updateGuest(
      block.appointmentId,
      block.guestId,
      technicianId === "any"
        ? { technicianId: "any", startMinutes: undefined }
        : { technicianId, startMinutes: start },
    );
    const turnId = recordTurn(
      technicianId,
      block.guestName,
      block.requestedTechnicianId,
      block.source,
      start,
    );
    toast.success(
      technicianId === "any"
        ? `${block.guestName} moved back to Waiting / Unassigned (${formatMinutes(block.anchor)})`
        : `${block.guestName} assigned to ${technicianName(technicianId)} at ${formatMinutes(start)}`,
      {
        duration: 6000,
        ...(technicianId !== "any"
          ? {
              description:
                block.requestedTechnicianId === technicianId
                  ? `Requested technician · +0.5 turn`
                  : `Salon assigned · +1.0 turn`,
            }
          : {}),
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

  /** One creation path for walk-ins and appointments. */
  function handleBooking(draft: QuickBookingDraft) {
    const id = `bk-${Date.now()}`;
    const minutes = snapToSlot(draft.startMinutes);
    const name = draft.name.trim() || (draft.type === "Walk-In" ? "Walk-In Guest" : "New Booking");
    const assigned = draft.technicianId !== "any";
    setAppointments((current) => [
      ...current,
      {
        id,
        time: formatMinutes(minutes),
        minutes,
        title: name,
        primaryContact: name,
        phone: draft.phone.trim() || "—",
        ...(draft.note.trim() ? { notes: draft.note.trim() } : {}),
        source: draft.type === "Walk-In" ? "Walk-In" : "Phone",
        guests: [
          {
            id: `${id}-g`,
            name,
            serviceIds: draft.serviceIds,
            technicianId: draft.technicianId,
            status: "Scheduled",
            ...(assigned ? { startMinutes: minutes } : {}),
          },
        ],
      },
    ]);
    if (assigned) {
      recordTurn(
        draft.technicianId,
        name,
        undefined,
        draft.type === "Walk-In" ? "Walk-In" : "Phone",
        minutes,
      );
    }
    toast.success(
      assigned
        ? `${name} added with ${technicianName(draft.technicianId)} at ${formatMinutes(minutes)}`
        : `${name} added to Waiting / Unassigned (${formatMinutes(minutes)})`,
    );
  }

  function saveBlockout(blockout: TechnicianBlockout) {
    setBlockouts((current) => {
      const exists = current.some((item) => item.id === blockout.id);
      return exists
        ? current.map((item) => (item.id === blockout.id ? blockout : item))
        : [...current, blockout];
    });
    toast.success(
      `${blockout.label} for ${technicianName(blockout.technicianId)} · ${formatMinutes(blockout.start)}–${formatMinutes(blockout.end)}`,
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
            {stats.total} Bookings
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.waiting} Waiting
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.inService} In Service
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {stats.availableTechs} Available Techs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ColorGuide />
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setBlockSeed({ start: snapToSlot(nowMinutes ?? 9 * 60) });
              setBlockOpen(true);
            }}
          >
            <CalendarOff className="size-4" aria-hidden />
            Block Time
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={() => {
              setBookingSeed(null);
              setBookingOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </header>

      <div className="mt-3">
        <NeedsAttention
          appointments={appointments}
          nowMinutes={boardNow}
          onOpen={(id) => setOpenId(id)}
        />
      </div>

      <div className="mt-3">
        <ScheduleBoard
          appointments={appointments}
          technicians={rows}
          blockouts={blockouts}
          turnEvents={turnEvents}
          checkIns={technicianCheckIns}
          registerScrollToNow={registerScrollToNow}
          nowMinutes={boardNow}
          onOpenAppointment={(id) => setOpenId(id)}
          onMove={handleMove}
          onCreateAt={(technicianId, start) => {
            setBookingSeed({ technicianId, start });
            setBookingOpen(true);
          }}
          onEditBlockTime={(blockout) => {
            setBlockSeed({ blockout });
            setBlockOpen(true);
          }}
        />
      </div>

      <AppointmentDrawer
        appointment={active}
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        onCancelGuest={(appointmentId, guestId) =>
          updateGuest(appointmentId, guestId, { status: "Cancelled" })
        }
        onRestoreGuest={(appointmentId, guestId) =>
          updateGuest(appointmentId, guestId, { status: "Scheduled" })
        }
        onGuestTechnician={(appointmentId, guestId, technicianId) =>
          updateGuest(
            appointmentId,
            guestId,
            technicianId === "any" ? { technicianId, startMinutes: undefined } : { technicianId },
          )
        }
      />

      <QuickBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        seed={bookingSeed}
        nowMinutes={nowMinutes}
        onSubmit={handleBooking}
      />

      <BlockTimeDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        seed={blockSeed}
        onSave={saveBlockout}
        onDelete={(id) => {
          setBlockouts((current) => current.filter((item) => item.id !== id));
          toast.success("Block time removed");
        }}
      />
    </div>
  );
}
