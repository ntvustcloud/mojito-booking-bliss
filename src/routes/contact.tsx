import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { VisitUs } from "@/components/home/VisitUs";
import { salon } from "@/data/salon";

const title = "Contact & Hours — Mojito Nail Salon";
const description =
  "Address, phone number, opening hours and directions for Mojito Nail Salon in South Austin, plus a link to book online.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="py-12 lg:py-16">
      <div className="section-shell max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Come say hello</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Booking online is the quickest way to get the time you want. For anything else, give us a
          call — we answer between treatments.
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

      <VisitUs />
    </div>
  );
}
