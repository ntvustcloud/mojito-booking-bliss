import { cn } from "@/lib/utils";

/**
 * Visual turn strip: one small square per full turn, a half square for ½.
 * Read at a glance from across the salon — no numbers needed.
 */
export function TurnStrip({
  total,
  max = 8,
  className,
}: {
  total: number;
  max?: number;
  className?: string;
}) {
  const full = Math.floor(total + 1e-9);
  const half = total - full >= 0.5 - 1e-9;
  const shown = Math.min(full, max);
  const overflow = full - shown;

  return (
    <span
      className={cn("inline-flex items-center gap-[2px]", className)}
      title={`${total.toFixed(1)} turns today`}
      aria-label={`${total.toFixed(1)} turns today`}
    >
      {Array.from({ length: shown }).map((_, index) => (
        <span key={index} className="size-2 rounded-[2px] bg-primary/80" aria-hidden />
      ))}
      {half && shown < max && (
        <span
          className="size-2 rounded-[2px] border border-primary/60 bg-gradient-to-r from-primary/80 to-transparent"
          aria-hidden
        />
      )}
      {shown === 0 && !half && (
        <span className="size-2 rounded-[2px] border border-dashed border-border" aria-hidden />
      )}
      {overflow > 0 && (
        <span className="text-[9px] font-extrabold text-primary">+{overflow}</span>
      )}
    </span>
  );
}
