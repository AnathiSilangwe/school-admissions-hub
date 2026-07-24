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
  name: "update_application_status",
  title: "Update an application's status",
  description:
    "Set the status of an admissions application (accepted, declined, pending, or waitlist). Requires an admin or admissions officer account.",
  inputSchema: {
    application_number: z.string().trim().min(1),
    status: z.enum(["pending", "accepted", "declined", "waitlist"]),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ application_number, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("applicants")
      .update({ application_status: status })
      .eq("application_number", application_number)
      .select("id, application_number, application_status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: `No application found for ${application_number} (or you lack permission).` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Application ${data.application_number} is now ${data.application_status}.` }],
      structuredContent: { application: data },
    };
  },
});