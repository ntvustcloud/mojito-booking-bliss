import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Scissors,
  Settings,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to?: string;
};

const MAIN_NAV: NavItem[] = [
  { label: "Today", icon: LayoutDashboard, to: "/manager/today" },
  { label: "Calendar", icon: CalendarDays },
  { label: "Appointments", icon: ClipboardList },
  { label: "Customers", icon: Users },
  { label: "Staff", icon: UsersRound },
  { label: "Services", icon: Scissors },
];

const SETTINGS_NAV: NavItem = { label: "Settings", icon: Settings };

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const inner = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && !item.to && (
        <span className="ml-auto text-[10px] font-bold tracking-wide text-muted-foreground/70">
          SOON
        </span>
      )}
    </>
  );

  const shell = cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
    collapsed && "justify-center px-0",
  );

  if (!item.to) {
    return (
      <span
        aria-disabled
        title={`${item.label} — coming soon`}
        className={cn(shell, "cursor-default text-muted-foreground/70")}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      title={item.label}
      className={cn(shell, "text-foreground/80 hover:bg-secondary hover:text-foreground")}
      activeProps={{ className: "bg-secondary text-primary" }}
    >
      {inner}
    </Link>
  );
}

export function ManagerSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card md:flex",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        {!collapsed && (
          <span className="text-base font-extrabold tracking-tight text-foreground">Mojito</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {MAIN_NAV.map((item) => (
          <NavRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <NavRow item={SETTINGS_NAV} collapsed={collapsed} />
      </div>
    </aside>
  );
}
