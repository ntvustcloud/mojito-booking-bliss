import { Leaf, ShieldCheck, Sparkles, HeartHandshake } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Clean by habit",
    text: "Hospital-grade tool sterilisation, single-use files and fresh liners for every guest.",
  },
  {
    icon: Leaf,
    title: "Built to relax",
    text: "Low music, soft light and plenty of plants. No rush, no noise, no upselling.",
  },
  {
    icon: Sparkles,
    title: "Careful detail",
    text: "Hand-shaped nails and clean cuticle lines — the part most people notice later.",
  },
  {
    icon: HeartHandshake,
    title: "Friendly technicians",
    text: "A small, steady team who remember your shape, your shade and your name.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="section-shell py-20">
      <div className="max-w-2xl">
        <p className="eyebrow">Why Choose Us</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Calm, clean and genuinely careful</h2>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
              <pillar.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg">{pillar.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{pillar.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
