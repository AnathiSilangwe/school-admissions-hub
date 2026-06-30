import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, FileCheck2, CalendarClock, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thabazi Secondary School — Admissions 2026" },
      { name: "description", content: "Apply online to Thabazi Secondary School. Submit your application, book your verification appointment, and join a community committed to academic excellence." },
      { property: "og:title", content: "Thabazi Secondary School — Admissions 2026" },
      { property: "og:description", content: "Apply online and book your admissions appointment in minutes." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:pt-16 sm:pb-24 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Admissions open for 2026
            </div>
            <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] text-foreground">
              Your future starts at <span className="text-brand">Thabazi</span> Secondary.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Apply online, upload your documents, and book your admissions appointment — all in one place. The whole process takes less than ten minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground shadow-glass transition-transform hover:scale-[1.03] active:scale-100"
              >
                Start application <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#requirements" className="rounded-full px-5 py-3 font-medium text-foreground hover:bg-accent">
                Admission requirements
              </a>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
              {[
                { k: "Grades", v: "8–12" },
                { k: "Min average", v: "40%" },
                { k: "App. fee", v: "R100" },
              ].map((s) => (
                <div key={s.k} className="glass-card rounded-2xl p-3 text-center">
                  <div className="font-display text-2xl font-bold text-brand">{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand/20 to-transparent blur-2xl" />
            <img
              src={hero}
              alt="Thabazi Secondary School campus"
              width={1600}
              height={1024}
              className="relative rounded-3xl shadow-glass w-full h-auto object-cover aspect-[5/4]"
            />
          </div>
        </section>

        {/* About */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="glass-card rounded-3xl p-8 sm:p-12 grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="text-sm font-semibold text-brand uppercase tracking-wider">About the school</div>
              <h2 className="font-display text-3xl font-bold mt-2">A place to grow, lead, and excel.</h2>
            </div>
            <p className="md:col-span-2 text-muted-foreground leading-relaxed">
              For more than three decades, Thabazi Secondary School has prepared learners for university and life beyond
              the classroom. Our small class sizes, dedicated educators, and strong values create an environment where
              every learner is known by name and supported toward their best.
            </p>
          </div>
        </section>

        {/* Requirements */}
        <section id="requirements" className="mx-auto max-w-6xl px-4 py-12">
          <div className="text-center mb-10">
            <div className="text-sm font-semibold text-brand uppercase tracking-wider">Before you apply</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">Admission requirements</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: GraduationCap, t: "Minimum 40% average", d: "Most recent academic average across all subjects." },
              { icon: FileCheck2, t: "Required documents", d: "SA ID, previous school report, proof of residence." },
              { icon: ShieldCheck, t: "Parent/guardian", d: "Contact details for at least one parent or guardian." },
              { icon: CalendarClock, t: "Verification appointment", d: "Visit the school 7 days after applying." },
            ].map((f) => (
              <div key={f.t} className="glass-card rounded-2xl p-6 transition-transform hover:-translate-y-1">
                <f.icon className="h-7 w-7 text-brand" />
                <div className="mt-3 font-semibold">{f.t}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="relative overflow-hidden rounded-3xl bg-brand p-10 sm:p-14 text-brand-foreground text-center">
            <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_top,white_0%,transparent_60%)]" />
            <h2 className="relative font-display text-3xl sm:text-4xl font-bold">Ready to take the next step?</h2>
            <p className="relative mt-2 opacity-90">Complete your application in under 10 minutes.</p>
            <Link
              to="/apply"
              className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand shadow-glass transition-transform hover:scale-[1.03]"
            >
              Apply now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
