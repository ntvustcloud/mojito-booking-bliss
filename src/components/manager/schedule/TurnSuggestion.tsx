import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TurnCandidate } from "@/data/turn-system";

/**
 * Subtle "★ Suggested: Linh" pill on Waiting / Unassigned cards.
 * Informational only — the manager still drags the card to assign.
 */
export function TurnSuggestion({
  candidates,
  className,
}: {
  candidates: TurnCandidate[];
  className?: string;
}) {
  const best = candidates.find((candidate) => candidate.recommended);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary transition-colors hover:bg-primary/20",
          !best && "border-border bg-muted/70 text-muted-foreground",
          className,
        )}
      >
        <Star className="size-3 shrink-0" aria-hidden />
        <span className="truncate">
          {best ? `Suggested: ${best.name}` : "No technician available now"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <p className="text-xs font-extrabold text-foreground">Recommended technicians</p>
        <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
          Turn fairness first, service total breaks ties · you decide by dragging the card.
        </p>
        {best?.reason && (
          <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary">
            Why {best.name}: {best.reason}
          </p>
        )}
        <ol className="mt-2 space-y-2">
          {candidates.map((candidate, index) => (
            <li key={candidate.technicianId} className="flex gap-2">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold",
                  candidate.recommended
                    ? "bg-primary text-primary-foreground"
                    : candidate.quality === "ineligible"
                      ? "bg-muted text-muted-foreground"
                      : "bg-secondary text-secondary-foreground",
                )}
              >
                {candidate.recommended ? (
                  <Star className="size-3" aria-hidden />
                ) : (
                  candidate.quality === "ineligible" ? "–" : index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold text-foreground">
                  {candidate.name}
                  <span className="ml-1 font-bold text-muted-foreground">
                    Turn #{candidate.position} · {formatTurns(candidate.total)} ·{" "}
                    {formatServiceMoney(candidate.serviceTotal)}
                  </span>
                </span>
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  {candidate.state} · {candidate.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>

      </PopoverContent>
    </Popover>
  );
}
