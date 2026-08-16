import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingFlow } from "@/components/booking/BookingFlow";

const title = "Book an Appointment — Mojito Nail Salon";
const description =
  "Pick your services from the full salon menu, choose a technician, pick a date and time, and confirm your Mojito Nail Salon appointment.";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  return (
    <div className="section-shell py-12 lg:py-16">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="max-w-2xl">
          <p className="eyebrow">Book Appointment</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Let's find your time</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you added while browsing is already here — no need to choose twice.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link to="/services">
            Browse Our Services <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="mt-10">
        <BookingFlow />
      </div>
    </div>
  );
}
