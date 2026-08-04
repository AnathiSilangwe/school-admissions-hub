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

function AdminPage() {
  const fetcher = useServerFn(getAdminStats);
  const { data } = useSuspenseQuery(statsQueryOptions(() => fetcher()));

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

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
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
    </main>
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