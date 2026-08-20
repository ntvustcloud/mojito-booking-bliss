import { getService } from "@/data/services";

/**
 * Popular services shown on the entrance tablet (`/check-in`).
 *
 * This is deliberately *configuration*, not kiosk UI logic. A future
 * Manager → Settings → Check-In Popular Services screen only has to edit this
 * list (choose, hide, reorder) — the kiosk renders whatever it is handed.
 */

export type PopularServiceOption = {
  /** Kiosk option id. `unsure` is the special "Other / Not Sure" option. */
  id: string;
  /** Customer-facing label (kept shorter than the full menu name). */
  label: string;
  /** Matching service in the salon menu, when there is one. */
  serviceId?: string;
  /** Hidden options stay in the config but never render. */
  hidden?: boolean;
  /** Lower sorts first. */
  order: number;
};

/** The special option that hands service choice to the receptionist. */
export const UNSURE_OPTION_ID = "unsure";

/** Prototype defaults — the owner will be able to edit these later. */
export const popularServiceConfig: PopularServiceOption[] = [
  { id: "classic-manicure", label: "Manicure", serviceId: "classic-manicure", order: 1 },
  { id: "express-pedicure", label: "Basic Pedicure", serviceId: "express-pedicure", order: 2 },
  { id: "signature-pedicure", label: "Spa Pedicure", serviceId: "signature-pedicure", order: 3 },
  { id: "deluxe-pedicure", label: "Deluxe Pedicure", serviceId: "deluxe-pedicure", order: 4 },
  { id: "acrylic-full-set", label: "Acrylic Full Set", serviceId: "acrylic-full-set", order: 5 },
  { id: "acrylic-fill", label: "Acrylic Fill-In", serviceId: "acrylic-fill", order: 6 },
  { id: "gel-x-full-set", label: "Gel-X", serviceId: "gel-x-full-set", order: 7 },
  { id: UNSURE_OPTION_ID, label: "Other / Not Sure", order: 99 },
];

/** Visible options in display order. */
export function popularServiceOptions(
  config: PopularServiceOption[] = popularServiceConfig,
): PopularServiceOption[] {
  return config.filter((option) => !option.hidden).sort((a, b) => a.order - b.order);
}

/** Real menu service ids for the options the customer tapped. */
export function selectedServiceIds(
  optionIds: string[],
  config: PopularServiceOption[] = popularServiceConfig,
): string[] {
  return optionIds
    .map((id) => config.find((option) => option.id === id)?.serviceId)
    .filter((id): id is string => Boolean(id) && Boolean(getService(id!)));
}

/** True when the receptionist still has to help pick the service. */
export function needsClarification(optionIds: string[]): boolean {
  return optionIds.includes(UNSURE_OPTION_ID) || selectedServiceIds(optionIds).length === 0;
}
