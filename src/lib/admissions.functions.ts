import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { applicationSchema, type ApplicationInput } from "./admissions-schema";

function serverClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getGradeAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from("grades")
    .select("id, grade_number, name, capacity, occupied")
    .order("grade_number");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input: ApplicationInput) => applicationSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.academicAverage < 40) {
      throw new Error("Academic average is below the required 40% minimum.");
    }

    const supabase = serverClient();

    // Calculate age
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    // Single atomic, security-definer transaction: seat claim + applicant +
    // documents + appointment. Returns only non-sensitive confirmation data,
    // so anon never needs SELECT on applicants.
    const { data: result, error: rpcErr } = await supabase
      .rpc("submit_application", {
        _first_name: data.firstName,
        _last_name: data.lastName,
        _id_number: data.idNumber,
        _date_of_birth: data.dateOfBirth,
        _age: age,
        _gender: data.gender,
        _email: data.email,
        _phone: data.phone,
        _address: data.address,
        _parent_name: data.parentName,
        _parent_relationship: data.parentRelationship,
        _parent_phone: data.parentPhone,
        _parent_email: data.parentEmail,
        _previous_school: data.previousSchool,
        _current_grade: data.currentGrade,
        _applying_grade_id: data.applyingGradeId,
        _academic_average: data.academicAverage,
        _id_copy_path: data.documents.idCopyPath,
        _previous_results_path: data.documents.previousResultsPath,
        _proof_residence_path: data.documents.proofResiencePath,
        _birth_certificate_path: data.documents.birthCertificatePath ?? null,
      })
      .single();

    if (rpcErr) {
      if (rpcErr.message.includes("GRADE_FULL")) throw new Error("GRADE_FULL");
      if (rpcErr.message.includes("BELOW_MINIMUM_AVERAGE")) {
        throw new Error("Academic average is below the required 40% minimum.");
      }
      throw new Error(rpcErr.message);
    }
    if (!result) throw new Error("Application submission failed.");

    return {
      applicationNumber: result.application_number as string,
      appointmentDate: result.appointment_date as string,
      appointmentTime: "09:00 AM",
      venue: "Thabazi Secondary School Admissions Office",
      fee: "R100",
    };
  });