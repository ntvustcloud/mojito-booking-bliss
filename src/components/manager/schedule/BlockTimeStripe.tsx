import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  PIXELS_PER_MINUTE,
  SLOT_MINUTES,
  formatShortMinutes,
  minutesToOffset,
} from "@/data/schedule";
import type { TechnicianBlockout } from "@/data/manager-mock";

/**
 * Block time on the board: editable like an appointment.
 *  - drag the top or bottom edge to resize (15-minute snaps)
 *  - drag the middle to move it inside the same technician column
 *  - click to open the Block Time form
 */

const MIN_BLOCK_MINUTES = SLOT_MINUTES;

type Mode = "top" | "bottom" | "move";

function snapRaw(minutes: number) {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

export function BlockTimeStripe({
  blockout,
  onEdit,
  onAdjust,
}: {
  blockout: TechnicianBlockout;
  onEdit: () => void;
  /** Commit a new start/end after a resize or move. */
  onAdjust: (start: number, end: number) => void;
}) {
  const [draft, setDraft] = useState<{ start: number; end: number } | null>(null);
  const moved = useRef(false);

  const start = draft?.start ?? blockout.start;
  const end = draft?.end ?? blockout.end;

  const beginDrag = (mode: Mode) => (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const column = (event.currentTarget as HTMLElement).closest<HTMLElement>(
      "[data-tech-column]",
    );
    if (!column) return;
    const rect = column.getBoundingClientRect();
    const originMinutes = snapRaw(
      DAY_START_MINUTES + (event.clientY - rect.top) / PIXELS_PER_MINUTE,
    );
    const base = { start: blockout.start, end: blockout.end };
    let latest = base;
    moved.current = false;

    const onPointerMove = (nativeEvent: PointerEvent) => {
      const at = snapRaw(DAY_START_MINUTES + (nativeEvent.clientY - rect.top) / PIXELS_PER_MINUTE);
      const delta = at - originMinutes;
      if (delta !== 0) moved.current = true;
      if (mode === "top") {
        latest = {
          start: Math.max(
            DAY_START_MINUTES,
            Math.min(base.end - MIN_BLOCK_MINUTES, base.start + delta),
          ),
          end: base.end,
        };
      } else if (mode === "bottom") {
        latest = {
          start: base.start,
          end: Math.min(
            DAY_END_MINUTES,
            Math.max(base.start + MIN_BLOCK_MINUTES, base.end + delta),
          ),
        };
      } else {
        const span = base.end - base.start;
        const nextStart = Math.min(
          DAY_END_MINUTES - span,
          Math.max(DAY_START_MINUTES, base.start + delta),
        );
        latest = { start: nextStart, end: nextStart + span };
      }
      setDraft(latest);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setDraft(null);
      if (latest.start !== base.start || latest.end !== base.end) {
        onAdjust(latest.start, latest.end);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${blockout.label} ${formatShortMinutes(start)}–${formatShortMinutes(end)} — drag to move, drag an edge to resize, click to edit`}
      onPointerDown={beginDrag("move")}
      onClick={(event) => {
        event.stopPropagation();
        if (moved.current) {
          moved.current = false;
          return;
        }
        onEdit();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onEdit();
      }}
      className={cn(
        "group absolute inset-x-1 z-[5] flex cursor-grab touch-none items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/80 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.04)_6px,rgb(0_0_0/0.04)_12px)] transition-colors select-none hover:bg-muted",
        draft && "cursor-grabbing border-primary/60 ring-2 ring-primary/40",
      )}
      style={{
        top: minutesToOffset(start),
        height: Math.max(SLOT_MINUTES * PIXELS_PER_MINUTE, (end - start) * PIXELS_PER_MINUTE - 3),
      }}
    >
      {/* Resize handles */}
      <span
        onPointerDown={beginDrag("top")}
        className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize touch-none before:absolute before:inset-x-1/3 before:top-[3px] before:h-[2px] before:rounded-full before:bg-transparent before:content-[''] group-hover:before:bg-muted-foreground/50"
        aria-hidden
      />
      <span className="pointer-events-none px-1 text-center text-[10px] font-extrabold tracking-[0.1em] uppercase text-muted-foreground">
        {blockout.label}
        <span className="block text-[9px] tracking-normal normal-case opacity-80">
          {formatShortMinutes(start)}–{formatShortMinutes(end)}
        </span>
        {blockout.note && (
          <span className="block truncate text-[9px] tracking-normal normal-case opacity-70">
            {blockout.note}
          </span>
        )}
      </span>
      <span
        onPointerDown={beginDrag("bottom")}
        className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize touch-none before:absolute before:inset-x-1/3 before:bottom-[3px] before:h-[2px] before:rounded-full before:bg-transparent before:content-[''] group-hover:before:bg-muted-foreground/50"
        aria-hidden
      />
    </div>
  );
}
