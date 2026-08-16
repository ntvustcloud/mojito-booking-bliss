import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-mojito.png";
import { Button } from "@/components/ui/button";
import { salon } from "@/data/salon";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About Us" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="section-shell grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 lg:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={logo}
            alt={`${salon.name} logo — a capybara with a banana leaf`}
            width={48}
            height={48}
            className="h-11 w-11 shrink-0"
          />
          <span className="min-w-0">
            <span className="block truncate text-lg font-extrabold leading-tight">Mojito</span>
            <span className="block truncate text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Nail Salon
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="ml-3">
            <Link to="/book">Book Appointment</Link>
          </Button>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-card lg:hidden">
          <nav className="section-shell flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-semibold text-muted-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild size="lg" className="mt-2">
              <Link to="/book" onClick={() => setOpen(false)}>
                Book Appointment
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
