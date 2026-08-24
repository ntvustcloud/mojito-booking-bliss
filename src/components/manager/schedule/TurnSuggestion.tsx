import { ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatServiceMoney, formatTurns } from "@/data/manager-mock";
import type { TurnCandidate } from "@/data/turn-system";


/**
 * Subtle "★ Suggested: Linh" pill on Waiting / Unassigned cards.
 *
 * Single click / tap → recommendation details.
 * Double click (desktop) or the → action (touch) → Quick Assign: accept the
 * recommendation without dragging. The manager still decides; nothing is
 * assigned automatically.
 */
export function TurnSuggestion({
  candidates,
  className,
  variant = "full",
  onQuickAssign,
}: {
  candidates: TurnCandidate[];
  className?: string;
  /** How much room the attached card has: full text, first name only, or icon. */
  variant?: "full" | "compact" | "icon";
  /** Quick Assign to the currently recommended technician. */
  onQuickAssign?: () => void;
}) {
  const best = candidates.find((candidate) => candidate.recommended);
  const firstName = best?.name.split(" ")[0] ?? "";
  const quick = best && onQuickAssign ? onQuickAssign : undefined;

  return (
    <Popover>
      <span className={cn("flex items-stretch overflow-hidden rounded-md", className)}>
        <PopoverTrigger
          onDoubleClick={
            quick
              ? (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  quick();
                }
              : undefined
          }
          title={
            best
              ? quick
                ? `Suggested: ${best.name} · click for details, double-click to assign`
                : `Suggested technician: ${best.name}`
              : "No technician available now"
          }
          className={cn(
            "flex items-center gap-1 border border-primary/25 bg-primary/90 px-1.5 py-0.5 text-[10px] font-extrabold text-primary-foreground transition-colors hover:bg-primary",
            quick ? "rounded-l-md" : "rounded-md",
            !best &&
              "border-rec-unavailable-border bg-rec-unavailable-bg text-rec-unavailable-fg hover:bg-rec-unavailable-bg/80",
          )}
        >
          <Star className="size-3 shrink-0" aria-hidden />
          {variant !== "icon" && (
            <span className="truncate">
              {best
                ? variant === "compact"
                  ? firstName
                  : `Suggested: ${best.name}`
                : variant === "compact"
                  ? "None"
                  : "No technician available now"}
            </span>
          )}
        </PopoverTrigger>
        {quick && (
          <button
            type="button"
            aria-label={`Assign to ${best.name}`}
            title={`Assign to ${best.name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              quick();
            }}
            className="flex items-center rounded-r-md border border-l-0 border-primary/25 bg-primary px-1 text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <ArrowRight className="size-3 shrink-0" aria-hidden />
          </button>
        )}
      </span>

      <PopoverContent align="start" className="w-80 p-3">
        <p className="text-xs font-extrabold text-foreground">Recommended technicians</p>
        <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
          Turn fairness first, service total breaks ties · you decide by dragging the card or
          accepting the suggestion.
        </p>
        {best?.reason && (
          <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary">
            Why {best.name}: {best.reason}
          </p>
        )}
        {quick && best && (
          <button
            type="button"
            onClick={quick}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Assign to {best.name}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
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
                      ? "bg-rec-unavailable-bg text-rec-unavailable-fg"
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
                <span
                  className={cn(
                    "block text-[11px] font-semibold",
                    candidate.quality === "ineligible"
                      ? "text-rec-unavailable-fg"
                      : "text-muted-foreground",
                  )}
                >
                  {candidate.quality === "ineligible"
                    ? `Unavailable · ${candidate.detail}`
                    : `${candidate.state} · ${candidate.detail}`}
                </span>
              </span>
            </li>
          ))}
        </ol>

      </PopoverContent>
    </Popover>
  );
}
