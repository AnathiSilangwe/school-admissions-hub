import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole = "admin" | "admissions_officer";

async function assertStaff(context: { supabase: any; userId: string }): Promise<StaffRole> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("admissions_officer")) return "admissions_officer";
  throw new Error("FORBIDDEN: your account does not have admin access.");
}

export const getStaffRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await assertStaff(context) }));

export const listGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("grades")
      .select("id, grade_number, name, capacity, occupied")
      .order("grade_number");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setGradeCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gradeId: string; capacity: number }) =>
    z.object({ gradeId: z.string().uuid(), capacity: z.number().int().min(0).max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase.rpc("admin_set_grade_capacity", {
      _grade_id: data.gradeId,
      _capacity: data.capacity,
    });
    if (error) {
      if (error.message.includes("CAPACITY_BELOW_OCCUPIED"))
        throw new Error("Capacity cannot be lower than the number of learners already enrolled.");
      if (error.message.includes("INVALID_CAPACITY")) throw new Error("Capacity must be zero or greater.");
      if (error.message.includes("GRADE_NOT_FOUND")) throw new Error("That grade no longer exists.");
      if (error.message.includes("FORBIDDEN")) throw new Error("You are not allowed to change capacity.");
      throw new Error(error.message);
    }
    return row as { id: string; name: string; capacity: number; occupied: number };
  });

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const [{ data: apps, error }, { data: grades }, { data: appts }] = await Promise.all([
      context.supabase
        .from("applicants")
        .select(
          "id, application_number, first_name, last_name, gender, age, email, phone, parent_name, parent_email, parent_phone, previous_school, current_grade, academic_average, application_status, applying_grade_id, created_at",
        )
        .order("created_at", { ascending: false }),
      context.supabase.from("grades").select("id, name"),
      context.supabase.from("appointments").select("applicant_id, appointment_date, appointment_time, venue, fee_paid"),
    ]);
    if (error) throw new Error(error.message);
    const gradeName = new Map((grades ?? []).map((g: any) => [g.id, g.name]));
    const apptFor = new Map((appts ?? []).map((a: any) => [a.applicant_id, a]));
    return (apps ?? []).map((a: any) => ({
      ...a,
      grade: gradeName.get(a.applying_grade_id) ?? "—",
      appointment: apptFor.get(a.id) ?? null,
    }));
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { applicantId: string; status: string }) =>
    z
      .object({
        applicantId: z.string().uuid(),
        status: z.enum(["pending", "accepted", "declined", "waitlist"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("applicants")
      .update({ application_status: data.status })
      .eq("id", data.applicantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getApplicationDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { applicantId: string }) =>
    z.object({ applicantId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id_copy_path, previous_results_path, proof_residence_path, birth_certificate_path")
      .eq("applicant_id", data.applicantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) return [] as Array<{ label: string; url: string }>;

    const entries: Array<[string, string | null]> = [
      ["South African ID", doc.id_copy_path],
      ["Previous school report", doc.previous_results_path],
      ["Proof of residence", doc.proof_residence_path],
      ["Birth certificate", doc.birth_certificate_path],
    ];
    const out: Array<{ label: string; url: string }> = [];
    for (const [label, path] of entries) {
      if (!path) continue;
      const { data: signed } = await context.supabase.storage
        .from("admissions-documents")
        .createSignedUrl(path, 300);
      if (signed?.signedUrl) out.push({ label, url: signed.signedUrl });
    }
    return out;
  });
