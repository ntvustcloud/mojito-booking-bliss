import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/components/services/ServiceCard";
import { homepageServices } from "@/data/services";

export function PopularMenu() {
  return (
    <section id="menu" className="section-shell scroll-mt-24 py-20">
      <div className="max-w-2xl">
        <p className="eyebrow">Our Services</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Three services our guests book most</h2>
        <p className="mt-4 text-muted-foreground">
          Everything you need to decide is on the card — add a service and keep browsing.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {homepageServices.map((service) => (
          <ServiceCard key={service.id} service={service} edgeToEdge />
        ))}
      </div>

      <div className="mt-8">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-base font-bold text-primary underline-offset-4 hover:underline"
        >
          View Full Menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
