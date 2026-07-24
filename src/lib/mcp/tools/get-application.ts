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
  name: "get_application",
  title: "Get an application by number",
  description:
    "Fetch full applicant, document, and appointment details for one application number (e.g. TSS-2027-000123). Requires an admin or admissions officer account.",
  inputSchema: {
    application_number: z.string().trim().min(1).describe("The application number, e.g. TSS-2027-000123."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ application_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = userClient(ctx);
    const { data: applicant, error } = await sb
      .from("applicants")
      .select("*")
      .eq("application_number", application_number)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!applicant) {
      return { content: [{ type: "text", text: `No application found for ${application_number}` }], isError: true };
    }
    const [{ data: docs }, { data: appts }] = await Promise.all([
      sb.from("documents").select("*").eq("applicant_id", applicant.id).maybeSingle(),
      sb.from("appointments").select("*").eq("applicant_id", applicant.id),
    ]);
    const payload = { applicant, documents: docs ?? null, appointments: appts ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});