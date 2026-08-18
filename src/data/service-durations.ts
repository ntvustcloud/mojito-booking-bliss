import { getService } from "@/data/services";

/**
 * Scheduling durations for the Manager Portal.
 *
 * The customer menu keeps its own marketing durations; the board renders card
 * height from THESE values. They are prototype defaults only — a future
 * Settings → Service Durations screen will edit this map (per salon), so no UI
 * component should hard-code a duration.
 */

export const DEFAULT_SERVICE_MINUTES = 30;

/** Overrides keyed by service id. Anything missing falls back to the menu duration. */
export const SCHEDULING_DURATIONS: Record<string, number> = {
  // Manicure
  "classic-manicure": 30,
  "spa-manicure": 30,
  // Pedicure
  "express-pedicure": 30, // Basic pedicure
  "signature-pedicure": 40, // Spa pedicure
  "deluxe-pedicure": 50,
  // Enhancements
  "acrylic-full-set": 45,
  "acrylic-fill": 35,
};

/** Scheduled minutes for one service id. */
export function serviceMinutes(serviceId: string): number {
  const override = SCHEDULING_DURATIONS[serviceId];
  if (override !== undefined) return override;
  return getService(serviceId)?.duration ?? DEFAULT_SERVICE_MINUTES;
}

/** Multiple services on one guest add up. */
export function servicesMinutes(serviceIds: string[]): number {
  return serviceIds.reduce((sum, id) => sum + serviceMinutes(id), 0);
}
