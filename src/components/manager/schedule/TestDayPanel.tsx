import { useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TEST_CHECKLIST } from "@/data/regression-day";

/**
 * Development-only control for the V1 regression test day: a subtle badge that
 * opens the manual checklist, plus a reset back to the seeded dataset.
 * Purely local UI state — no salon behaviour lives here.
 */
export function TestDayPanel({ onReset }: { onReset: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const passed = TEST_CHECKLIST.filter((item) => done[item.id]).length;

  return (
    <Sheet>
      <SheetTrigger className="flex items-center gap-1.5 rounded-md border border-dashed border-border bg-secondary/50 px-2 py-1 text-[10px] font-extrabold tracking-[0.1em] uppercase text-muted-foreground transition-colors hover:text-foreground">
        <FlaskConical className="size-3" aria-hidden />
        V1 Test Day
        <span className="font-bold normal-case tracking-normal">
          {passed}/{TEST_CHECKLIST.length}
        </span>
      </SheetTrigger>
      <SheetContent className="w-[22rem] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>V1 Regression Test Day</SheetTitle>
          <SheetDescription>
            Manual checklist only — nothing is auto-checked. Reset restores the seeded
            dataset so the ten tests can be repeated.
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2">
          {TEST_CHECKLIST.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={`test-${item.id}`}
                checked={Boolean(done[item.id])}
                onCheckedChange={(value) =>
                  setDone((current) => ({ ...current, [item.id]: value === true }))
                }
                className="mt-0.5"
              />
              <label
                htmlFor={`test-${item.id}`}
                className="text-xs font-bold leading-snug text-foreground"
              >
                <span className="mr-1 text-muted-foreground">{item.id}.</span>
                {item.label}
              </label>
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          className="mt-5 w-full rounded-lg"
          onClick={() => {
            onReset();
            setDone({});
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset Test Day
        </Button>
      </SheetContent>
    </Sheet>
  );
}
