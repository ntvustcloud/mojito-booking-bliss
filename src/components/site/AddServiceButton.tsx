import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppointment } from "@/state/appointment";
import type { Service } from "@/data/services";
import { cn } from "@/lib/utils";

type Props = {
  service: Service;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function AddServiceButton({ service, size = "sm", className }: Props) {
  const { hasService, addService } = useAppointment();
  const added = hasService(service.id);

  return (
    <Button
      type="button"
      size={size}
      variant={added ? "added" : "default"}
      className={cn("w-full sm:w-auto", className)}
      aria-pressed={added}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (added) return;
        addService(service.id);
        toast.success(`${service.name} added`, {
          description: "Keep exploring — your appointment is saved.",
        });
      }}
    >
      {added ? <Check /> : <Plus />}
      {added ? "Added" : "Add to Appointment"}
    </Button>
  );
}
