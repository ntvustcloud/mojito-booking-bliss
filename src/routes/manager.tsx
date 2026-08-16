import { useState } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager Portal — Mojito Nail Salon" },
      {
        name: "description",
        content:
          "Operational manager portal for Mojito Nail Salon: live salon board, today's appointments, technician availability and walk-ins.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Manager Portal — Mojito Nail Salon" },
      {
        property: "og:description",
        content: "Live salon board for staff: appointments, waiting guests and technicians.",
      },
    ],
  }),
  component: ManagerLayout,
});

function ManagerLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-ivory text-[0.9375rem] leading-normal">
      <ManagerSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 items-center gap-2 border-b border-border bg-card px-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <span className="text-xs font-extrabold tracking-tight text-foreground md:hidden">
            Mojito Manager
          </span>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Customer site
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
        {/* Required: nested manager routes render here. */}
        <Outlet />
      </div>
    </div>
  );
}
