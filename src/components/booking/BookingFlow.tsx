import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CircleSlash,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppointment } from "@/state/appointment";
import { formatDuration, formatPrice } from "@/data/services";
import { salon, technicians } from "@/data/salon";
import { cn } from "@/lib/utils";

type Slot = { label: string; minutes: number };

const STEPS = ["Your Services", "Technician", "Date & Time", "Your Details", "Review"] as const;

const OPEN_MINUTES = 9.5 * 60;
const CLOSE_MINUTES = 19 * 60;

function buildSlots(dayIndex: number, requiredDuration: number): Slot[] {
  const slots: Slot[] = [];
  for (let minutes = OPEN_MINUTES; minutes <= CLOSE_MINUTES - 30; minutes += 30) {
    // Only offer slots that can hold the whole estimated duration before closing.
    if (minutes + Math.max(requiredDuration, 30) > CLOSE_MINUTES) continue;
    // Deterministic pseudo-availability placeholder until real availability is wired up.
    if ((minutes / 30 + dayIndex * 3) % 5 === 0) continue;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour;
    slots.push({
      label: `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`,
      minutes,
    });
  }
  return slots;
}

export function BookingFlow() {
  const {
    selectedServices,
    savedDesign,
    totalPrice,
    totalDuration,
    count,
    removeService,
    clearAll,
  } = useAppointment();

  const [step, setStep] = useState(0);
  const [technicianId, setTechnicianId] = useState("any");
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", notes: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [days, setDays] = useState<{ label: string; weekday: string; dayNum: string }[]>([]);

  // Dates are computed after hydration so server and client markup always match.
  useEffect(() => {
    const list = Array.from({ length: 10 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      return {
        label: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      };
    });
    setDays(list);
  }, []);

  const slots = useMemo(() => buildSlots(dayIndex, totalDuration), [dayIndex, totalDuration]);
  const technician = technicians.find((tech) => tech.id === technicianId) ?? technicians[0]!;
  const selectedDay = days[dayIndex];

  const detailsValid =
    details.name.trim().length > 1 &&
    details.phone.trim().length >= 7 &&
    /.+@.+\..+/.test(details.email);

  const canContinue = [
    count > 0,
    Boolean(technicianId),
    Boolean(time),
    detailsValid,
    true,
  ][step];

  if (confirmed) {
    return (
      <Confirmation
        technicianName={technician.name}
        dayLabel={selectedDay?.label ?? "Your selected date"}
        time={time ?? ""}
        onReset={() => {
          clearAll();
          setConfirmed(false);
          setStep(0);
          setTime(null);
          setDetails({ name: "", phone: "", email: "", notes: "" });
        }}
      />
    );
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <h2 className="text-2xl">Your appointment is empty</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Pick the services you'd like first — they'll be waiting for you here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/services">Browse services</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/gallery">See the gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
      <div>
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
                  index === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < step
                      ? "border-border bg-secondary text-secondary-foreground"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
          {step === 0 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Your Services</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {count} {count === 1 ? "service" : "services"} · estimated{" "}
                {formatPrice(totalPrice)} · about {formatDuration(totalDuration)}
              </p>
              <ul className="mt-6 space-y-3">
                {selectedServices.map((service) => (
                  <li
                    key={service.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-4"
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
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/services">
                  <Plus /> Add Additional Services
                </Link>
              </Button>
            </section>
          )}

          {step === 1 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Choose Technician</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Any available technician usually means an earlier opening.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {technicians.map((tech) => (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => setTechnicianId(tech.id)}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                      technicianId === tech.id
                        ? "border-primary bg-secondary/60"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-lg font-extrabold text-primary">
                      {tech.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{tech.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {tech.specialties.join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Date & Time</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Showing openings long enough for {formatDuration(totalDuration)} of services.
              </p>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                {days.map((day, index) => (
                  <button
                    key={day.label}
                    type="button"
                    onClick={() => {
                      setDayIndex(index);
                      setTime(null);
                    }}
                    className={cn(
                      "shrink-0 rounded-2xl border px-4 py-3 text-center transition-colors",
                      dayIndex === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wider">
                      {day.weekday}
                    </span>
                    <span className="block text-sm font-bold">{day.dayNum}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => setTime(slot.label)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-bold transition-colors",
                      time === slot.label
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              {slots.length === 0 && (
                <p className="mt-6 text-sm text-muted-foreground">
                  No openings long enough on this day. Try another date or remove a service.
                </p>
              )}

              <button
                type="button"
                onClick={() => setGroupOpen(true)}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <Users className="h-4 w-4" /> Booking for 2 or more people? Group Booking
              </button>
            </section>
          )}

          {step === 3 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Customer Information</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No account needed — we only use this to hold your appointment.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={details.name}
                    onChange={(event) => setDetails({ ...details, name: event.target.value })}
                    placeholder="Jamie Rivera"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={details.phone}
                    onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                    placeholder="(512) 555-0123"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={details.email}
                    onChange={(event) => setDetails({ ...details, email: event.target.value })}
                    placeholder="you@email.com"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={details.notes}
                    onChange={(event) => setDetails({ ...details, notes: event.target.value })}
                    placeholder="Shape preference, sensitivities, parking questions…"
                  />
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Review</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <ReviewRow label="Services">
                  <ul className="space-y-1">
                    {selectedServices.map((service) => (
                      <li key={service.id}>
                        {service.name} — {formatPrice(service.price)} ·{" "}
                        {formatDuration(service.duration)}
                      </li>
                    ))}
                  </ul>
                </ReviewRow>
                <ReviewRow label="Estimated price">{formatPrice(totalPrice)}</ReviewRow>
                <ReviewRow label="Estimated duration">{formatDuration(totalDuration)}</ReviewRow>
                <ReviewRow label="Technician">{technician.name}</ReviewRow>
                <ReviewRow label="Date">{selectedDay?.label ?? "—"}</ReviewRow>
                <ReviewRow label="Time">{time ?? "—"}</ReviewRow>
                <ReviewRow label="Contact">
                  {details.name}
                  <br />
                  {details.phone}
                  <br />
                  {details.email}
                </ReviewRow>
                <ReviewRow label="Nail inspiration">
                  {savedDesign ? (
                    <span className="inline-grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                      <img
                        src={savedDesign.image}
                        alt={savedDesign.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <span className="min-w-0">{savedDesign.name}</span>
                    </span>
                  ) : (
                    "None saved"
                  )}
                </ReviewRow>
                <ReviewRow label="Notes">{details.notes.trim() || "—"}</ReviewRow>
              </dl>
            </section>
          )}

          <Separator className="my-8" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0}
            >
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                size="lg"
                disabled={!canContinue}
                onClick={() => setStep((value) => value + 1)}
              >
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" onClick={() => setConfirmed(true)}>
                Confirm Appointment <Check />
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border bg-secondary/50 p-6">
          <h3 className="text-lg">Appointment summary</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {selectedServices.map((service) => (
              <li key={service.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{service.name}</span>
                <span className="shrink-0 font-semibold text-foreground">
                  {formatPrice(service.price)}
                </span>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Total</span>
              <span className="text-lg font-extrabold">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Duration</span>
              <span className="font-bold">{formatDuration(totalDuration)}</span>
            </div>
          </div>
          {savedDesign && (
            <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-card p-3">
              <img
                src={savedDesign.image}
                alt={savedDesign.name}
                width={48}
                height={48}
                loading="lazy"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{savedDesign.name}</p>
                <p className="text-xs text-muted-foreground">Saved inspiration</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl">Group Booking</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Group Booking is coming soon. For two or more guests, please call us at {salon.phone} and
            we'll arrange chairs side by side.
          </DialogDescription>
          <Button className="mt-2" onClick={() => setGroupOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border pb-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-bold">{label}</dt>
      <dd className="min-w-0 text-muted-foreground">{children}</dd>
    </div>
  );
}

function Confirmation({
  technicianName,
  dayLabel,
  time,
  onReset,
}: {
  technicianName: string;
  dayLabel: string;
  time: string;
  onReset: () => void;
}) {
  const { selectedServices, savedDesign, totalPrice, totalDuration } = useAppointment();

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
        <Check className="h-7 w-7" />
      </span>
      <h2 className="mt-6 text-3xl">Appointment confirmed</h2>
      <p className="mt-3 text-muted-foreground">
        We've saved your spot. You'll see a reminder option here once messaging is switched on.
      </p>

      <div className="mt-8 space-y-4 rounded-2xl bg-secondary/50 p-6 text-left text-sm">
        <p className="text-lg font-extrabold">
          {dayLabel} · {time}
        </p>
        <div>
          <p className="font-bold">Services</p>
          <ul className="mt-1 text-muted-foreground">
            {selectedServices.map((service) => (
              <li key={service.id}>{service.name}</li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            Estimated {formatPrice(totalPrice)} · {formatDuration(totalDuration)}
          </p>
        </div>
        <div>
          <p className="font-bold">Technician</p>
          <p className="text-muted-foreground">{technicianName}</p>
        </div>
        {savedDesign && (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <img
              src={savedDesign.image}
              alt={savedDesign.name}
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="font-bold">Saved design</p>
              <p className="truncate text-muted-foreground">{savedDesign.name}</p>
            </div>
          </div>
        )}
        <div>
          <p className="font-bold">{salon.name}</p>
          <p className="text-muted-foreground">{salon.address}</p>
          <p className="text-muted-foreground">{salon.phone}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {[
          { icon: CalendarClock, label: "Reschedule" },
          { icon: CircleSlash, label: "Cancel" },
          { icon: BellRing, label: "SMS Reminder" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border p-4 text-xs font-semibold text-muted-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <span className="text-[0.65rem] font-normal">Coming soon</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/">Back to home</Link>
        </Button>
        <Button size="lg" variant="outline" onClick={onReset}>
          <RotateCcw /> Start a new appointment
        </Button>
      </div>
    </div>
  );
}
