import type { AppointmentStatus } from "@/data/manager-mock";

/** Muted operational tones — color always means status, never decoration. */
export const CARD_TONE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-fg/25",
  "Checked In": "bg-status-warn-bg/70 text-status-warn-fg border-status-warn-fg/25",
  Waiting: "bg-status-warn-bg text-status-warn-fg border-status-warn-fg/35",
  Assigned: "bg-status-info-bg text-status-info-fg border-status-info-fg/25",
  "In Service": "bg-status-live-bg text-status-live-fg border-status-live-fg/35",
  Completed: "bg-status-done-bg text-status-done-fg border-status-done-fg/20",
  Cancelled: "bg-status-off-bg text-status-off-fg border-status-off-fg/25 opacity-70",
  "No Show": "bg-status-off-bg text-status-off-fg border-status-off-fg/25 opacity-70",
};

export const DOT_TONE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-status-neutral-fg/50",
  "Checked In": "bg-status-warn-fg/70",
  Waiting: "bg-status-warn-fg",
  Assigned: "bg-status-info-fg",
  "In Service": "bg-status-live-fg",
  Completed: "bg-status-done-fg/60",
  Cancelled: "bg-status-off-fg/70",
  "No Show": "bg-status-off-fg/70",
};
