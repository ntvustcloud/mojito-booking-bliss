import { createFileRoute } from "@tanstack/react-router";
import { ServiceCard } from "@/components/services/ServiceCard";
import { SERVICE_CATEGORIES, services } from "@/data/services";

const title = "Services & Prices — Mojito Nail Salon";
const description =
  "Full menu of manicures, pedicures, gel, dip powder, acrylic, Gel-X, nail art and add-ons with prices, durations and what each service includes.";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="section-shell py-12 lg:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Services</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Our full menu</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Every price is a starting price and every duration is an estimate. Add as many services as
          you like — your selection follows you around the site.
        </p>
      </div>

      <div className="mt-12 space-y-14">
        {SERVICE_CATEGORIES.map((category) => {
          const items = services.filter((service) => service.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} id={category.toLowerCase().replace(/\s+/g, "-")}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border pb-4">
                <h2 className="min-w-0 truncate text-2xl sm:text-3xl">{category}</h2>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? "service" : "services"}
                </span>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
