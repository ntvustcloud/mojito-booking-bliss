import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-mojito.png";
import { salon } from "@/data/salon";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              width={44}
              height={44}
              loading="lazy"
              className="h-10 w-10"
            />
            <span className="text-lg font-extrabold">{salon.name}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{salon.tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Visit
          </h3>
          <address className="mt-4 space-y-1 text-sm not-italic text-muted-foreground">
            <p>{salon.address}</p>
            <p>
              <a href={salon.phoneHref} className="font-semibold text-foreground hover:underline">
                {salon.phone}
              </a>
            </p>
            <p>{salon.email}</p>
          </address>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Explore
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { to: "/services", label: "Services" },
              { to: "/gallery", label: "Gallery" },
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" },
              { to: "/book", label: "Book Appointment" },
            ].map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-muted-foreground hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="section-shell border-t border-border py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {salon.name}. Prices are estimates and confirmed in salon.
      </div>
    </footer>
  );
}
