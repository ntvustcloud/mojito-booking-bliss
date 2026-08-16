import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppointment } from "@/state/appointment";
import { formatDuration, formatPrice } from "@/data/services";

function TrayBody({ onClose }: { onClose: () => void }) {
  const { selectedServices, totalPrice, totalDuration, removeService } = useAppointment();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-1 pb-4">
        <section>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Services
          </h3>
          {selectedServices.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing selected yet. Add services as you browse the menu.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {selectedServices.map((service) => (
                <li
                  key={service.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(service.price)} · {formatDuration(service.duration)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    aria-label={`Remove ${service.name}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated Total</span>
            <span className="text-lg font-extrabold">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated Duration</span>
            <span className="font-bold">{formatDuration(totalDuration)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" disabled={selectedServices.length === 0}>
            <Link to="/book" onClick={onClose}>
              Continue to Booking <ArrowRight />
            </Link>
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Continue Browsing
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppointmentTray() {
  const { count, totalPrice, trayOpen, setTrayOpen } = useAppointment();
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const hidden = count === 0 || pathname.startsWith("/book");

  return (
    <>
      {!hidden && (
        <>
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="fixed bottom-6 right-6 z-30 hidden items-center gap-3 rounded-full bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-lift transition-colors hover:bg-sage-deep lg:inline-flex"
          >
            <ShoppingBag className="h-4 w-4" />
            Your Appointment · {count}
          </button>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setTrayOpen(true)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">Your Appointment · {count}</span>
                <span className="block text-xs text-muted-foreground">
                  Estimated {formatPrice(totalPrice)}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                View <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </>
      )}

      {isMobile ? (
        <Drawer open={trayOpen} onOpenChange={setTrayOpen}>
          <DrawerContent className="max-h-[88vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-xl">Your Appointment</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden px-4 pb-6">
              <TrayBody onClose={() => setTrayOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={trayOpen} onOpenChange={setTrayOpen}>
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-xl">Your Appointment</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <TrayBody onClose={() => setTrayOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
