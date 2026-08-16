import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-salon.jpg";
import { Button } from "@/components/ui/button";
import { PopularMenu } from "@/components/home/PopularMenu";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { Reviews } from "@/components/home/Reviews";
import { VisitUs } from "@/components/home/VisitUs";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { salon } from "@/data/salon";

const title = "Mojito Nail Salon — Calm, Clean Nail Care in Austin";
const description =
  "A quiet, spotless nail salon in South Austin. Explore our menu, save nail inspiration and book manicures, pedicures, gel, dip and Gel-X online.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <section className="section-shell pt-10 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> South Austin nail care
            </p>
            <h1 className="mt-4 text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Mojito Nail Salon
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {salon.tagline} Take your time, choose the services you want, and we'll have everything
              ready when you arrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl">
                <Link to="/book">
                  Book Appointment <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#menu">View Our Menu</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Open today</dt>
                <dd className="font-bold">9:30 – 7:00</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Google rating</dt>
                <dd className="font-bold">4.9 ★</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Walk-ins</dt>
                <dd className="font-bold">Welcome</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border shadow-lift">
            <img
              src={heroImage}
              alt="The calm sage green and ivory interior of Mojito Nail Salon"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <PopularMenu />

      <section className="section-shell py-8">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Featured Gallery</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Nail inspiration from our chairs</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/gallery">See the full gallery</Link>
          </Button>
        </div>
        <div className="mt-8">
          <GalleryGrid limit={3} />
        </div>
      </section>

      <WhyChooseUs />

      <section className="section-shell py-10">
        <div className="rounded-3xl border border-border bg-secondary/60 px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl sm:text-4xl">Ready when you are</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Add the services you want as you browse, then head to booking — everything you picked
            comes with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="xl">
              <Link to="/book">
                Book Appointment <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to="/services">Browse all services</Link>
            </Button>
          </div>
        </div>
      </section>

      <Reviews />
      <VisitUs />
    </>
  );
}
