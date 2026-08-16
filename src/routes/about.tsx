import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-salon.jpg";
import { Button } from "@/components/ui/button";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { VisitUs } from "@/components/home/VisitUs";
import { salon, technicians } from "@/data/salon";

const title = "About Us — Mojito Nail Salon, South Austin";
const description =
  "Our story, standards and team, plus address, phone, opening hours and directions for Mojito Nail Salon in South Austin.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="py-12 lg:py-16">
      <div className="section-shell grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">About Us</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">A calm room and careful hands</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Mojito is a single, small salon in South Austin. We keep the room quiet, the tools
            spotless and the appointments unhurried, so a manicure feels like a proper break rather
            than an errand.
          </p>
          <p className="mt-4 text-muted-foreground">
            Our capybara mascot sets the tone: unbothered, friendly, comfortable in warm water. That
            is roughly how we want you to feel when you leave.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/book">Book Appointment</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={salon.phoneHref}>Call {salon.phone}</a>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border shadow-lift">
          <img
            src={heroImage}
            alt="Sage green and ivory interior with pedicure chairs and plants"
            width={1600}
            height={1104}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <WhyChooseUs />

      <section className="section-shell pb-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Our Team</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">The technicians you'll meet</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {technicians
            .filter((tech) => tech.id !== "any")
            .map((tech) => (
              <div key={tech.id} className="rounded-2xl border border-border bg-card p-6">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-xl font-extrabold text-primary">
                  {tech.initials}
                </span>
                <h3 className="mt-4 text-lg">{tech.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tech.specialties.join(" · ")}</p>
              </div>
            ))}
        </div>
      </section>

      <VisitUs />

      <section className="section-shell">
        <div className="rounded-3xl border border-border bg-secondary/50 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl">Questions before you book?</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Booking online is the quickest way to get the time you want. For anything else, call or
            email us — we answer between treatments.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/book">Book Appointment</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`mailto:${salon.email}`}>{salon.email}</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
