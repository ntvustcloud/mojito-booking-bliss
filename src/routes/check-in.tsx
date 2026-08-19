import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Footprints, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { salon, technicians } from "@/data/salon";
import {
  technicianBlockouts,
  todayAppointments,
  type Appointment,
} from "@/data/manager-mock";
import { buildBlocks, isQueued } from "@/data/schedule";
import { addCheckIn, useCheckIns, walkInAppointments } from "@/data/check-in-store";
import {
  estimateWait,
  findByNameAndTime,
  findByPhone,
  formatPhone,
  parseApproxTime,
  phoneReady,
  walkInMinutes,
  type MatchedAppointment,
  type WaitEstimate,
} from "@/data/check-in";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [
      { title: "Check In — Mojito Nail Salon" },
      {
        name: "description",
        content:
          "Arrived at Mojito Nail Salon? Enter your phone number to check in and we'll let your technician know you're here.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Check In — Mojito Nail Salon" },
      {
        property: "og:description",
        content: "Fast, private self check-in for guests arriving at Mojito Nail Salon.",
      },
    ],
  }),
  component: CheckInKiosk,
});

type Step =
  | "phone"
  | "choose"
  | "confirm"
  | "no-match"
  | "find-appointment"
  | "front-desk"
  | "walk-in-details"
  | "walk-in-services"
  | "walk-in-tech"
  | "success";

const QUICK_SERVICES: { id: string; label: string }[] = [
  { id: "classic-manicure", label: "Manicure" },
  { id: "express-pedicure", label: "Basic Pedicure" },
  { id: "signature-pedicure", label: "Spa Pedicure" },
  { id: "deluxe-pedicure", label: "Deluxe Pedicure" },
  { id: "acrylic-full-set", label: "Acrylic Full Set" },
  { id: "acrylic-fill", label: "Acrylic Fill-In" },
  { id: "gel-x-full-set", label: "Gel-X" },
  { id: "unsure", label: "Other / Not Sure" },
];

/** Success screen clears itself; a half-finished flow clears itself too. */
const SUCCESS_RESET_MS = 10_000;
const IDLE_RESET_MS = 75_000;

type Success =
  | { kind: "Appointment"; firstName: string; technicianLabel?: string; station?: number; wait: WaitEstimate }
  | { kind: "Walk-In"; firstName: string; wait: WaitEstimate };

function CheckInKiosk() {
  const records = useCheckIns();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [approxTime, setApproxTime] = useState("");
  const [matches, setMatches] = useState<MatchedAppointment[]>([]);
  const [selected, setSelected] = useState<MatchedAppointment | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [preferredTech, setPreferredTech] = useState<string>("any");
  const [success, setSuccess] = useState<Success | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  /** Same day the manager sees: seeded bookings + kiosk walk-ins. */
  const appointments: Appointment[] = useMemo(
    () => [...todayAppointments, ...walkInAppointments(records)],
    [records],
  );

  const queueAhead = useMemo(() => {
    const now = nowMinutes ?? 0;
    return buildBlocks(appointments).filter((block) => isQueued(block) && block.anchor <= now)
      .length;
  }, [appointments, nowMinutes]);

  const reset = useCallback(() => {
    setStep("phone");
    setPhone("");
    setName("");
    setApproxTime("");
    setMatches([]);
    setSelected(null);
    setServiceIds([]);
    setPreferredTech("any");
    setSuccess(null);
  }, []);

  // Privacy: the tablet is shared, so success always clears itself.
  useEffect(() => {
    if (step !== "success") return;
    const id = window.setTimeout(reset, SUCCESS_RESET_MS);
    return () => window.clearTimeout(id);
  }, [step, reset]);

  // Privacy: an abandoned half-finished flow clears itself too.
  const idleRef = useRef(0);
  useEffect(() => {
    if (step === "phone") return;
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(reset, IDLE_RESET_MS);
    return () => window.clearTimeout(idleRef.current);
  }, [step, phone, name, approxTime, serviceIds, preferredTech, reset]);

  function lookupByPhone() {
    const found = findByPhone(appointments, phone, records);
    setMatches(found);
    if (found.length === 1) {
      setSelected(found[0]!);
      setStep("confirm");
    } else if (found.length > 1) {
      setStep("choose");
    } else {
      setStep("no-match");
    }
  }

  function lookupByName() {
    const found = findByNameAndTime(appointments, name, parseApproxTime(approxTime), records);
    if (found.length === 1) {
      setSelected(found[0]!);
      setStep("confirm");
    } else if (found.length > 1) {
      setMatches(found);
      setStep("choose");
    } else {
      setStep("front-desk");
    }
  }

  function checkInAppointment(match: MatchedAppointment) {
    const now = nowMinutes ?? match.appointment.minutes;
    addCheckIn({
      kind: "Appointment",
      name: match.guest.name,
      phone: phone.trim(),
      atMinutes: now,
      appointmentId: match.appointment.id,
      guestId: match.guest.id,
    });
    const requested = match.guest.requestedTechnicianId ?? match.guest.technicianId;
    setSuccess({
      kind: "Appointment",
      firstName: match.guest.name.split(" ")[0] ?? "there",
      ...(match.technicianLabel ? { technicianLabel: match.technicianLabel } : {}),
      ...(match.station ? { station: match.station } : {}),
      wait: estimateWait({
        appointments,
        blockouts: technicianBlockouts,
        now,
        ...(requested && requested !== "any" ? { technicianId: requested } : {}),
        scheduledMinutes: match.appointment.minutes,
        queueAhead,
      }),
    });
    setStep("success");
  }

  function checkInWalkIn() {
    const now = nowMinutes ?? 9 * 60;
    const chosen = serviceIds.filter((id) => id !== "unsure");
    addCheckIn({
      kind: "Walk-In",
      name: name.trim(),
      phone: phone.trim(),
      atMinutes: now,
      serviceIds: chosen,
      ...(preferredTech !== "any" ? { preferredTechnicianId: preferredTech } : {}),
    });
    setSuccess({
      kind: "Walk-In",
      firstName: name.trim().split(" ")[0] ?? "there",
      wait: estimateWait({
        appointments,
        blockouts: technicianBlockouts,
        now,
        queueAhead,
        serviceMinutes: walkInMinutes(chosen),
      }),
    });
    setStep("success");
  }

  const namedTechs = technicians.filter((technician) => technician.id !== "any");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-6 pt-10 text-center sm:pt-14">
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-primary">
          {salon.name}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-8">
        {step === "phone" && (
          <section className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Welcome!
            </h1>
            <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
              Please enter your phone number to check in.
            </p>

            <div className="mx-auto mt-10 max-w-xl text-left">
              <Label
                htmlFor="kiosk-phone"
                className="text-base font-bold uppercase tracking-wide text-muted-foreground"
              >
                Phone Number
              </Label>
              <Input
                id="kiosk-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                value={phone}
                onChange={(event) => setPhone(formatPhone(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && phoneReady(phone)) lookupByPhone();
                }}
                placeholder="(512) 555-0184"
                className="mt-3 h-20 rounded-2xl text-center text-3xl font-extrabold tracking-wider"
              />
            </div>

            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              disabled={!phoneReady(phone)}
              onClick={lookupByPhone}
            >
              Continue
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Your number is used only to find today's appointment.
            </p>
          </section>
        )}

        {step === "choose" && (
          <section>
            <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Who is checking in?
            </h1>
            <div className="mt-8 space-y-4">
              {matches.map((match) => (
                <button
                  key={`${match.appointment.id}:${match.guest.id}`}
                  type="button"
                  onClick={() => {
                    setSelected(match);
                    setStep("confirm");
                  }}
                  className="w-full rounded-3xl border border-border bg-card p-6 text-left transition-colors hover:bg-secondary"
                >
                  <p className="text-2xl font-extrabold text-foreground">{match.guest.name}</p>
                  <p className="mt-1 text-lg text-muted-foreground">
                    {match.timeLabel} · {match.serviceLabel}
                  </p>
                </button>
              ))}
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "confirm" && selected && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Hi {selected.guest.name.split(" ")[0]}!
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">We found your appointment:</p>

            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
              <p className="text-5xl font-extrabold text-foreground">{selected.timeLabel}</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{selected.serviceLabel}</p>
              <p className="mt-2 text-lg text-muted-foreground">
                {selected.technicianLabel
                  ? `with ${selected.technicianLabel}`
                  : "Any Available Technician"}
              </p>
            </div>

            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={() => checkInAppointment(selected)}
            >
              Check In
            </Button>
            <BackButton onClick={reset} label="Not me — start over" />
          </section>
        )}

        {step === "no-match" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              We couldn't find an appointment for this phone number.
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">Choose one:</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Button
                className="h-24 rounded-2xl text-xl font-extrabold"
                onClick={() => setStep("find-appointment")}
              >
                <Sparkles className="mr-2 size-6" aria-hidden />
                I Have an Appointment
              </Button>
              <Button
                variant="outline"
                className="h-24 rounded-2xl border-2 text-xl font-extrabold"
                onClick={() => setStep("walk-in-details")}
              >
                <Footprints className="mr-2 size-6" aria-hidden />
                I'm a Walk-In
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "find-appointment" && (
          <section>
            <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Let's find your appointment
            </h1>
            <div className="mx-auto mt-10 max-w-xl space-y-6">
              <Field id="find-name" label="Name" value={name} onChange={setName} placeholder="Your name" />
              <Field
                id="find-time"
                label="Approximate Appointment Time"
                value={approxTime}
                onChange={setApproxTime}
                placeholder="2:00 PM"
              />
              <Field
                id="find-phone"
                label="Phone Number"
                value={phone}
                onChange={(value) => setPhone(formatPhone(value))}
                placeholder="(512) 555-0184"
                type="tel"
              />
              <Button
                className="h-16 w-full rounded-2xl text-xl font-extrabold"
                disabled={name.trim().length < 2}
                onClick={lookupByName}
              >
                Find My Appointment
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "front-desk" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              We couldn't locate your appointment.
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Please see the front desk for help.
            </p>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
          </section>
        )}

        {step === "walk-in-details" && (
          <section>
            <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome in!
            </h1>
            <div className="mx-auto mt-10 max-w-xl space-y-6">
              <Field
                id="walk-name"
                label="First Name"
                value={name}
                onChange={setName}
                placeholder="Your first name"
              />
              <Field
                id="walk-phone"
                label="Phone Number"
                value={phone}
                onChange={(value) => setPhone(formatPhone(value))}
                placeholder="(512) 555-0184"
                type="tel"
              />
              <Button
                className="h-16 w-full rounded-2xl text-xl font-extrabold"
                disabled={name.trim().length < 2 || !phoneReady(phone)}
                onClick={() => setStep("walk-in-services")}
              >
                Continue
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "walk-in-services" && (
          <section>
            <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              What would you like today?
            </h1>
            <p className="mt-3 text-center text-lg text-muted-foreground">
              Tap everything you'd like — you can pick more than one.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {QUICK_SERVICES.map((service) => {
                const active = serviceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() =>
                      setServiceIds((current) =>
                        current.includes(service.id)
                          ? current.filter((id) => id !== service.id)
                          : [...current, service.id],
                      )
                    }
                    className={cn(
                      "flex h-20 items-center justify-between rounded-2xl border-2 px-6 text-left text-xl font-extrabold transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary",
                    )}
                  >
                    {service.label}
                    {active && <Check className="size-6 text-primary" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              disabled={serviceIds.length === 0}
              onClick={() => setStep("walk-in-tech")}
            >
              Continue
            </Button>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "walk-in-tech" && (
          <section>
            <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Do you have a preferred technician?
            </h1>
            <div className="mx-auto mt-8 max-w-xl space-y-3">
              <button
                type="button"
                onClick={() => setPreferredTech("any")}
                className={cn(
                  "flex h-20 w-full items-center justify-between rounded-2xl border-2 px-6 text-xl font-extrabold transition-colors",
                  preferredTech === "any"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                Any Available Technician
                {preferredTech === "any" && <Check className="size-6 text-primary" aria-hidden />}
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                {namedTechs.map((technician) => (
                  <button
                    key={technician.id}
                    type="button"
                    onClick={() => setPreferredTech(technician.id)}
                    className={cn(
                      "flex h-20 items-center justify-between rounded-2xl border-2 px-6 text-xl font-extrabold transition-colors",
                      preferredTech === technician.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {technician.name}
                    {preferredTech === technician.id && (
                      <Check className="size-6 text-primary" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={checkInWalkIn}
            >
              Check In
            </Button>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "success" && success && (
          <section className="text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15">
              <Check className="size-10 text-primary" aria-hidden />
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              You're checked in!
            </h1>

            {success.kind === "Appointment" && success.technicianLabel ? (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Your technician
                </p>
                <p className="mt-2 text-3xl font-extrabold text-foreground">
                  {success.technicianLabel}
                </p>
                {success.station !== undefined && (
                  <p className="mt-3 flex items-center justify-center gap-2 text-lg font-bold text-muted-foreground">
                    <MapPin className="size-5" aria-hidden />
                    Station {success.station}
                  </p>
                )}
                <p className="mt-5 text-xl text-foreground">
                  Please have a seat. {success.technicianLabel} will call you shortly.
                </p>
              </div>
            ) : (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Estimated wait
                </p>
                <p className="mt-2 flex items-center justify-center gap-2 text-3xl font-extrabold text-foreground">
                  <Clock className="size-7 text-primary" aria-hidden />
                  {success.wait.label}
                </p>
                <p className="mt-5 text-xl text-foreground">
                  Please have a seat.{" "}
                  {success.kind === "Walk-In"
                    ? "We'll call you when a technician is ready."
                    : "A team member will call you shortly."}
                </p>
              </div>
            )}

            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
          </section>
        )}
      </main>

      <footer className="px-6 pb-10 text-center text-sm text-muted-foreground">
        Need help? Our front desk team is happy to assist.
      </footer>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-base font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 h-16 rounded-2xl text-xl font-bold"
      />
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-8 flex items-center gap-2 text-base font-bold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}
