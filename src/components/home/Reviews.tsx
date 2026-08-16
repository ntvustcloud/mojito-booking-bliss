import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviews } from "@/data/salon";

export function Reviews() {
  return (
    <section className="bg-secondary/40 py-20">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="eyebrow">Google Reviews</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Loved by Our Clients</h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review) => (
            <figure
              key={review.name}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={
                      index < review.rating
                        ? "h-4 w-4 fill-primary text-primary"
                        : "h-4 w-4 text-border"
                    }
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm text-muted-foreground">
                “{review.text}”
              </blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-bold">{review.name}</span>
                <span className="text-muted-foreground"> · {review.date}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer noopener">
              Read More Reviews on Google
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
