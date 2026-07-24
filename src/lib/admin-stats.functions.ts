import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminStats = {
  totals: { total: number; accepted: number; declined: number; pending: number; waitlist: number };
  capacity: { totalCapacity: number; totalOccupied: number; available: number };
  byGrade: Array<{ grade: string; total: number; accepted: number; declined: number; pending: number; waitlist: number; capacity: number; occupied: number }>;
  byGender: Array<{ gender: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const supabase = context.supabase;

    const [{ data: applicants, error: aErr }, { data: grades, error: gErr }] = await Promise.all([
      supabase
        .from("applicants")
        .select("id, gender, application_status, applying_grade_id, created_at"),
      supabase.from("grades").select("id, name, grade_number, capacity, occupied").order("grade_number"),
    ]);
    if (aErr) throw new Error(aErr.message);
    if (gErr) throw new Error(gErr.message);

    const apps = applicants ?? [];
    const grds = grades ?? [];

    const totals = { total: apps.length, accepted: 0, declined: 0, pending: 0, waitlist: 0 };
    for (const a of apps) {
      const s = (a.application_status ?? "pending") as keyof typeof totals;
      if (s in totals && s !== "total") (totals as Record<string, number>)[s] += 1;
    }

    const totalCapacity = grds.reduce((s, g) => s + g.capacity, 0);
    const totalOccupied = grds.reduce((s, g) => s + g.occupied, 0);

    const gradeMap = new Map(grds.map((g) => [g.id, g]));
    const byGrade = grds.map((g) => {
      const rows = apps.filter((a) => a.applying_grade_id === g.id);
      const cnt = (s: string) => rows.filter((r) => (r.application_status ?? "pending") === s).length;
      return {
        grade: g.name,
        total: rows.length,
        accepted: cnt("accepted"),
        declined: cnt("declined"),
        pending: cnt("pending"),
        waitlist: cnt("waitlist"),
        capacity: g.capacity,
        occupied: g.occupied,
      };
    });

    const genderCounts = new Map<string, number>();
    for (const a of apps) genderCounts.set(a.gender, (genderCounts.get(a.gender) ?? 0) + 1);
    const byGender = [...genderCounts.entries()].map(([gender, count]) => ({ gender, count }));

    const byStatus = (["accepted", "declined", "pending", "waitlist"] as const).map((status) => ({
      status,
      count: totals[status],
    }));

    // Daily submissions — last 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daily: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      daily.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    const dailyMap = new Map(daily.map((d) => [d.date, d]));
    for (const a of apps) {
      const key = a.created_at.slice(0, 10);
      const bucket = dailyMap.get(key);
      if (bucket) bucket.count += 1;
    }

    // Weekly submissions — last 12 weeks (Mon-anchored)
    function weekStart(d: Date): Date {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      const day = (nd.getDay() + 6) % 7; // Mon=0
      nd.setDate(nd.getDate() - day);
      return nd;
    }
    const thisWeek = weekStart(today);
    const weekly: Array<{ week: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const w = new Date(thisWeek);
      w.setDate(w.getDate() - i * 7);
      weekly.push({ week: w.toISOString().slice(0, 10), count: 0 });
    }
    const weeklyMap = new Map(weekly.map((w) => [w.week, w]));
    for (const a of apps) {
      const key = weekStart(new Date(a.created_at)).toISOString().slice(0, 10);
      const bucket = weeklyMap.get(key);
      if (bucket) bucket.count += 1;
    }

    void gradeMap;
    return {
      totals,
      capacity: { totalCapacity, totalOccupied, available: totalCapacity - totalOccupied },
      byGrade,
      byGender,
      byStatus,
      daily,
      weekly,
    };
  });