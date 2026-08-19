import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salon } from "@/data/salon";
import { getService } from "@/data/services";
import {
  technicianBlockouts,
  todayAppointments,
  type Appointment,
} from "@/data/manager-mock";
import { buildBlocks, isQueued } from "@/data/schedule";
import {
  addCheckIn,
  useCheckIns,
  walkInAppointments,
} from "@/data/check-in-store";
import {
  checkInOutcome,
  findMatches,
  walkInMinutes,
  type CheckInOutcome,
  type MatchedAppointment,
} from "@/data/check-in";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [
      { title: "Check In — Mojito Nail Salon" },
      {
        name: "description",
        content:
          "Arrived at Mojito Nail Salon? Check in with your name and phone number and we'll let your technician know you're here.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Check In — Mojito Nail Salon" },
      {
        property: "og:description",
        content: "Fast, private self check-in for guests arriving at Mojito Nail Salon.",
      },
    ],
  }),
  component: CheckInKiosk;
});

type Step =
  | "welcome"
  | "choose"
  | "confirm"
  | "not-found"
  | "retry"
  | "retry-failed"
  | "walk-in"
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

const RESET_MS = 13_000;

function CheckInKiosk() {
  const records = useCheckIns();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [approxTime, setApproxTime] = useState("");
  const [matches, setMatches] = useState<MatchedAppointment[]>([]);
  const [selected, setSelected] = useState<MatchedAppointment | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
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

  function reset() {
    setStep("welcome");
    setName("");
    setPhone("");
    setApproxTime("");
    setMatches([]);
    setSelected(null);
    setServiceIds([]);
    setOutcome(null);
  }

  // Privacy: the tablet is shared, so a success screen always clears itself.
  useEffect(() => {
    if (step !== "success") return;
    const id = window.setTimeout(reset, RESET_MS);
    return () => window.clearTimeout(id);
  }, [step]);

  function search(approx?: number) {
    const found = findMatches(appointments, name, phone, records, approx);
    setMatches(found);
    if (found.length === 1) {
      setSelected(found[0]!);
      setStep("confirm");
    } else if (found.length > 1) {
      setStep("choose");
    } else {
      setStep(step === "retry" ? "retry-failed" : "not-found");
    }
  }

  function confirmAppointment(match: MatchedAppointment) {
    const now = nowMinutes ?? match.appointment.minutes;
    addCheckIn({
      kind: "Appointment",
      name: name.trim() || match.guest.name,
      phone: phone.trim(),
      atMinutes: now,
      appointmentId: match.appointment.id,
      guestId: match.guest.id,
    });
    setOutcome(
      checkInOutcome({
        appointments,
        blockouts: technicianBlockouts,
        now,
        technicianId: match.guest.technicianId,
        scheduledMinutes: match.appointment.minutes,
        queueAhead,
      }),
    );
    setSelected(match);
    setStep("success");
  }

  function confirmWalkIn() {
    const now = nowMinutes ?? 9 * 60;
    const chosen = serviceIds.filter((id) => id !== "unsure");
    addCheckIn({
      kind: "Walk-In",
      name: name.trim(),
      phone: phone.trim(),
      atMinutes: now,
      serviceIds: chosen,
    });
    setOutcome(
      checkInOutcome({
        appointments,
        blockouts: technicianBlockouts,
        now,
        serviceMinutes: walkInMinutes(chosen),
        queueAhead,
      }),
    );
    setStep("success");
  }

  const canSubmit = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 7;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-6 pt-10 text-center sm:pt-14">
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-primary">
          {salon.name}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-8">
        {step === "welcome" && (
          <section className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Welcome!
            </h1>
            <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
              Please check in below.
            </p>

            <div className="mt-10 space-y-6 text-left">
              <Field
                id="kiosk-name"
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                autoComplete="off"
              />
              <Field
                id="kiosk-phone"
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                placeholder="(512) 555-0184"
                type="tel"
              />
            </div>

            <Button
              className="mt-10 h-16 w-full rounded-2xl text-xl font-extrabold"
              disabled={!canSubmit}
              onClick={() => search()}
            >
              Check In
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Name and phone only — nothing else is stored on this tablet.
            </p>
          </section>
        )}

        {step === "choose" && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Which appointment is yours?
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
                  className="w-full rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:bg-secondary"
                >
                  <p className="text-2xl font-extrabold">{match.timeLabel}</p>
                  <p className="mt-1 text-lg text-foreground">{match.serviceLabel}</p>
                  <p className="mt-1 text-base text-muted-foreground">
                    {match.technicianLabel ?? "Any available technician"}
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
              Welcome, {(name.trim() || selected.guest.name).split(" ")[0]}!
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">We found your appointment:</p>

            <div className="mt-8 rounded-3xl border border-border bg-card p-8">
              <p className="text-4xl font-extrabold text-foreground">{selected.timeLabel}</p>
              <p className="mt-2 text-xl text-foreground">{selected.serviceLabel}</p>
              <p className="mt-1 text-lg text-muted-foreground">
                {selected.technicianLabel ?? "Any available technician"}
              </p>
            </div>

            <Button
              className="mt-10 h-16 w-full rounded-2xl text-xl font-extrabold"
              onClick={() => confirmAppointment(selected)}
            >
              Check In for This Appointment
            </Button>
            <BackButton onClick={reset} label="Not me — start over" />
          </section>
        )}

        {step === "not-found" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              We couldn't find an appointment for today.
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">Choose one:</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-24 rounded-2xl text-lg font-extrabold"
                onClick={() => setStep("retry")}
              >
                <UserRound className="size-6" aria-hidden />
                I Have an Appointment
              </Button>
              <Button
                className="h-24 rounded-2xl text-lg font-extrabold"
                onClick={() => setStep("walk-in")}
              >
                <Sparkles className="size-6" aria-hidden />
                I'm a Walk-In
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "retry" && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Let's try again
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Your appointment may be under a different name or number.
            </p>
            <div className="mt-8 space-y-6">
              <Field
                id="retry-name"
                label="Booking Name"
                value={name}
                onChange={setName}
                placeholder="Name on the booking"
              />
              <Field
                id="retry-phone"
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                placeholder="(512) 555-0184"
                type="tel"
              />
              <Field
                id="retry-time"
                label="Approximate Appointment Time (optional)"
                value={approxTime}
                onChange={setApproxTime}
                placeholder="e.g. 2:00 PM"
              />
            </div>
            <Button
              className="mt-10 h-16 w-full rounded-2xl text-xl font-extrabold"
              disabled={!canSubmit}
              onClick={() => search(parseApproxTime(approxTime))}
            >
              Find My Appointment
            </Button>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "retry-failed" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              We couldn't locate your appointment.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Please see the front desk for help.
            </p>
            <Button
              variant="outline"
              className="mt-10 h-14 w-full rounded-2xl text-lg font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
          </section>
        )}

        {step === "walk-in" && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              What service are you interested in?
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">Tap all that apply.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {QUICK_SERVICES.map((option) => {
                const active = serviceIds.includes(option.id);
                const service = getService(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setServiceIds((current) =>
                        current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      )
                    }
                    className={`flex min-h-24 flex-col justify-center rounded-2xl border p-5 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-lg font-extrabold">
                      {active && <Check className="size-5" aria-hidden />}
                      {option.label}
                    </span>
                    {service && (
                      <span
                        className={`mt-1 text-sm ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                      >
                        From ${service.price}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              className="mt-10 h-16 w-full rounded-2xl text-xl font-extrabold"
              disabled={serviceIds.length === 0}
              onClick={confirmWalkIn}
            >
              Check In
            </Button>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "success" && outcome && (
          <section className="text-center">
            {outcome.ready ? (
              <>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  You're all set!
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">Please go to:</p>
                <p className="mt-2 text-7xl font-extrabold tracking-tight text-primary sm:text-8xl">
                  Station {outcome.station}
                </p>
                <p className="mt-6 text-xl text-foreground">
                  {outcome.technicianLabel} will be with you shortly.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  You're checked in!
                </h1>
                {outcome.technicianLabel && (
                  <p className="mt-4 text-lg text-foreground">
                    {outcome.technicianLabel} is finishing with another guest.
                  </p>
                )}
                <p className="mt-8 text-base font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Estimated wait
                </p>
                <p className="mt-2 flex items-center justify-center gap-3 text-4xl font-extrabold text-primary sm:text-5xl">
                  <Clock className="size-8" aria-hidden />
                  {outcome.waitLabel}
                </p>
                <p className="mt-8 text-xl text-foreground">
                  Please have a seat. We'll call you shortly.
                </p>
              </>
            )}
            <Button
              variant="outline"
              className="mt-12 h-14 w-full rounded-2xl text-lg font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              This screen clears itself in a few seconds.
            </p>
          </section>
        )}
      </main>

      <footer className="px-6 pb-8 text-center text-sm text-muted-foreground">
        Need help? Our front desk is happy to assist.
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
  autoComplete = "off",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-base font-bold text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-16 rounded-2xl bg-card px-5 text-xl"
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

/** "2", "2 pm", "14:30" → minutes from midnight. */
function parseApproxTime(value: string): number | undefined {
  const text = value.trim().toLowerCase();
  if (!text) return undefined;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const suffix = match[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!suffix && hour < 8) hour += 12;
  return hour * 60 + minute;
}
