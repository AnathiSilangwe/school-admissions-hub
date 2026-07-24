import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_applications",
  title: "List admissions applications",
  description:
    "List admissions applications for Thabazi Secondary School. Requires an admin or admissions officer account. Optionally filter by status (pending, accepted, declined, waitlist).",
  inputSchema: {
    status: z
      .enum(["pending", "accepted", "declined", "waitlist"])
      .optional()
      .describe("Filter by application_status."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = userClient(ctx)
      .from("applicants")
      .select(
        "id, application_number, first_name, last_name, gender, age, current_grade, applying_grade_id, academic_average, application_status, email, phone, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("application_status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { applications: data ?? [] },
    };
  },
});