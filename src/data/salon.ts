export const salon = {
  name: "Mojito Nail Salon",
  tagline: "Quiet hands, calm mind, beautiful nails.",
  address: "1428 Willow Creek Ave, Suite 4, Austin, TX 78704",
  phone: "(512) 555-0184",
  phoneHref: "tel:+15125550184",
  email: "hello@mojitonails.com",
  mapsUrl: "https://maps.google.com/?q=1428+Willow+Creek+Ave+Austin+TX",
  hours: [
    { day: "Monday – Friday", time: "9:30 AM – 7:00 PM" },
    { day: "Saturday", time: "9:00 AM – 6:00 PM" },
    { day: "Sunday", time: "11:00 AM – 5:00 PM" },
  ],
};

export type Technician = {
  id: string;
  name: string;
  specialties: string[];
  initials: string;
};

export const technicians: Technician[] = [
  {
    id: "any",
    name: "Any Available Technician",
    specialties: ["Soonest opening", "Matched to your services"],
    initials: "✿",
  },
  {
    id: "mai",
    name: "Mai",
    specialties: ["Gel-X", "Fine line art"],
    initials: "M",
  },
  {
    id: "linh",
    name: "Linh",
    specialties: ["Signature pedicure", "Dip powder"],
    initials: "L",
  },
  {
    id: "tran",
    name: "Tran",
    specialties: ["Acrylic sculpting", "Shaping"],
    initials: "T",
  },
  {
    id: "rosa",
    name: "Rosa",
    specialties: ["Spa manicure", "Nail art"],
    initials: "R",
  },
];

export const reviews = [
  {
    name: "Hannah",
    rating: 5,
    date: "2 weeks ago",
    text: "Spotless, quiet and so relaxing. Linh took her time with my pedicure and my feet have never felt better.",
  },
  {
    name: "Priya",
    rating: 5,
    date: "1 month ago",
    text: "Mai did a Gel-X set from a photo I saved and matched it exactly. Three weeks later, still perfect.",
  },
  {
    name: "Daniel",
    rating: 5,
    date: "1 month ago",
    text: "First time getting a manicure and they made it easy and comfortable. No upselling, just good work.",
  },
  {
    name: "Sofia",
    rating: 4,
    date: "2 months ago",
    text: "Lovely space and very friendly team. Booking online with my services already saved was a nice touch.",
  },
];
