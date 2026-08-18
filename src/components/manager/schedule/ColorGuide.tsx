import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_PRIORITY_WINDOW,
  BLOCKOUT_VISUALS,
  BOARD_STATES,
  RECOMMENDATION_VISUALS,
  type BoardState,
} from "@/components/manager/schedule/scheduleTone";

/**
 * Schedule Color Guide — the one place that explains the board's
 * colour + icon + text language. Opens as an overlay panel so it never
 * shrinks the schedule grid.
 */

const STATUS_ORDER: BoardState[] = ["appointment", "walkin", "cancelled"];

function Row({
  label,
  meaning,
  swatch,
  Icon,
}: {
  label: string;
  meaning: string;
  swatch: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
          swatch,
        )}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-foreground">{label}</span>
        <span className="block text-[11px] font-semibold text-muted-foreground">{meaning}</span>
      </span>
    </li>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-extrabold tracking-wide text-foreground uppercase">
        {title}
      </h3>
      {note && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{note}</p>}
      <ul className="mt-2.5 space-y-2.5">{children}</ul>
    </section>
  );
}

export function ColorGuide() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-8 rounded-lg px-2 text-xs">
          <Info className="size-3.5" aria-hidden />
          Color Guide
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Schedule Color Guide</SheetTitle>
          <SheetDescription>
            Two card colours, one block-time pattern. Everything else — busy, free, waiting — is read
            straight from the schedule and the clock.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4 pb-6">
          <Section title="Customer cards" note="Booking type decides the colour.">
            {STATUS_ORDER.map((key) => {
              const visual = BOARD_STATES[key];
              return (
                <Row
                  key={key}
                  label={visual.label}
                  meaning={visual.meaning}
                  swatch={visual.swatch}
                  Icon={visual.icon}
                />
              );
            })}
          </Section>

          <Section title="Block Time" note="Drops are rejected on these times.">
            {BLOCKOUT_VISUALS.map((visual) => (
              <Row
                key={visual.key}
                label={visual.label}
                meaning={visual.meaning}
                swatch={visual.swatch}
                Icon={visual.icon}
              />
            ))}
          </Section>

          <Section
            title="Technician recommendation"
            note="Column tint while you drag a guest card. The system recommends — you decide."
          >
            {RECOMMENDATION_VISUALS.map((visual) => (
              <Row
                key={visual.key}
                label={visual.label}
                meaning={visual.meaning}
                swatch={visual.swatch}
                Icon={visual.icon}
              />
            ))}
          </Section>

          <Section title="How turns work">
            <li className="text-[11px] font-semibold text-muted-foreground">
              <span className="font-extrabold text-foreground">+1.0 turn</span> — walk-in, or an
              &quot;Any Available&quot; booking the salon assigns.
            </li>
            <li className="text-[11px] font-semibold text-muted-foreground">
              <span className="font-extrabold text-foreground">+0.5 turn</span> — the customer
              specifically requested that technician (marked{" "}
              <span className="font-extrabold text-foreground">Req</span> on the card).
            </li>
            <li className="text-[11px] font-semibold text-muted-foreground">
              Rotation order starts from each technician&apos;s check-in time; the lowest turn total
              is suggested first (<span className="font-extrabold text-foreground">#1</span> in the
              column header).
            </li>
            <li className="text-[11px] font-semibold text-muted-foreground">
              Waiting order: appointments due within {APPOINTMENT_PRIORITY_WINDOW} minutes come
              before plain walk-ins; walk-ins follow their check-in time.
            </li>
            <li className="text-[11px] font-semibold text-muted-foreground">
              Turns never change automatically — only when you assign a guest to a technician.
            </li>
          </Section>

          <Section title="How the board reads availability">
            <li className="text-[11px] font-semibold text-muted-foreground">
              A card in a technician column reserves that time — no &quot;start&quot; or
              &quot;complete&quot; taps needed.
            </li>
            <li className="text-[11px] font-semibold text-muted-foreground">
              Once the card&apos;s time passes, the technician is available again unless Block Time
              says otherwise.
            </li>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
