import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle2, CalendarClock, MapPin, Banknote } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

type State = {
  applicationNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  venue: string;
  fee: string;
};

function getStored(): State | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("tss:last-submission");
    if (!raw) return null;
    return JSON.parse(raw) as State;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Application Submitted — Thabazi Secondary" },
      { name: "description", content: "Your admissions application has been received." },
    ],
  }),
  component: Success,
});

function Success() {
  const state = getStored();
  if (!state) {
    if (typeof window !== "undefined") {
      throw redirect({ to: "/apply" });
    }
    return null;
  }
  const dateStr = new Date(state.appointmentDate).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-12">
        <div className="glass-card rounded-3xl p-8 sm:p-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="font-display text-3xl font-bold mt-4">Application Successfully Submitted</h1>
          <p className="text-muted-foreground mt-1">
            Please save your application number — you'll need it on your appointment day.
          </p>

          <div className="mt-8 rounded-2xl bg-brand-soft p-6">
            <div className="text-xs uppercase font-semibold tracking-wider text-brand">Application number</div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-brand mt-1 break-all">
              {state.applicationNumber}
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left">
            <InfoRow icon={CalendarClock} label="Appointment" value={`${dateStr} · ${state.appointmentTime}`} />
            <InfoRow icon={MapPin} label="Venue" value={state.venue} />
            <InfoRow icon={Banknote} label="Application fee" value={`${state.fee} — payable in person`} />
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Please bring the <strong>original copies</strong> of all uploaded documents to your appointment.
          </p>

          <Link
            to="/"
            className="inline-flex mt-8 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground shadow-glass hover:scale-[1.03] transition-transform"
          >
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}