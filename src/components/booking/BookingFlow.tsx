import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarDays,
  Check,
  CircleSlash,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAppointment } from "@/state/appointment";
import { BookingMenu } from "@/components/booking/BookingMenu";
import { formatDuration, formatPrice, getService } from "@/data/services";
import { salon, technicians } from "@/data/salon";
import {
  BOOKING_WINDOW_MONTHS,
  MAX_PARTY_SIZE,
  QUICK_DAYS,
  SCHEDULING_PREFERENCES,
  isDateAvailable,
  type GroupSchedulingPreference,
} from "@/data/booking-config";
import { cn } from "@/lib/utils";

type Slot = { label: string; minutes: number };

const STEPS = ["Your Services", "Technician", "Date & Time", "Your Details", "Review"] as const;

const OPEN_MINUTES = 9.5 * 60;
const CLOSE_MINUTES = 19 * 60;

const YOU_ID = "you";

type Guest = { id: string; name: string; serviceIds: string[] };

function buildSlots(dayIndex: number, requiredDuration: number, partySize: number): Slot[] {
  const slots: Slot[] = [];
  for (let minutes = OPEN_MINUTES; minutes <= CLOSE_MINUTES - 30; minutes += 30) {
    // Only offer slots that can hold the whole estimated duration before closing.
    if (minutes + Math.max(requiredDuration, 30) > CLOSE_MINUTES) continue;
    // Deterministic pseudo-availability placeholder until real availability is wired up.
    if ((minutes / 30 + dayIndex * 3) % 5 === 0) continue;
    // Larger parties need more chairs free at once, so fewer starts qualify.
    if (partySize > 2 && (minutes / 30 + dayIndex) % 3 === 0) continue;
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

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function longDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function BookingFlow() {
  const { selectedServices, totalPrice, totalDuration, count, addService, removeService, clearAll } =
    useAppointment();

  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [activePersonId, setActivePersonId] = useState<string>(YOU_ID);
  const [technicianIds, setTechnicianIds] = useState<Record<string, string>>({ [YOU_ID]: "any" });
  const [scheduling, setScheduling] = useState<GroupSchedulingPreference>("together");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", notes: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  // Dates are computed after hydration so server and client markup always match.
  useEffect(() => {
    const start = startOfDay(new Date());
    setToday(start);
    setCalendarMonth(start);
  }, []);

  const quickDays = useMemo(() => {
    if (!today) return [] as Date[];
    return Array.from({ length: QUICK_DAYS }).map((_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [today]);

  const people = useMemo(() => {
    const guestPeople = guests.map((guest, index) => ({
      id: guest.id,
      label: guest.name.trim() || `Guest ${index + 2}`,
      serviceIds: guest.serviceIds,
      services: guest.serviceIds
        .map((id) => getService(id))
        .filter((service): service is NonNullable<typeof service> => Boolean(service)),
    }));
    return [
      {
        id: YOU_ID,
        label: details.name.trim() || "You",
        serviceIds: selectedServices.map((service) => service.id),
        services: selectedServices,
      },
      ...guestPeople,
    ];
  }, [guests, selectedServices, details.name]);

  const partySize = people.length;
  const groupTotalPrice = people.reduce(
    (sum, person) => sum + person.services.reduce((acc, service) => acc + service.price, 0),
    0,
  );
  const groupDuration = Math.max(
    ...people.map((person) => person.services.reduce((acc, service) => acc + service.duration, 0)),
    totalDuration,
  );
  const groupServiceCount = people.reduce((sum, person) => sum + person.services.length, 0);

  const maxDate = useMemo(() => {
    if (!today) return undefined;
    const max = new Date(today);
    max.setMonth(max.getMonth() + BOOKING_WINDOW_MONTHS);
    return max;
  }, [today]);

  const dayIndex = useMemo(() => {
    if (!today || !selectedDate) return 0;
    return Math.round((startOfDay(selectedDate).getTime() - today.getTime()) / 86_400_000);
  }, [today, selectedDate]);

  const slots = useMemo(
    () => (selectedDate ? buildSlots(dayIndex, groupDuration, partySize) : []),
    [selectedDate, dayIndex, groupDuration, partySize],
  );

  const activePerson = people.find((person) => person.id === activePersonId) ?? people[0]!;

  const toggleForActive = (serviceId: string) => {
    if (activePerson.id === YOU_ID) {
      if (selectedServices.some((service) => service.id === serviceId)) removeService(serviceId);
      else addService(serviceId);
      return;
    }
    setGuests((current) =>
      current.map((guest) =>
        guest.id === activePerson.id
          ? {
              ...guest,
              serviceIds: guest.serviceIds.includes(serviceId)
                ? guest.serviceIds.filter((id) => id !== serviceId)
                : [...guest.serviceIds, serviceId],
            }
          : guest,
      ),
    );
  };

  const removeForPerson = (personId: string, serviceId: string) => {
    if (personId === YOU_ID) {
      removeService(serviceId);
      return;
    }
    setGuests((current) =>
      current.map((guest) =>
        guest.id === personId
          ? { ...guest, serviceIds: guest.serviceIds.filter((id) => id !== serviceId) }
          : guest,
      ),
    );
  };

  const addGuest = () => {
    if (partySize >= MAX_PARTY_SIZE) return;
    const id = `guest-${Date.now()}`;
    setGuests((current) => [...current, { id, name: "", serviceIds: [] }]);
    setTechnicianIds((current) => ({ ...current, [id]: "any" }));
    setActivePersonId(id);
  };

  const removeGuest = (id: string) => {
    setGuests((current) => current.filter((guest) => guest.id !== id));
    if (activePersonId === id) setActivePersonId(YOU_ID);
  };

  const detailsValid = details.name.trim().length > 1 && details.phone.trim().length >= 7;
  const everyoneHasServices = people.every((person) => person.services.length > 0);

  const canContinue = [
    count > 0 && everyoneHasServices,
    true,
    Boolean(selectedDate && time),
    detailsValid,
    true,
  ][step];

  const technicianNameFor = (personId: string) =>
    technicians.find((tech) => tech.id === (technicianIds[personId] ?? "any"))?.name ??
    "Any Available Technician";

  if (confirmed) {
    return (
      <Confirmation
        people={people.map((person) => ({
          label: person.label,
          services: person.services.map((service) => service.name),
          technician: technicianNameFor(person.id),
        }))}
        totalPrice={groupTotalPrice}
        dayLabel={selectedDate ? longDate(selectedDate) : "Your selected date"}
        time={time ?? ""}
        onReset={() => {
          clearAll();
          setConfirmed(false);
          setStep(0);
          setGuests([]);
          setActivePersonId(YOU_ID);
          setTechnicianIds({ [YOU_ID]: "any" });
          setSelectedDate(null);
          setTime(null);
          setDetails({ name: "", phone: "", notes: "" });
        }}
      />
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
                {groupServiceCount} {groupServiceCount === 1 ? "service" : "services"} · estimated{" "}
                {formatPrice(groupTotalPrice)}
                {partySize > 1 ? ` · ${partySize} people` : ` · about ${formatDuration(totalDuration)}`}
              </p>

              <div className="mt-6 space-y-4">
                {people.map((person, index) => {
                  const isYou = person.id === YOU_ID;
                  const guest = guests.find((item) => item.id === person.id);
                  return (
                    <div
                      key={person.id}
                      className={cn(
                        "rounded-2xl border p-5",
                        activePersonId === person.id ? "border-primary" : "border-border",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-extrabold">
                          {isYou ? `Person 1 — ${person.label}` : `Person ${index + 1} — Guest`}
                        </h3>
                        {!isYou && (
                          <button
                            type="button"
                            onClick={() => removeGuest(person.id)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" /> Remove guest
                          </button>
                        )}
                      </div>

                      {!isYou && guest && (
                        <div className="mt-4 grid max-w-xs gap-2">
                          <Label htmlFor={`guest-name-${person.id}`}>Guest name (optional)</Label>
                          <Input
                            id={`guest-name-${person.id}`}
                            value={guest.name}
                            placeholder={person.label}
                            onChange={(event) =>
                              setGuests((current) =>
                                current.map((item) =>
                                  item.id === person.id
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      )}

                      {person.services.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                          No services yet — use the menu below to choose services for{" "}
                          {isYou ? "yourself" : person.label}.
                        </p>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {person.services.map((service) => (
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
                                onClick={() => removeForPerson(person.id, service.id)}
                                aria-label={`Remove ${service.name}`}
                                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                <Trash2 className="h-4 w-4" /> Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant={activePersonId === person.id ? "default" : "outline"}
                          onClick={() => setActivePersonId(person.id)}
                        >
                          <Plus />{" "}
                          {person.services.length === 0 ? "Choose Services" : "Add Service"}
                        </Button>
                        {isYou && (
                          <Button asChild variant="ghost">
                            <Link to="/services">Browse Our Services</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {partySize < MAX_PARTY_SIZE ? (
                <Button variant="outline" className="mt-5" onClick={addGuest}>
                  <UserPlus /> {partySize === 1 ? "Add Guest" : "Add Another Guest"}
                </Button>
              ) : (
                <p className="mt-5 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                  Party of {MAX_PARTY_SIZE + 1} or more? Please call the salon at {salon.phone} so we
                  can help arrange your visit.
                </p>
              )}

              <div className="mt-8">
                <BookingMenu
                  heading="Full Salon Menu"
                  description={
                    partySize > 1
                      ? `Tap + to add a service for ${activePerson.label}.`
                      : "Tap + to add a service straight to your appointment."
                  }
                  selectedIds={activePerson.serviceIds}
                  onToggle={toggleForActive}
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Choose Technician</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Any Available Technician usually means an earlier opening — it's already selected.
              </p>

              <div className="mt-6 space-y-8">
                {people.map((person) => (
                  <div key={person.id}>
                    <h3 className="font-extrabold">{person.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {person.services.map((service) => service.name).join(" + ") ||
                        "No services selected"}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {technicians.map((tech) => {
                        const active = (technicianIds[person.id] ?? "any") === tech.id;
                        return (
                          <button
                            key={tech.id}
                            type="button"
                            onClick={() =>
                              setTechnicianIds((current) => ({ ...current, [person.id]: tech.id }))
                            }
                            className={cn(
                              "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                              active
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {partySize > 1 && (
                <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-5">
                  <h3 className="font-extrabold">How would your group like to be scheduled?</h3>
                  <div className="mt-4 grid gap-3">
                    {SCHEDULING_PREFERENCES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setScheduling(option.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          scheduling === option.id
                            ? "border-primary bg-card"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span className="block font-bold">{option.label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    We'll do our best — simultaneous start times can't be guaranteed.
                  </p>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Date & Time</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {partySize > 1
                  ? `Showing dates available for your party of ${partySize}.`
                  : "Pick a day to see available times."}
              </p>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                {quickDays.map((date) => {
                  const available = isDateAvailable(date, partySize);
                  const active =
                    selectedDate && startOfDay(selectedDate).getTime() === startOfDay(date).getTime();
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        setSelectedDate(date);
                        setTime(null);
                      }}
                      className={cn(
                        "shrink-0 rounded-2xl border px-4 py-3 text-center transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : available
                            ? "border-border hover:border-primary/40"
                            : "border-border/60 text-muted-foreground/50 line-through",
                      )}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wider">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="block text-sm font-bold">
                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" className="mt-4" onClick={() => setCalendarOpen(true)}>
                <CalendarDays /> View Calendar
              </Button>

              {selectedDate ? (
                <div className="mt-8">
                  <h3 className="text-lg font-extrabold">{longDate(selectedDate)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {partySize > 1 ? `Available for your party of ${partySize}` : "Available Times"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    <p className="mt-4 text-sm text-muted-foreground">
                      No openings long enough on this day. Try another date or remove a service.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-8 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Choose a date above to see available times.
                </p>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Contact Information</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No account needed — we only use this to hold your appointment.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={details.name}
                    onChange={(event) => setDetails({ ...details, name: event.target.value })}
                    placeholder="Jamie Rivera"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={details.phone}
                    onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                    placeholder="(512) 555-0123"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={details.notes}
                    onChange={(event) => setDetails({ ...details, notes: event.target.value })}
                    placeholder="Optional — add anything you'd like us to know."
                  />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                We'll use this phone number as the primary contact for everyone in this booking.
              </p>
            </section>
          )}

          {step === 4 && (
            <section className="fade-soft">
              <h2 className="text-2xl">Review Your Appointment</h2>
              <p className="mt-2 text-lg font-extrabold">
                {selectedDate ? longDate(selectedDate) : "—"} · {time ?? "—"}
              </p>

              <div className="mt-6 space-y-4">
                {people.map((person) => (
                  <div key={person.id} className="rounded-2xl border border-border p-5">
                    <h3 className="font-extrabold">{person.label}</h3>
                    <ul className="mt-2 text-sm text-muted-foreground">
                      {person.services.map((service) => (
                        <li key={service.id}>
                          {service.name} — {formatPrice(service.price)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tech: {technicianNameFor(person.id)}
                    </p>
                  </div>
                ))}
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                {partySize > 1 && (
                  <>
                    <ReviewRow label="Party size">{partySize} guests</ReviewRow>
                    <ReviewRow label="Scheduling">
                      {SCHEDULING_PREFERENCES.find((option) => option.id === scheduling)?.label}
                    </ReviewRow>
                  </>
                )}
                <ReviewRow label="Estimated total">{formatPrice(groupTotalPrice)}</ReviewRow>
                <ReviewRow label="Primary contact">
                  {details.name}
                  <br />
                  {details.phone}
                </ReviewRow>
                <ReviewRow label="Note">{details.notes.trim() || "—"}</ReviewRow>
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
          {people.map((person) => (
            <div key={person.id} className="mt-4">
              {partySize > 1 && (
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {person.label}
                </p>
              )}
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {person.services.map((service) => (
                  <li key={service.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{service.name}</span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {formatPrice(service.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Separator className="my-4" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Total</span>
              <span className="text-lg font-extrabold">{formatPrice(groupTotalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {partySize > 1 ? "Longest Visit" : "Estimated Duration"}
              </span>
              <span className="font-bold">{formatDuration(groupDuration)}</span>
            </div>
          </div>
        </div>
      </aside>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] p-4 sm:max-w-lg sm:p-6">
          <DialogTitle className="text-xl">Choose a date</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Book up to {BOOKING_WINDOW_MONTHS} months ahead. Muted dates aren't available.
          </DialogDescription>
          <Calendar
            mode="single"
            {...(selectedDate ? { selected: selectedDate } : {})}
            {...(calendarMonth ? { month: calendarMonth } : {})}
            onMonthChange={setCalendarMonth}
            {...(today ? { startMonth: today } : {})}
            {...(maxDate ? { endMonth: maxDate } : {})}
            disabled={(date) => !isDateAvailable(date, partySize)}
            onSelect={(date) => {
              if (!date) return;
              setSelectedDate(date);
              setTime(null);
              setCalendarOpen(false);
            }}
            className="pointer-events-auto mx-auto w-full [--cell-size:2.75rem] sm:[--cell-size:2.5rem]"
          />
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
  people,
  totalPrice,
  dayLabel,
  time,
  onReset,
}: {
  people: { label: string; services: string[]; technician: string }[];
  totalPrice: number;
  dayLabel: string;
  time: string;
  onReset: () => void;
}) {
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
        {people.map((person) => (
          <div key={person.label}>
            <p className="font-bold">{person.label}</p>
            <ul className="mt-1 text-muted-foreground">
              {person.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">Tech: {person.technician}</p>
          </div>
        ))}
        <p className="text-muted-foreground">Estimated {formatPrice(totalPrice)}</p>
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
