import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/** Verifies the caller holds the `admin` role. Admissions officers are rejected. */
async function assertAdmin(context: Ctx): Promise<{ userId: string; email: string | null }> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin")) throw new Error("FORBIDDEN: only administrators can manage staff.");
  const { data: userData } = await context.supabase.auth.getUser();
  return { userId: context.userId, email: userData?.user?.email ?? null };
}

const BAN_FOREVER = "876000h";

export type StaffMember = {
  userId: string;
  email: string;
  role: "admin" | "admissions_officer" | null;
  status: "active" | "deactivated" | "invited";
  createdAt: string;
  lastSignInAt: string | null;
};

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error: roleErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (roleErr) throw new Error(roleErr.message);

    const { data: userList, error: userErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (userErr) throw new Error(userErr.message);

    const byId = new Map(userList.users.map((u) => [u.id, u]));
    return (roleRows ?? []).map((r) => {
      const u = byId.get(r.user_id) as any;
      const banned = u?.banned_until && new Date(u.banned_until) > new Date();
      return {
        userId: r.user_id,
        email: u?.email ?? "(unknown)",
        role: r.role,
        status: banned ? "deactivated" : u?.last_sign_in_at ? "active" : "invited",
        createdAt: u?.created_at ?? "",
        lastSignInAt: u?.last_sign_in_at ?? null,
      } satisfies StaffMember;
    });
  });

async function writeAudit(
  admin: any,
  actor: { userId: string; email: string | null },
  action: string,
  targetUserId: string | null,
  description: string,
  details: Record<string, unknown>,
) {
  await admin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action,
    target_user_id: targetUserId,
    description,
    details,
  });
}

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: "admin" | "admissions_officer" }) =>
    z.object({ email: z.string().email(), role: z.enum(["admin", "admissions_officer"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // Invitation flow: the invitee receives an activation link and sets their own password.
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    let userId = invited?.user?.id ?? null;
    let emailSent = !inviteErr;

    if (inviteErr) {
      // Already registered (or mail delivery unavailable) - fall back to attaching the role.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      emailSent = false;
      if (!userId) throw new Error(`Could not invite ${email}: ${inviteErr.message}`);
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId!, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    await writeAudit(supabaseAdmin, actor, "staff_invited", userId, `Invited ${email} as ${data.role}`, {
      email,
      role: data.role,
      invitation_email_sent: emailSent,
    });

    return { ok: true, emailSent, userId };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "admissions_officer" }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "admissions_officer"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);
    if (data.userId === actor.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own administrator role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await writeAudit(supabaseAdmin, actor, "staff_role_changed", data.userId, `Role set to ${data.role}`, {
      role: data.role,
    });
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; active: boolean }) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);
    if (data.userId === actor.userId && !data.active) {
      throw new Error("You cannot deactivate your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : BAN_FOREVER,
    } as any);
    if (error) throw new Error(error.message);
    await writeAudit(
      supabaseAdmin,
      actor,
      data.active ? "staff_reactivated" : "staff_deactivated",
      data.userId,
      data.active ? "Staff member reactivated" : "Staff member deactivated",
      {},
    );
    return { ok: true };
  });
