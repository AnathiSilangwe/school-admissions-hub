import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_grades",
  title: "List grades and seat availability",
  description:
      "Return every grade currently open for admission at Thabazi Secondary School (Grades 8–10) with its capacity, occupied seats, and remaining space.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("grades")
      .select("id, grade_number, name, capacity, occupied")
      .eq("is_active", true)
      .order("grade_number");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = (data ?? []).map((g) => ({
      id: g.id,
      grade: g.name,
      capacity: g.capacity,
      occupied: g.occupied,
      remaining: g.capacity - g.occupied,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { grades: rows },
    };
  },
});