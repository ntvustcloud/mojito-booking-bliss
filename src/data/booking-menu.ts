import { getService, type Service } from "@/data/services";

/**
 * The in-salon menu grouped the way guests read it on the printed menu.
 * Names, durations and prices come straight from `services` so the Booking
 * menu and the Services page can never drift apart.
 */
export type MenuGroup = {
  id: string;
  label: string;
  services: Service[];
};

const GROUP_DEFINITIONS: { id: string; label: string; ids: string[] }[] = [
  {
    id: "manicure",
    label: "Manicure",
    ids: ["classic-manicure", "spa-manicure", "gel-manicure"],
  },
  {
    id: "pedicure",
    label: "Pedicure",
    ids: ["express-pedicure", "signature-pedicure", "deluxe-pedicure", "gel-pedicure"],
  },
  {
    id: "enhancements",
    label: "Enhancements",
    ids: [
      "dip-powder",
      "dip-french",
      "acrylic-full-set",
      "acrylic-fill",
      "gel-x-full-set",
      "gel-x-fill",
    ],
  },
  {
    id: "add-ons",
    label: "Add-Ons",
    ids: [
      "nail-art-simple",
      "nail-art-detailed",
      "gel-removal",
      "paraffin-add-on",
      "callus-add-on",
    ],
  },
];

export const menuGroups: MenuGroup[] = GROUP_DEFINITIONS.map((group) => ({
  id: group.id,
  label: group.label,
  services: group.ids
    .map((id) => getService(id))
    .filter((service): service is Service => Boolean(service)),
}));
