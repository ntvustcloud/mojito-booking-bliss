import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Footprints, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { salon } from "@/data/salon";
import { technicianBlockouts, todayAppointments, type Appointment } from "@/data/manager-mock";
import { buildBlocks, isQueued } from "@/data/schedule";
import { addCheckIn, useCheckIns, walkInAppointments } from "@/data/check-in-store";
import {
  formatClock,
  formatPhone,
  findByPhone,
  groupArrival,
  phoneReady,
  suggestReturnWindow,
  waitOutcome,
  walkInMinutes,
  type GroupArrival,
  type MatchedAppointment,
  type WaitOutcome,
} from "@/data/check-in";
import {
  needsClarification,
  popularServiceOptions,
  selectedServiceIds,
} from "@/data/kiosk-popular-services";

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
  | "confirm"
  | "no-match"
  | "front-desk"
  | "group"
  | "walk-in-name"
  | "walk-in-services"
  | "long-wait"
  | "return-offer"
  | "success";

/** Success screen clears itself; a half-finished flow clears itself too. */
const SUCCESS_RESET_MS = 10_000;
const IDLE_RESET_MS = 75_000;

type Success =
  | {
      kind: "Appointment";
      technicianLabel?: string;
      station?: number;
      wait?: string;
    }
  | { kind: "Walk-In"; wait?: string; longWait?: boolean }
  | { kind: "Return"; returnLabel: string };

function CheckInKiosk() {
  const records = useCheckIns();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<MatchedAppointment[]>([]);
  const [selected, setSelected] = useState<MatchedAppointment | null>(null);
  const [group, setGroup] = useState<GroupArrival | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<Success | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [returnLabel, setReturnLabel] = useState("");
  const [returnAt, setReturnAt] = useState<number | null>(null);
  /** Set when the customer reached the long-wait fork from an any-tech booking. */
  const [pendingAppointment, setPendingAppointment] = useState<MatchedAppointment | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  /** Same day the manager sees: seeded bookings + kiosk arrivals. */
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
    setMatches([]);
    setSelected(null);
    setGroup(null);
    setOptionIds([]);
    setSuccess(null);
    setReturnLabel("");
    setReturnAt(null);
    setPendingAppointment(null);
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
  }, [step, phone, name, optionIds, reset]);

  const estimateBase = useMemo(
    () => ({
      appointments,
      blockouts: technicianBlockouts,
      now: nowMinutes ?? 9 * 60,
      queueAhead,
    }),
    [appointments, nowMinutes, queueAhead],
  );

  function lookupByPhone() {
    const found = findByPhone(appointments, phone, records);
    setMatches(found);

    // Groups never self-check-in person by person — hand them to the front desk.
    const party = groupArrival(found);
    if (party) {
      setGroup(party);
      // Lightweight manager-side arrival signal on the existing booking only —
      // no duplicate Waiting cards for the party.
      for (const guest of party.appointment.guests) {
        if (guest.status === "Cancelled") continue;
        addCheckIn({
          kind: "Appointment",
          name: party.appointment.title,
          phone: phone.trim(),
          atMinutes: nowMinutes ?? party.appointment.minutes,
          appointmentId: party.appointment.id,
          guestId: guest.id,
          groupArrival: true,
        });
      }
      setStep("group");
      return;
    }

    if (found.length === 1) {
      setSelected(found[0]!);
      setStep("confirm");
    } else if (found.length > 1) {
      // Several separate bookings on one number is not routine — send to a human.
      setStep("front-desk");
    } else {
      setStep("no-match");
    }
  }

  function recordAppointment(match: MatchedAppointment, wait?: string) {
    addCheckIn({
      kind: "Appointment",
      name: match.guest.name,
      phone: phone.trim(),
      atMinutes: nowMinutes ?? match.appointment.minutes,
      appointmentId: match.appointment.id,
      guestId: match.guest.id,
    });
    setSuccess({
      kind: "Appointment",
      ...(match.technicianLabel ? { technicianLabel: match.technicianLabel } : {}),
      ...(match.station ? { station: match.station } : {}),
      ...(wait ? { wait } : {}),
    });
    setStep("success");
  }

  function checkInAppointment(match: MatchedAppointment) {
    const requested = match.guest.requestedTechnicianId ?? match.guest.technicianId;
    const hasTech = Boolean(requested && requested !== "any");

    // A specific technician keeps the card in their column — check in and done.
    if (hasTech) {
      recordAppointment(match);
      return;
    }

    const outcome = waitOutcome({
      ...estimateBase,
      scheduledMinutes: match.appointment.minutes,
    });
    if (outcome.kind === "long") {
      setPendingAppointment(match);
      setStep("long-wait");
      return;
    }
    recordAppointment(match, outcome.label);
  }

  function walkInOutcome(): WaitOutcome {
    return waitOutcome({
      ...estimateBase,
      serviceMinutes: walkInMinutes(selectedServiceIds(optionIds)),
    });
  }

  function submitWalkInServices() {
    const outcome = walkInOutcome();
    if (outcome.kind === "long") {
      setStep("long-wait");
      return;
    }
    createWalkIn({ wait: outcome.label });
  }

  function createWalkIn({ wait, longWait }: { wait?: string; longWait?: boolean }) {
    addCheckIn({
      kind: "Walk-In",
      name: name.trim(),
      phone: phone.trim(),
      atMinutes: nowMinutes ?? 9 * 60,
      serviceIds: selectedServiceIds(optionIds),
      ...(needsClarification(optionIds) ? { serviceNeedsClarification: true } : {}),
    });
    setSuccess({
      kind: "Walk-In",
      ...(wait ? { wait } : {}),
      ...(longWait ? { longWait: true } : {}),
    });
    setStep("success");
  }

  /** "Wait Here" — stay in the queue exactly as before, with no time promise. */
  function waitHere() {
    if (pendingAppointment) {
      recordAppointment(pendingAppointment);
      return;
    }
    createWalkIn({ longWait: true });
  }

  /** "Come back later" — offer a same-day return window instead of losing them. */
  function offerReturn() {
    const suggestion = suggestReturnWindow({
      ...estimateBase,
      serviceMinutes: walkInMinutes(selectedServiceIds(optionIds)),
    });
    setReturnAt(suggestion.minutes);
    setReturnLabel(suggestion.label);
    setStep("return-offer");
  }

  function confirmReturn() {
    const at = returnAt ?? (nowMinutes ?? 9 * 60) + 45;
    addCheckIn({
      kind: "Walk-In",
      name: name.trim() || (pendingAppointment?.guest.name ?? "Guest"),
      phone: phone.trim(),
      atMinutes: nowMinutes ?? 9 * 60,
      serviceIds: selectedServiceIds(optionIds),
      ...(needsClarification(optionIds) ? { serviceNeedsClarification: true } : {}),
      returnAtMinutes: at,
    });
    setSuccess({ kind: "Return", returnLabel: formatClock(at) });
    setStep("success");
  }

  const options = popularServiceOptions();

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

        {step === "group" && group && (
          <section className="text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15">
              <Users className="size-10 text-primary" aria-hidden />
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Welcome!</h1>
            <p className="mt-4 text-xl text-foreground">We found your group appointment.</p>
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
              <p className="text-3xl font-extrabold text-foreground">
                Party of {group.guestCount}
              </p>
              <p className="mt-2 text-2xl font-bold text-muted-foreground">{group.timeLabel}</p>
              <p className="mt-5 text-xl text-foreground">
                Please see our front desk and we'll help get everyone checked in.
              </p>
            </div>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
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
                onClick={() => setStep("walk-in-name")}
              >
                <Footprints className="mr-2 size-6" aria-hidden />
                I'm a Walk-In
              </Button>
              <Button
                variant="outline"
                className="h-24 rounded-2xl border-2 text-xl font-extrabold"
                onClick={() => setStep("front-desk")}
              >
                I Have an Appointment
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "front-desk" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Let's get you help.
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Please see the front desk and we'll check you in.
            </p>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={reset}
            >
              Done
            </Button>
          </section>
        )}

        {step === "walk-in-name" && (
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
              <Button
                className="h-16 w-full rounded-2xl text-xl font-extrabold"
                disabled={name.trim().length < 2}
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
            <p className="text-center text-xs font-extrabold uppercase tracking-[0.3em] text-primary">
              Popular Services
            </p>
            <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              What would you like today?
            </h1>
            <p className="mt-3 text-center text-lg text-muted-foreground">
              Tap everything you'd like — you can pick more than one.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {options.map((option) => {
                const active = optionIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setOptionIds((current) =>
                        current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      )
                    }
                    className={cn(
                      "flex h-24 items-center justify-between rounded-2xl border-2 px-6 text-left text-xl font-extrabold transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {option.label}
                    {active && <Check className="size-6 text-primary" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              disabled={optionIds.length === 0}
              onClick={submitWalkInServices}
            >
              Check In
            </Button>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "long-wait" && (
          <section className="text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15">
              <Clock className="size-10 text-primary" aria-hidden />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              There may be a longer wait right now.
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">Would you like to:</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Button className="h-24 rounded-2xl text-xl font-extrabold" onClick={waitHere}>
                Wait Here
              </Button>
              <Button
                variant="outline"
                className="h-24 rounded-2xl border-2 text-xl font-extrabold"
                onClick={offerReturn}
              >
                Come Back Later
              </Button>
            </div>
            <BackButton onClick={reset} label="Start over" />
          </section>
        )}

        {step === "return-offer" && (
          <section className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              We can hold a spot for you.
            </h1>
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Suggested return time
              </p>
              <p className="mt-2 text-4xl font-extrabold text-foreground">{returnLabel}</p>
              <p className="mt-5 text-lg text-muted-foreground">
                We'll keep your name, number and services — just check in again when you arrive.
              </p>
            </div>
            <Button
              className="mx-auto mt-10 h-16 w-full max-w-xl rounded-2xl text-xl font-extrabold"
              onClick={confirmReturn}
            >
              Yes, I'll come back
            </Button>
            <BackButton onClick={() => setStep("long-wait")} label="Back" />
          </section>
        )}

        {step === "success" && success && (
          <section className="text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15">
              <Check className="size-10 text-primary" aria-hidden />
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {success.kind === "Return" ? "You're all set!" : "You're checked in!"}
            </h1>

            {success.kind === "Return" ? (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Please return around
                </p>
                <p className="mt-2 text-4xl font-extrabold text-foreground">
                  {success.returnLabel}
                </p>
                <p className="mt-5 text-xl text-foreground">
                  We'll keep your place for this return time. Please check in again when you arrive.
                </p>
                <p className="mt-3 text-base text-muted-foreground">
                  A team member may contact you if availability changes.
                </p>
              </div>
            ) : success.kind === "Appointment" && success.technicianLabel ? (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card p-8">
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Your appointment is with
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
                {success.wait ? (
                  <>
                    <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                      Estimated wait
                    </p>
                    <p className="mt-2 flex items-center justify-center gap-2 text-3xl font-extrabold text-foreground">
                      <Clock className="size-7 text-primary" aria-hidden />
                      {success.wait}
                    </p>
                    <p className="mt-5 text-xl text-foreground">
                      Please have a seat. We'll call you shortly.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl text-foreground">
                      There may be a longer wait than usual.
                    </p>
                    <p className="mt-3 text-xl text-foreground">
                      Please have a seat. We'll call you as soon as a technician becomes available.
                    </p>
                  </>
                )}
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
