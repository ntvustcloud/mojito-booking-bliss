import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMinutes } from "@/data/schedule";
import { formatServiceMoney, formatTurns } from "@/data/manager-mock";
import { TurnStrip } from "@/components/manager/schedule/TurnStrip";
import {
  checkInMinute,
  turnHistory,
  type TechnicianCheckIn,
  type TurnEvent,
} from "@/data/turn-system";

/**
 * Compact turn-priority chip in the technician column header.
 * Click reveals check-in time, turn total, Service Total Today and the full
 * event history that produced both numbers.
 */
export function TurnPriorityBadge({
  technicianId,
  technicianName,
  position,
  total,
  serviceTotal,
  events,
  checkIns,
}: {
  technicianId: string;
  technicianName: string;
  position: number;
  total: number;
  serviceTotal: number;
  events: TurnEvent[];
  checkIns: TechnicianCheckIn[];
}) {
  const [showHistory, setShowHistory] = useState(false);
  const history = turnHistory(events, technicianId);
  const checkedIn = checkInMinute(checkIns, technicianId);

  return (
    <Popover onOpenChange={(open) => !open && setShowHistory(false)}>
      <PopoverTrigger
        aria-label={`${technicianName} turn priority ${position}`}
        className={cn(
          "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums transition-colors",
          position === 1
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-secondary text-muted-foreground hover:bg-secondary/70",
        )}
      >
        #{position}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-xs font-extrabold text-foreground">Turn Priority #{position}</p>
        <TurnStrip total={total} className="mt-1.5" />
        <dl className="mt-2 space-y-1 text-[11px] font-semibold text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Checked in</dt>
            <dd className="font-extrabold text-foreground">
              {checkedIn === null ? "Not checked in" : formatMinutes(checkedIn)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Turns today</dt>
            <dd className="font-extrabold text-foreground">{formatTurns(total)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Service total today</dt>
            <dd className="font-extrabold text-foreground">{formatServiceMoney(serviceTotal)}</dd>
          </div>
        </dl>
        <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground/80">
          Service total is menu service prices only — not tips, tax or take-home pay. Turns lead;
          service total only breaks ties.
        </p>
        <button
          type="button"
          onClick={() => setShowHistory((value) => !value)}
          className="mt-2 text-[11px] font-extrabold text-primary underline-offset-2 hover:underline"
        >
          {showHistory ? "Hide turn history" : "View turn history"}
        </button>
        {showHistory && (
          <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
            {history.map((event) => (
              <li key={event.id} className="text-[11px] leading-tight">
                <span className="font-extrabold text-foreground">
                  {formatMinutes(event.atMinutes)}
                </span>{" "}
                <span className="text-muted-foreground">{event.label}</span>
                {event.value > 0 && (
                  <span className="ml-1 font-extrabold text-primary">
                    +{event.value.toFixed(1)} turn
                  </span>
                )}
                {event.serviceValue > 0 && (
                  <span className="ml-1 font-extrabold text-muted-foreground">
                    · {formatServiceMoney(event.serviceValue)}
                  </span>
                )}
              </li>
            ))}
            <li className="border-t border-border pt-1.5 text-[11px] font-extrabold text-foreground">
              {formatTurns(total)} · {formatServiceMoney(serviceTotal)} service
            </li>
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
