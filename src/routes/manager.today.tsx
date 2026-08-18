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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildBlocks,
  findConflict,
  formatMinutes,
  isWaitingNow,
  snapToSlot,
  type ScheduleBlock,
} from "@/data/schedule";
import {
  formatServiceMoney,
  guestServiceValue,
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
  const [pendingMove, setPendingMove] = useState<MoveRequest | null>(null);
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

  /**
   * Turn + Service ledger. Every assignment writes ONE event keyed by
   * `appointmentId:guestId`, so reassigning, unassigning, cancelling or undoing
   * simply drops that event — totals can never double-count or drift.
   */
  function recordAssignment(
    block: ScheduleBlock,
    technicianId: string,
    atMinutes: number,
  ): void {
    const guestKey = `${block.appointmentId}:${block.guestId}`;
    setTurnEvents((current) => {
      const cleaned = current.filter((event) => event.guestKey !== guestKey);
      if (technicianId === "any") return cleaned;
      const { value, kind } = turnValueFor(technicianId, block.requestedTechnicianId, block.source);
      return [
        ...cleaned,
        {
          id: `turn-${technicianId}-${guestKey}`,
          technicianId,
          atMinutes,
          kind,
          value,
          serviceValue: block.serviceValue,
          guestKey,
          guestName: block.guestName,
          serviceLabel: block.serviceLabel,
          label:
            kind === "Requested"
              ? `${block.guestName} — requested technician`
              : kind === "Walk-In"
                ? `${block.guestName} — walk-in`
                : `${block.guestName} — salon assigned`,
        },
      ];
    });
  }

  /** Drop every fairness event tied to one guest (cancel / restore flows). */
  function clearGuestEvents(appointmentId: string, guestId: string) {
    setTurnEvents((current) =>
      current.filter((event) => event.guestKey !== `${appointmentId}:${guestId}`),
    );
  }

  /** Applies a move and offers Undo restoring BOTH schedule and ledger. */
  function applyMove(request: MoveRequest) {
    const { block, technicianId, start } = request;
    const previousAppointments = appointments;
    const previousEvents = turnEvents;

    updateGuest(
      block.appointmentId,
      block.guestId,
      technicianId === "any"
        ? { technicianId: "any", startMinutes: undefined }
        : { technicianId, startMinutes: start },
    );
    recordAssignment(block, technicianId, start);

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
                  ? `Requested technician · +0.5 turn · ${formatServiceMoney(block.serviceValue)} service`
                  : `Salon assigned · +1.0 turn · ${formatServiceMoney(block.serviceValue)} service`,
            }
          : { description: "Turn and service credit released" }),
        action: {
          label: "Undo",
          onClick: () => {
            setAppointments(previousAppointments);
            setTurnEvents(previousEvents);
            toast.info(`${block.guestName} move undone`);
          },
        },
      },
    );
  }

  /** Reassigning or unassigning an already-placed guest always asks first. */
  function handleMove(request: MoveRequest) {
    if (request.kind === "reassign" || request.kind === "unassign") {
      setPendingMove(request);
      return;
    }
    applyMove(request);
  }

  function adjustBlockout(blockout: TechnicianBlockout, start: number, end: number) {
    const conflict = findConflict(
      buildBlocks(appointments),
      blockout.technicianId,
      start,
      end - start,
      "",
    );
    if (conflict) {
      toast.error(
        `Can't cover ${conflict.guestName} at ${formatMinutes(conflict.start)} with block time. Move that appointment first.`,
      );
      return;
    }
    setBlockouts((current) =>
      current.map((item) => (item.id === blockout.id ? { ...item, start, end } : item)),
    );
    toast.success(
      `${blockout.label} · ${formatMinutes(start)}–${formatMinutes(end)} for ${technicianName(blockout.technicianId)}`,
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
      const serviceValue = guestServiceValue({
        id: `${id}-g`,
        name,
        serviceIds: draft.serviceIds,
        technicianId: draft.technicianId,
        status: "Scheduled",
      });
      const { value, kind } = turnValueFor(
        draft.technicianId,
        undefined,
        draft.type === "Walk-In" ? "Walk-In" : "Phone",
      );
      setTurnEvents((current) => [
        ...current,
        {
          id: `turn-${draft.technicianId}-${id}-g`,
          technicianId: draft.technicianId,
          atMinutes: minutes,
          kind,
          value,
          serviceValue,
          guestKey: `${id}:${id}-g`,
          guestName: name,
          label: kind === "Walk-In" ? `${name} — walk-in` : `${name} — salon assigned`,
        },
      ]);
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
          onAdjustBlockTime={adjustBlockout}
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
        onCancelGuest={(appointmentId, guestId) => {
          updateGuest(appointmentId, guestId, { status: "Cancelled" });
          // Cancelling releases the technician's turn and service credit.
          clearGuestEvents(appointmentId, guestId);
        }}
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

      {/* Reassignment safety: moving a placed guest always asks first. */}
      <AlertDialog open={Boolean(pendingMove)} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMove?.kind === "unassign"
                ? "Move back to Waiting / Unassigned?"
                : "Reassign this customer?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove &&
                (pendingMove.kind === "unassign"
                  ? `${pendingMove.block.guestName} leaves ${technicianName(pendingMove.block.technicianId)} and returns to ${formatMinutes(pendingMove.block.anchor)} in the queue. That turn and ${formatServiceMoney(pendingMove.block.serviceValue)} of service credit are released.`
                  : `${pendingMove.block.guestName} moves from ${technicianName(pendingMove.block.technicianId)} to ${technicianName(pendingMove.technicianId)} at ${formatMinutes(pendingMove.start)}. The turn and ${formatServiceMoney(pendingMove.block.serviceValue)} of service credit move with the customer.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep as is</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg"
              onClick={() => {
                if (pendingMove) applyMove(pendingMove);
                setPendingMove(null);
              }}
            >
              {pendingMove?.kind === "unassign" ? "Move to Waiting" : "Reassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
