import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarOff,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppointmentDrawer } from "@/components/manager/AppointmentDrawer";
import {
  QuickBookingDialog,
  type QuickBookingDraft,
  type QuickBookingSeed,
} from "@/components/manager/QuickBookingDialog";
import { BlockTimeDialog, type BlockTimeSeed } from "@/components/manager/BlockTimeDialog";
import { ScheduleBoard, type MoveRequest } from "@/components/manager/schedule/ScheduleBoard";
import {
  buildBlocks,
  findConflict,
  formatMinutes,
  snapToSlot,
} from "@/data/schedule";
import { technicianName, type TechnicianBlockout } from "@/data/manager-mock";
import { technicianRows } from "@/data/technician-state";
import {
  TODAY_KEY,
  addDaysKey,
  addMonthsKey,
  appointmentsOn,
  blockoutsOn,
  dayLoad,
  formatDateKey,
  formatDayShort,
  formatMonthLabel,
  isSameMonth,
  isTodayKey,
  monthGridKeys,
  offShiftBlockouts,
  weekKeys,
  type DateKey,
  type DayLoad,
} from "@/data/calendar";
import {
  clearGuestEvents,
  setAppointments,
  setBlockouts,
  updateGuest,
  useScheduleState,
} from "@/data/schedule-store";
import { cn } from "@/lib/utils";

/**
 * Manager Calendar — future planning on the SAME scheduling engine as
 * `/manager/today`. Day View reuses `ScheduleBoard` in planning mode, so the
 * time grid, overlap lanes, block time, drag-and-drop and Quick Booking form
 * behave identically. Week and Month views are capacity summaries built from
 * the same bookings.
 */

export const Route = createFileRoute("/manager/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Mojito Manager Portal" },
      {
        name: "description",
        content:
          "Plan future salon days: weekly capacity, month load at a glance and the same drag-and-drop day board used on the live floor.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Calendar — Mojito Manager Portal" },
      {
        property: "og:description",
        content: "Future capacity planning for Mojito Nail Salon.",
      },
    ],
  }),
  component: CalendarPage,
});

type ViewMode = "day" | "week" | "month";
const VIEW_KEY = "mojito-calendar-view";

const loadTone = (load: DayLoad) => {
  if (load.closed) return "bg-muted";
  if (load.load >= 0.85) return "bg-status-warn-fg";
  if (load.load >= 0.5) return "bg-primary";
  return "bg-primary/40";
};

function CalendarPage() {
  const schedule = useScheduleState();
  const [view, setView] = useState<ViewMode>("week");
  const [selected, setSelected] = useState<DateKey>(TODAY_KEY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSeed, setBookingSeed] = useState<QuickBookingSeed | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSeed, setBlockSeed] = useState<BlockTimeSeed | null>(null);

  // Remember the chosen view for the session (front desk keeps its habit).
  useEffect(() => {
    const stored = window.sessionStorage.getItem(VIEW_KEY);
    if (stored === "day" || stored === "week" || stored === "month") setView(stored);
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const dayAppointments = useMemo(
    () => appointmentsOn(schedule.appointments, selected),
    [schedule.appointments, selected],
  );

  /** Stored block time plus off-shift stretches expressed as block time. */
  const dayBlockouts = useMemo(
    () => [...blockoutsOn(schedule.blockouts, selected), ...offShiftBlockouts(selected)],
    [schedule.blockouts, selected],
  );

  const rows = useMemo(
    () => technicianRows(dayAppointments, dayBlockouts, null),
    [dayAppointments, dayBlockouts],
  );

  const week = useMemo(() => weekKeys(selected), [selected]);
  const weekLoads = useMemo(
    () => week.map((key) => dayLoad(key, schedule.appointments, schedule.blockouts)),
    [week, schedule.appointments, schedule.blockouts],
  );
  const monthGrid = useMemo(() => monthGridKeys(selected), [selected]);
  const monthLoads = useMemo(
    () => monthGrid.map((key) => dayLoad(key, schedule.appointments, schedule.blockouts)),
    [monthGrid, schedule.appointments, schedule.blockouts],
  );

  const active = dayAppointments.find((appointment) => appointment.id === openId) ?? null;
  const past = selected < TODAY_KEY;

  function step(direction: 1 | -1) {
    setSelected((current) =>
      view === "month"
        ? addMonthsKey(current, direction)
        : addDaysKey(current, direction * (view === "week" ? 7 : 1)),
    );
  }

  /**
   * Same move semantics as the live board — but a future placement is only a
   * reservation, so no turn or service credit is written here. Credit is earned
   * on the day the work happens.
   */
  function handleMove(request: MoveRequest) {
    const { block, technicianId, start } = request;
    const previous = schedule.appointments;
    updateGuest(
      block.appointmentId,
      block.guestId,
      technicianId === "any"
        ? { technicianId: "any", startMinutes: undefined }
        : { technicianId, startMinutes: start },
    );
    toast.success(
      technicianId === "any"
        ? `${block.guestName} moved back to Unassigned (${formatMinutes(block.anchor)})`
        : `${block.guestName} booked with ${technicianName(technicianId)} at ${formatMinutes(start)}`,
      {
        duration: 6000,
        description: `${formatDateKey(selected, { weekday: "long", month: "short", day: "numeric" })} · reserved time only`,
        action: {
          label: "Undo",
          onClick: () => {
            setAppointments(previous);
            toast.info(`${block.guestName} move undone`);
          },
        },
      },
    );
  }

  function handleBooking(draft: QuickBookingDraft) {
    const id = `bk-${Date.now()}`;
    const minutes = snapToSlot(draft.startMinutes);
    const name = draft.name.trim() || "New Booking";
    const assigned = draft.technicianId !== "any";
    setAppointments((current) => [
      ...current,
      {
        id,
        time: formatMinutes(minutes),
        minutes,
        date: draft.dateKey,
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
    setSelected(draft.dateKey);
    toast.success(
      `${name} booked ${formatDateKey(draft.dateKey, { weekday: "short", month: "short", day: "numeric" })} at ${formatMinutes(minutes)}${
        assigned ? ` with ${technicianName(draft.technicianId)}` : " · needs a technician"
      }`,
    );
  }

  function saveBlockout(blockout: TechnicianBlockout) {
    const dated: TechnicianBlockout = { ...blockout, date: selected };
    setBlockouts((current) => {
      const exists = current.some((item) => item.id === dated.id);
      return exists
        ? current.map((item) => (item.id === dated.id ? dated : item))
        : [...current, dated];
    });
    toast.success(
      `${dated.label} for ${technicianName(dated.technicianId)} · ${formatDateKey(selected, { month: "short", day: "numeric" })} ${formatMinutes(dated.start)}–${formatMinutes(dated.end)}`,
    );
  }

  function adjustBlockout(blockout: TechnicianBlockout, start: number, end: number) {
    const conflict = findConflict(
      buildBlocks(dayAppointments),
      blockout.technicianId,
      start,
      end - start,
      "",
    );
    if (conflict) {
      toast.error(
        `Can't cover ${conflict.guestName} at ${formatMinutes(conflict.start)} with block time. Move that booking first.`,
      );
      return;
    }
    setBlockouts((current) =>
      current.map((item) => (item.id === blockout.id ? { ...item, start, end } : item)),
    );
  }

  const rangeLabel =
    view === "month"
      ? formatMonthLabel(selected)
      : view === "week"
        ? `${formatDateKey(week[0]!, { month: "short", day: "numeric" })} – ${formatDateKey(week[6]!, { month: "short", day: "numeric" })}`
        : formatDateKey(selected);

  return (
    <div className="min-w-0 flex-1 p-3 lg:p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">Calendar</h1>
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                aria-label="Previous"
                className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => step(-1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next"
                className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => step(1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            <Button
              variant="outline"
              className="h-8 rounded-lg text-xs"
              onClick={() => setSelected(TODAY_KEY)}
            >
              Today
            </Button>
          </div>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            {rangeLabel}
            {past && " · past day (view only planning data)"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-extrabold capitalize transition-colors",
                  view === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <Input
            type="date"
            aria-label="Jump to date"
            value={selected}
            onChange={(event) => event.target.value && setSelected(event.target.value)}
            className="h-9 w-[9.5rem] rounded-lg"
          />
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setBlockSeed({ start: 12 * 60 });
              setBlockOpen(true);
            }}
          >
            <CalendarOff className="size-4" aria-hidden />
            Block Time
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={() => {
              setBookingSeed({ dateKey: selected, type: "Appointment" });
              setBookingOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </header>

      {view === "day" && (
        <div className="mt-3">
          <ScheduleBoard
            appointments={dayAppointments}
            technicians={rows}
            blockouts={dayBlockouts}
            turnEvents={schedule.turnEvents}
            checkIns={[]}
            planning={!isTodayKey(selected)}
            nowMinutes={isTodayKey(selected) ? null : null}
            onOpenAppointment={(id) => setOpenId(id)}
            onMove={handleMove}
            onCreateAt={(technicianId, start) => {
              setBookingSeed({ technicianId, start, dateKey: selected, type: "Appointment" });
              setBookingOpen(true);
            }}
            onAdjustBlockTime={adjustBlockout}
            onEditBlockTime={(blockout) => {
              setBlockSeed({ blockout });
              setBlockOpen(true);
            }}
          />
        </div>
      )}

      {view === "week" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {weekLoads.map((load) => (
            <button
              key={load.key}
              type="button"
              onClick={() => {
                setSelected(load.key);
                setView("day");
              }}
              className={cn(
                "rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50",
                isTodayKey(load.key) && "border-primary/60 ring-1 ring-primary/30",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold text-foreground">
                  {formatDayShort(load.key)}
                </p>
                <span className="text-[11px] font-extrabold text-muted-foreground">
                  {load.closed ? "Closed" : `${Math.round(load.load * 100)}% full`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", loadTone(load))}
                  style={{ width: `${Math.max(load.closed ? 0 : 4, load.load * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {load.bookings} booking{load.bookings === 1 ? "" : "s"} · {load.workingTechs}{" "}
                technician{load.workingTechs === 1 ? "" : "s"}
                {load.unassigned > 0 && (
                  <span className="text-status-warn-fg"> · {load.unassigned} need a chair</span>
                )}
              </p>
              <ul className="mt-2 space-y-1">
                {load.technicians.map((technician) => (
                  <li
                    key={technician.id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="flex size-5 items-center justify-center rounded-md bg-secondary text-[9px] font-extrabold text-secondary-foreground">
                        {technician.initials}
                      </span>
                      {technician.name}
                    </span>
                    <span
                      className={cn(
                        "font-extrabold",
                        technician.off ? "text-muted-foreground" : "text-muted-foreground",
                      )}
                    >
                      {technician.off
                        ? "Off"
                        : `${technician.bookings} · ${Math.round(technician.bookedMinutes / 6) / 10}h`}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {view === "month" && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/60">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <p
                key={label}
                className="px-2 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase text-muted-foreground"
              >
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthLoads.map((load) => (
              <button
                key={load.key}
                type="button"
                onClick={() => {
                  setSelected(load.key);
                  setView("day");
                }}
                className={cn(
                  "min-h-20 border-r border-b border-border p-2 text-left transition-colors last:border-r-0 hover:bg-secondary/50",
                  !isSameMonth(load.key, selected) && "bg-muted/40 opacity-60",
                  isTodayKey(load.key) && "bg-primary/10",
                )}
              >
                <p className="text-xs font-extrabold text-foreground">
                  {Number(load.key.slice(8))}
                </p>
                {load.closed ? (
                  <p className="mt-1 text-[10px] font-bold text-muted-foreground">Closed</p>
                ) : (
                  <>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full", loadTone(load))}
                        style={{ width: `${Math.max(4, load.load * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                      {load.bookings} bkg · {load.workingTechs} tech
                    </p>
                    {load.unassigned > 0 && (
                      <p className="text-[10px] font-extrabold text-status-warn-fg">
                        {load.unassigned} unassigned
                      </p>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 border-t border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            <CalendarRange className="size-3.5" aria-hidden />
            Click any day to open the full schedule board for that date.
          </p>
        </div>
      )}

      <AppointmentDrawer
        appointment={active}
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        onCancelGuest={(appointmentId, guestId) => {
          updateGuest(appointmentId, guestId, { status: "Cancelled" });
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
        nowMinutes={null}
        defaultDateKey={selected}
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
