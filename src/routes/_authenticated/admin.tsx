import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useState } from "react";
import { getAdminStats, type AdminStats } from "@/lib/admin-stats.functions";
import {
  getStaffRole,
  listGrades,
  setGradeCapacity,
  listApplications,
  updateApplicationStatus,
  getApplicationDocuments,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const statsQueryOptions = (fetcher: () => Promise<AdminStats>) =>
  queryOptions({ queryKey: ["admin", "stats"], queryFn: fetcher });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Thabazi Secondary School" },
      { name: "description", content: "Overview of admissions applications, capacity, and trends." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin dashboard — Thabazi Secondary School" },
      { property: "og:description", content: "Overview of admissions applications, capacity, and trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    await getStaffRole();
  },
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const GOLD = "hsl(43 96% 56%)";
const GREEN = "hsl(142 71% 45%)";
const RED = "hsl(0 84% 60%)";
const AMBER = "hsl(38 92% 50%)";
const SLATE = "hsl(215 20% 50%)";
const BLUE = "hsl(217 91% 60%)";

const STATUS_COLORS: Record<string, string> = {
  accepted: GREEN,
  declined: RED,
  pending: AMBER,
  waitlist: SLATE,
};
const GENDER_COLORS = [BLUE, "hsl(330 81% 60%)", GOLD];

const TABS = [
  "Dashboard",
  "Applications",
  "Accepted / Enrolled",
  "Declined",
  "Grade Management",
  "Staff Management",
  "Audit Logs",
] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const fetcher = useServerFn(getAdminStats);
  const { data } = useSuspenseQuery(statsQueryOptions(() => fetcher()));
  const [tab, setTab] = useState<Tab>("Dashboard");
  const { data: roleInfo } = useQuery({ queryKey: ["admin", "role"], queryFn: () => getStaffRole() });
  const isAdmin = roleInfo?.role === "admin";
  const visibleTabs = TABS.filter((t) => isAdmin || (t !== "Staff Management" && t !== "Audit Logs"));

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin dashboard</h1>
            <p className="text-sm text-muted-foreground">Admissions overview and trends</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <button
              onClick={signOut}
              className="rounded-full border border-border/60 bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/60 bg-surface/40">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {visibleTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {tab === "Applications" && <ApplicationsPanel mode="pending" />}
        {tab === "Accepted / Enrolled" && <ApplicationsPanel mode="accepted" />}
        {tab === "Declined" && <ApplicationsPanel mode="declined" />}
        {tab === "Grade Management" && <GradesPanel />}
        {tab === "Staff Management" && isAdmin && <StaffPanel />}
        {tab === "Audit Logs" && isAdmin && <AuditPanel />}
        {tab === "Dashboard" && (
        <div className="space-y-6">
        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Total" value={data.totals.total} accent="text-foreground" />
          <SummaryCard label="Accepted" value={data.totals.accepted} accent="text-emerald-600" />
          <SummaryCard label="Declined" value={data.totals.declined} accent="text-red-600" />
          <SummaryCard label="Pending" value={data.totals.pending} accent="text-amber-600" />
          <SummaryCard label="Waitlist" value={data.totals.waitlist} accent="text-slate-600" />
          <SummaryCard label="Available seats" value={data.capacity.available} accent="text-brand" />
        </section>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Applications by grade" description="Accepted, pending, declined, and waitlisted per grade">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byGrade}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="accepted" stackId="a" fill={GREEN} />
                <Bar dataKey="pending" stackId="a" fill={AMBER} />
                <Bar dataKey="waitlist" stackId="a" fill={SLATE} />
                <Bar dataKey="declined" stackId="a" fill={RED} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Applications by gender" description="Distribution of applicants">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byGender}
                  dataKey="count"
                  nameKey="gender"
                  outerRadius={100}
                  label={(entry) => `${entry.gender}: ${entry.count}`}
                >
                  {data.byGender.map((_, i) => (
                    <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily submissions (last 30 days)" description="Applications received per day">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  interval={4}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Weekly submissions (last 12 weeks)" description="Applications received per week">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weekly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill={BLUE} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Accepted vs declined"
            description="Decision outcomes across all applications"
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 12 }} width={90} />
                <Tooltip />
                <Bar dataKey="count">
                  {data.byStatus.map((row, i) => (
                    <Cell key={i} fill={STATUS_COLORS[row.status] ?? SLATE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        </div>
        )}
      </div>
    </main>
  );
}

function GradesPanel() {
  const qc = useQueryClient();
  const fetchGrades = useServerFn(listGrades);
  const saveCapacity = useServerFn(setGradeCapacity);
  const { data: grades, isLoading, error } = useQuery({
    queryKey: ["admin", "grades"],
    queryFn: () => fetchGrades(),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { gradeId: string; capacity: number }) => saveCapacity({ data: vars }),
    onSuccess: async (row) => {
      setEditing(null);
      setFormError(null);
      toast.success(`${row.name} capacity updated to ${row.capacity}.`);
      await qc.invalidateQueries({ queryKey: ["admin", "grades"] });
      await qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: unknown) => setFormError(e instanceof Error ? e.message : "Could not update capacity."),
  });

  function submit(gradeId: string, occupied: number) {
    const capacity = Number(value);
    if (!Number.isInteger(capacity) || capacity < 0) {
      setFormError("Capacity must be a whole number of zero or more.");
      return;
    }
    if (capacity < occupied) {
      setFormError(`Capacity cannot be below the ${occupied} learners already enrolled.`);
      return;
    }
    mutation.mutate({ gradeId, capacity });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading grades…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-glass backdrop-blur">
      <h2 className="font-display text-lg font-semibold text-foreground">Grade management</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enrolled seats are controlled by the admissions workflow and cannot be edited directly.
      </p>
      {formError && <p role="alert" className="mt-3 text-sm text-destructive">{formError}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">Capacity</th>
              <th className="py-2 pr-4">Enrolled</th>
              <th className="py-2 pr-4">Available seats</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(grades ?? []).map((g: any) => (
              <tr key={g.id} className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">{g.name}</td>
                <td className="py-3 pr-4">
                  {editing === g.id ? (
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-24 rounded-md border border-input bg-background px-2 py-1"
                      aria-label={`Capacity for ${g.name}`}
                    />
                  ) : (
                    g.capacity
                  )}
                </td>
                <td className="py-3 pr-4">{g.occupied}</td>
                <td className="py-3 pr-4">{Math.max(g.capacity - g.occupied, 0)}</td>
                <td className="py-3">
                  {editing === g.id ? (
                    <span className="flex gap-2">
                      <button
                        onClick={() => submit(g.id, g.occupied)}
                        disabled={mutation.isPending}
                        className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditing(null); setFormError(null); }}
                        className="rounded-full border border-border/60 px-3 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => { setEditing(g.id); setValue(String(g.capacity)); setFormError(null); }}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type AppMode = "pending" | "accepted" | "declined";

const MODE_META: Record<AppMode, { title: string; blurb: string; empty: string }> = {
  pending: {
    title: "Pending applications",
    blurb: "Applications still awaiting a decision.",
    empty: "No pending applications.",
  },
  accepted: {
    title: "Accepted / enrolled",
    blurb: "Accepted learners, grouped by the grade they were accepted into.",
    empty: "No accepted applications yet.",
  },
  declined: {
    title: "Declined applications",
    blurb: "Declined applications are kept for historical records and do not hold a seat.",
    empty: "No declined applications.",
  },
};

function ApplicationsPanel({ mode }: { mode: AppMode }) {
  const qc = useQueryClient();
  const fetchApps = useServerFn(listApplications);
  const setStatus = useServerFn(updateApplicationStatus);
  const fetchDocs = useServerFn(getApplicationDocuments);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const { data: apps, isLoading, error } = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => fetchApps(),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { applicantId: string; status: string }) => setStatus({ data: vars }),
    onSuccess: async () => {
      toast.success("Application status updated.");
      setOpenId(null);
      await qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      await qc.invalidateQueries({ queryKey: ["admin", "grades"] });
      await qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update status."),
  });

  const { data: docs } = useQuery({
    queryKey: ["admin", "documents", openId],
    queryFn: () => fetchDocs({ data: { applicantId: openId! } }),
    enabled: !!openId,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading applications…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>;

  const all = (apps ?? []) as any[];
  const inMode = all.filter((a) => a.application_status === mode);
  const grades = Array.from(new Set(all.map((a) => a.grade))).sort();

  const rows = inMode.filter((a) => {
    const q = query.trim().toLowerCase();
    if (gradeFilter !== "all" && a.grade !== gradeFilter) return false;
    if (!q) return true;
    return `${a.first_name} ${a.last_name} ${a.application_number} ${a.grade}`.toLowerCase().includes(q);
  });

  const grouped = mode === "pending" ? null : groupByGrade(rows);
  const meta = MODE_META[mode];
  const openRow = openId ? rows.find((r) => r.id === openId) : null;

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-glass backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{meta.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            aria-label="Filter by grade"
          >
            <option value="all">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, number or grade"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            aria-label="Search applications"
          />
        </div>
      </div>

      {rows.length === 0 && <p className="mt-6 text-sm text-muted-foreground">{meta.empty}</p>}

      {grouped
        ? grouped.map(([grade, list]) => (
            <div key={grade} className="mt-6">
              <h3 className="font-display text-base font-semibold text-foreground">
                {grade} <span className="text-sm font-normal text-muted-foreground">· {list.length} application{list.length === 1 ? "" : "s"}</span>
              </h3>
              <ApplicationsTable
                rows={list}
                mode={mode}
                openId={openId}
                onToggle={(id) => setOpenId(openId === id ? null : id)}
                onStatus={(id, status) => statusMutation.mutate({ applicantId: id, status })}
              />
            </div>
          ))
        : rows.length > 0 && (
            <ApplicationsTable
              rows={rows}
              mode={mode}
              openId={openId}
              onToggle={(id) => setOpenId(openId === id ? null : id)}
              onStatus={(id, status) => statusMutation.mutate({ applicantId: id, status })}
            />
          )}

      {openRow && (
        <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-5">
          <h3 className="font-display text-base font-semibold text-foreground">
            {openRow.first_name} {openRow.last_name} · {openRow.application_number}
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Detail label="Email" value={openRow.email} />
            <Detail label="Phone" value={openRow.phone} />
            <Detail label="Parent / guardian" value={openRow.parent_name} />
            <Detail label="Parent email" value={openRow.parent_email} />
            <Detail label="Parent phone" value={openRow.parent_phone} />
            <Detail label="Previous school" value={openRow.previous_school} />
            <Detail label="Current grade" value={openRow.current_grade} />
            <Detail label="Applying for" value={openRow.grade} />
            <Detail label="Academic average" value={`${openRow.academic_average}%`} />
            <Detail label="Status" value={openRow.application_status} />
            <Detail label="Applied on" value={formatDate(openRow.created_at)} />
            <Detail
              label="Appointment"
              value={
                openRow.appointment
                  ? `${openRow.appointment.appointment_date} at ${openRow.appointment.appointment_time}`
                  : "—"
              }
            />
            <Detail label="Venue" value={openRow.appointment?.venue ?? "—"} />
          </dl>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground">Documents</h4>
            <ul className="mt-2 flex flex-wrap gap-3 text-sm">
              {(docs ?? []).map((d) => (
                <li key={d.label}>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-brand underline">
                    {d.label}
                  </a>
                </li>
              ))}
              {(!docs || docs.length === 0) && <li className="text-muted-foreground">No documents available.</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function groupByGrade(rows: any[]): Array<[string, any[]]> {
  const map = new Map<string, any[]>();
  for (const r of rows) {
    const list = map.get(r.grade) ?? [];
    list.push(r);
    map.set(r.grade, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : status === "declined"
        ? "bg-red-100 text-red-800"
        : status === "pending"
          ? "bg-amber-100 text-amber-800"
          : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>{status}</span>;
}

function ApplicationsTable({
  rows,
  mode,
  openId,
  onToggle,
  onStatus,
}: {
  rows: any[];
  mode: AppMode;
  openId: string | null;
  onToggle: (id: string) => void;
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4">Number</th>
            <th className="py-2 pr-4">Applicant</th>
            <th className="py-2 pr-4">Grade</th>
            <th className="py-2 pr-4">Applied</th>
            <th className="py-2 pr-4">Average</th>
            <th className="py-2 pr-4">Appointment</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border/40 align-top">
              <td className="py-3 pr-4 font-mono text-xs">{a.application_number}</td>
              <td className="py-3 pr-4 font-medium text-foreground">{a.first_name} {a.last_name}</td>
              <td className="py-3 pr-4">{a.grade}</td>
              <td className="py-3 pr-4">{formatDate(a.created_at)}</td>
              <td className="py-3 pr-4">{a.academic_average}%</td>
              <td className="py-3 pr-4">
                {a.appointment ? `${a.appointment.appointment_date} ${String(a.appointment.appointment_time).slice(0, 5)}` : "—"}
              </td>
              <td className="py-3 pr-4"><StatusBadge status={a.application_status} /></td>
              <td className="py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onToggle(a.id)}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs hover:bg-muted"
                  >
                    {openId === a.id ? "Hide" : "View"}
                  </button>
                  {mode !== "accepted" && (
                    <button
                      onClick={() => onStatus(a.id, "accepted")}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Accept
                    </button>
                  )}
                  {mode !== "declined" && (
                    <button
                      onClick={() => onStatus(a.id, "declined")}
                      className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Decline
                    </button>
                  )}
                  {mode !== "pending" && (
                    <button
                      onClick={() => onStatus(a.id, "pending")}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs hover:bg-muted"
                    >
                      Re-open
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffPanel() {
  const qc = useQueryClient();
  const fetchStaff = useServerFn(listStaff);
  const invite = useServerFn(inviteStaff);
  const changeRole = useServerFn(setStaffRole);
  const changeActive = useServerFn(setStaffActive);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "admissions_officer">("admissions_officer");

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => fetchStaff(),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    await qc.invalidateQueries({ queryKey: ["admin", "audit"] });
  };

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: "admin" | "admissions_officer" }) => invite({ data: vars }),
    onSuccess: async (res) => {
      setEmail("");
      toast.success(
        res.emailSent
          ? "Invitation sent — the staff member sets their own password from the emailed link."
          : "Staff access granted. The invitation email could not be sent, so ask them to sign in or reset their password.",
      );
      await refresh();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not invite staff member."),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "admissions_officer" }) => changeRole({ data: vars }),
    onSuccess: async () => { toast.success("Role updated."); await refresh(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not change role."),
  });

  const activeMutation = useMutation({
    mutationFn: (vars: { userId: string; active: boolean }) => changeActive({ data: vars }),
    onSuccess: async () => { toast.success("Account updated."); await refresh(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update account."),
  });

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-glass backdrop-blur">
      <h2 className="font-display text-lg font-semibold text-foreground">Staff management</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite administrators and admissions officers. Passwords are never visible or set by an administrator — invited
        staff create their own from the activation link.
      </p>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          inviteMutation.mutate({ email, role });
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="staff@thabazi.co.za"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="admissions_officer">Admissions officer</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={inviteMutation.isPending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-60"
        >
          {inviteMutation.isPending ? "Inviting…" : "Invite staff member"}
        </button>
      </form>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading staff…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{(error as Error).message}</p>}

      {staff && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Last sign-in</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.userId} className="border-b border-border/40">
                  <td className="py-3 pr-4 text-foreground">{s.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={s.role ?? "admissions_officer"}
                      onChange={(e) =>
                        roleMutation.mutate({ userId: s.userId, role: e.target.value as "admin" | "admissions_officer" })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      aria-label={`Role for ${s.email}`}
                    >
                      <option value="admissions_officer">Admissions officer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4 capitalize">{s.status}</td>
                  <td className="py-3 pr-4">{s.lastSignInAt ? formatDate(s.lastSignInAt) : "Never"}</td>
                  <td className="py-3">
                    <button
                      onClick={() => activeMutation.mutate({ userId: s.userId, active: s.status === "deactivated" })}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs hover:bg-muted"
                    >
                      {s.status === "deactivated" ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No staff accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AuditPanel() {
  const fetchLogs = useServerFn(listAuditLogs);
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => fetchLogs(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audit logs…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-glass backdrop-blur">
      <h2 className="font-display text-lg font-semibold text-foreground">Audit logs</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Append-only record of administrative actions. Records cannot be edited or deleted from the dashboard.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Staff user</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l: any) => (
              <tr key={l.id} className="border-b border-border/40 align-top">
                <td className="py-3 pr-4 whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-ZA")}</td>
                <td className="py-3 pr-4">{l.actor_email ?? "—"}</td>
                <td className="py-3 pr-4 font-mono text-xs">{l.action}</td>
                <td className="py-3">{l.description ?? "—"}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No audit records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/80 p-4 shadow-glass backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-glass backdrop-blur ${className ?? ""}`}
    >
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}