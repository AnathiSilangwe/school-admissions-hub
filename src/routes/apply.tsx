import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertCircle, CalendarClock, MapPin, Banknote, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { DocumentDropzone } from "@/components/document-dropzone";
import { getGradeAvailability, submitApplication } from "@/lib/admissions.functions";
import { applicationSchema, calcAge, GENDERS, RELATIONSHIPS, type ApplicationInput } from "@/lib/admissions-schema";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply Online — Thabazi Secondary" },
      { name: "description", content: "Complete your Thabazi Secondary School admissions application online." },
    ],
  }),
  component: Apply,
});

type DocPaths = {
  idCopyPath?: string;
  previousResultsPath?: string;
  proofResiencePath?: string;
  birthCertificatePath?: string | null;
};
type FormState = Partial<Omit<ApplicationInput, "documents">> & {
  documents: DocPaths;
};

const STEPS = [
  "Applicant",
  "Parent/Guardian",
  "Academic",
  "Grade",
  "Documents",
  "Review",
] as const;

function Apply() {
  const navigate = useNavigate();
  const submit = useServerFn(submitApplication);
  const [submissionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  );
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ documents: {} });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const grades = useQuery({
    queryKey: ["grades"],
    queryFn: () => getGradeAvailability(),
  });

  const age = useMemo(() => (form.dateOfBirth ? calcAge(form.dateOfBirth) : 0), [form.dateOfBirth]);
  const disqualified = (form.academicAverage ?? 100) < 40 && form.academicAverage !== undefined;

  const selectedGrade = grades.data?.find((g) => g.id === form.applyingGradeId);
  const gradeFull = selectedGrade ? selectedGrade.occupied >= selectedGrade.capacity : false;

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!(form.firstName && form.lastName && /^\d{13}$/.test(form.idNumber ?? "") && form.dateOfBirth && form.gender && form.email && form.phone && form.address);
      case 1:
        return !!(form.parentName && form.parentRelationship && form.parentPhone && form.parentEmail);
      case 2:
        return !!(form.previousSchool && form.currentGrade && form.academicAverage !== undefined && !disqualified);
      case 3:
        return !!form.applyingGradeId && !gradeFull;
      case 4:
        return !!(form.documents?.idCopyPath && form.documents?.previousResultsPath && form.documents?.proofResiencePath);
      case 5:
        return true;
      default:
        return false;
    }
  }

  async function onSubmit() {
    setSubmitError(null);
    const parsed = applicationSchema.safeParse({
      ...form,
      documents: {
        idCopyPath: form.documents?.idCopyPath,
        previousResultsPath: form.documents?.previousResultsPath,
        proofResiencePath: form.documents?.proofResiencePath,
        birthCertificatePath: form.documents?.birthCertificatePath ?? null,
      },
    });
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Please review your information.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submit({ data: parsed.data });
      sessionStorage.setItem("tss:last-submission", JSON.stringify(result));
      navigate({ to: "/success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Submission failed.";
      setSubmitError(message === "GRADE_FULL" ? "That grade just filled up. Please choose another." : message);
      if (message === "GRADE_FULL") {
        grades.refetch();
        setStep(3);
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8">
          {step === 0 && (
            <Section title="Applicant Information" subtitle="Tell us about the learner.">
              <Grid2>
                <Field label="First name" required>
                  <Input value={form.firstName ?? ""} onChange={(v) => update("firstName", v)} />
                </Field>
                <Field label="Last name" required>
                  <Input value={form.lastName ?? ""} onChange={(v) => update("lastName", v)} />
                </Field>
                <Field label="SA ID number" required hint="13 digits">
                  <Input value={form.idNumber ?? ""} onChange={(v) => update("idNumber", v.replace(/\D/g, "").slice(0, 13))} />
                </Field>
                <Field label="Date of birth" required>
                  <Input type="date" value={form.dateOfBirth ?? ""} onChange={(v) => update("dateOfBirth", v)} />
                </Field>
                <Field label="Age" hint="Auto calculated">
                  <Input value={age ? String(age) : ""} readOnly />
                </Field>
                <Field label="Gender" required>
                  <Select value={form.gender ?? ""} onChange={(v) => update("gender", v as ApplicationInput["gender"])} options={GENDERS} />
                </Field>
                <Field label="Email" required>
                  <Input type="email" value={form.email ?? ""} onChange={(v) => update("email", v)} />
                </Field>
                <Field label="Cell number" required>
                  <Input value={form.phone ?? ""} onChange={(v) => update("phone", v)} />
                </Field>
                <Field label="Home address" required span2>
                  <Textarea value={form.address ?? ""} onChange={(v) => update("address", v)} />
                </Field>
              </Grid2>
            </Section>
          )}

          {step === 1 && (
            <Section title="Parent / Guardian" subtitle="Your primary contact at home.">
              <Grid2>
                <Field label="Parent / guardian name" required>
                  <Input value={form.parentName ?? ""} onChange={(v) => update("parentName", v)} />
                </Field>
                <Field label="Relationship" required>
                  <Select value={form.parentRelationship ?? ""} onChange={(v) => update("parentRelationship", v as ApplicationInput["parentRelationship"])} options={RELATIONSHIPS} />
                </Field>
                <Field label="Phone number" required>
                  <Input value={form.parentPhone ?? ""} onChange={(v) => update("parentPhone", v)} />
                </Field>
                <Field label="Email" required>
                  <Input type="email" value={form.parentEmail ?? ""} onChange={(v) => update("parentEmail", v)} />
                </Field>
              </Grid2>
            </Section>
          )}

          {step === 2 && (
            <Section title="Academic Information" subtitle="Your most recent school results.">
              <Grid2>
                <Field label="Previous school" required span2>
                  <Input value={form.previousSchool ?? ""} onChange={(v) => update("previousSchool", v)} />
                </Field>
                <Field label="Current grade" required>
                  <Input value={form.currentGrade ?? ""} onChange={(v) => update("currentGrade", v)} />
                </Field>
                <Field label="Academic average (%)" required hint="Minimum 40%">
                  <Input
                    type="number"
                    value={form.academicAverage?.toString() ?? ""}
                    onChange={(v) => update("academicAverage", v === "" ? (undefined as unknown as number) : Number(v))}
                  />
                </Field>
              </Grid2>
              {disqualified && (
                <Alert tone="error">
                  You do not qualify for admission because the minimum academic average required is 40%.
                </Alert>
              )}
            </Section>
          )}

          {step === 3 && (
            <Section
              title="Choose your grade"
              subtitle="Applications are open for Grades 8, 9 and 10 only. Live seat availability — updated in real time."
            >
              {grades.isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {grades.data?.map((g) => {
                  const remaining = g.capacity - g.occupied;
                  const full = remaining <= 0;
                  const selected = form.applyingGradeId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={full}
                      onClick={() => update("applyingGradeId", g.id)}
                      className={`text-left rounded-2xl border-2 p-4 transition-all ${
                        selected
                          ? "border-brand bg-brand-soft shadow-glass"
                          : full
                            ? "border-border bg-surface-muted opacity-60 cursor-not-allowed"
                            : "border-border bg-surface hover:border-brand/50 hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-display text-xl font-bold">{g.name}</div>
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${full ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700"}`}>
                          {full ? "Full" : `${remaining} seats`}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {g.occupied} / {g.capacity} enrolled
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className={`h-full ${full ? "bg-destructive" : "bg-brand"}`}
                          style={{ width: `${Math.min(100, (g.occupied / g.capacity) * 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              {gradeFull && (
                <Alert tone="error">Unfortunately {selectedGrade?.name} is currently full. Please choose another grade.</Alert>
              )}
            </Section>
          )}

          {step === 4 && (
            <Section title="Required documents" subtitle="PDF, JPG, or PNG. Max 10 MB each.">
              <div className="grid sm:grid-cols-2 gap-4">
                <DocumentDropzone
                  label="South African ID"
                  required
                  submissionId={submissionId}
                  field="id_copy"
                  value={form.documents?.idCopyPath ?? null}
                  onChange={(p) => setForm((f) => ({ ...f, documents: { ...f.documents, idCopyPath: p ?? undefined } }))}
                />
                <DocumentDropzone
                  label="Previous school report"
                  required
                  submissionId={submissionId}
                  field="previous_results"
                  value={form.documents?.previousResultsPath ?? null}
                  onChange={(p) => setForm((f) => ({ ...f, documents: { ...f.documents, previousResultsPath: p ?? undefined } }))}
                />
                <DocumentDropzone
                  label="Proof of residence"
                  required
                  submissionId={submissionId}
                  field="proof_residence"
                  value={form.documents?.proofResiencePath ?? null}
                  onChange={(p) => setForm((f) => ({ ...f, documents: { ...f.documents, proofResiencePath: p ?? undefined } }))}
                />
                <DocumentDropzone
                  label="Birth certificate (optional)"
                  submissionId={submissionId}
                  field="birth_certificate"
                  value={form.documents?.birthCertificatePath ?? null}
                  onChange={(p) => setForm((f) => ({ ...f, documents: { ...f.documents, birthCertificatePath: p } }))}
                />
              </div>
            </Section>
          )}

          {step === 5 && (
            <Section title="Review & submit" subtitle="Confirm your details and your appointment.">
              <div className="space-y-3">
                <Summary label="Applicant" value={`${form.firstName} ${form.lastName} · ${form.gender} · age ${age}`} />
                <Summary label="Contact" value={`${form.email} · ${form.phone}`} />
                <Summary label="Parent / guardian" value={`${form.parentName} (${form.parentRelationship}) · ${form.parentPhone}`} />
                <Summary label="Academic" value={`${form.previousSchool} · ${form.currentGrade} · ${form.academicAverage}%`} />
                <Summary label="Applying for" value={selectedGrade?.name ?? "—"} />
              </div>
              <AppointmentPreview />
              <FeeBox />
              {submitError && <Alert tone="error">{submitError}</Alert>}
            </Section>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => canAdvance() && setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="inline-flex items-center gap-1 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glass transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-glass transition-transform hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
              </button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function AppointmentPreview() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const dateStr = date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="rounded-2xl bg-brand-soft p-5 mt-4">
      <div className="text-xs uppercase font-semibold tracking-wider text-brand">Appointment scheduled</div>
      <div className="mt-2 grid sm:grid-cols-3 gap-3 text-sm">
        <Mini icon={CalendarClock} label="Date & time" value={`${dateStr} · 09:00 AM`} />
        <Mini icon={MapPin} label="Venue" value="Admissions Office" />
        <Mini icon={Banknote} label="Purpose" value="Verification & R100 fee" />
      </div>
    </div>
  );
}

function FeeBox() {
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface px-5 py-4 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Application fee</div>
        <div className="font-display text-2xl font-bold">R100</div>
      </div>
      <div className="text-xs text-muted-foreground max-w-[60%] text-right">Pay in person at the school during your appointment.</div>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, required, hint, children, span2 }: { label: string; required?: boolean; hint?: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium flex items-center justify-between">
        <span>
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        {hint && <span className="text-xs text-muted-foreground font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", readOnly }: { value: string; onChange?: (v: string) => void; type?: string; readOnly?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 read-only:bg-surface-muted read-only:cursor-not-allowed"
    />
  );
}

function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
    >
      <option value="" disabled>Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Alert({ tone, children }: { tone: "error"; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : ""}`}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  );
}