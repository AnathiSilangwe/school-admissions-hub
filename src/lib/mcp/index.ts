import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGrades from "./tools/list-grades";
import listApplications from "./tools/list-applications";
import getApplication from "./tools/get-application";
import updateApplicationStatus from "./tools/update-application-status";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "thabazi-admissions-mcp",
  title: "Thabazi Secondary School Admissions",
  version: "0.1.0",
  instructions:
    "Tools for the Thabazi Secondary School admissions portal. Use list_grades for public seat availability. Admin/admissions-officer accounts can use list_applications, get_application, and update_application_status to review and act on applications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGrades, listApplications, getApplication, updateApplicationStatus],
});