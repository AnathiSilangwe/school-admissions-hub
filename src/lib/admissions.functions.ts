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

    // Claim a seat atomically
    const { data: claimed, error: claimErr } = await supabase.rpc("claim_grade_seat", {
      _grade_id: data.applyingGradeId,
    });
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) throw new Error("GRADE_FULL");

    // Generate application number
    const { data: numData, error: numErr } = await supabase.rpc("next_application_number");
    if (numErr) throw new Error(numErr.message);
    const applicationNumber = numData as unknown as string;

    // Calculate age and appointment date
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7);
    const appointmentDateStr = appointmentDate.toISOString().slice(0, 10);

    // Insert applicant
    const { data: applicant, error: appErr } = await supabase
      .from("applicants")
      .insert({
        application_number: applicationNumber,
        first_name: data.firstName,
        last_name: data.lastName,
        id_number: data.idNumber,
        date_of_birth: data.dateOfBirth,
        age,
        gender: data.gender,
        email: data.email,
        phone: data.phone,
        address: data.address,
        parent_name: data.parentName,
        parent_relationship: data.parentRelationship,
        parent_phone: data.parentPhone,
        parent_email: data.parentEmail,
        previous_school: data.previousSchool,
        current_grade: data.currentGrade,
        applying_grade_id: data.applyingGradeId,
        academic_average: data.academicAverage,
      })
      .select("id, application_number")
      .single();
    if (appErr || !applicant) throw new Error(appErr?.message ?? "Insert failed");

    // Insert documents
    const { error: docErr } = await supabase.from("documents").insert({
      applicant_id: applicant.id,
      id_copy_path: data.documents.idCopyPath,
      previous_results_path: data.documents.previousResultsPath,
      proof_residence_path: data.documents.proofResiencePath,
      birth_certificate_path: data.documents.birthCertificatePath ?? null,
    });
    if (docErr) throw new Error(docErr.message);

    // Insert appointment
    const { error: aptErr } = await supabase.from("appointments").insert({
      applicant_id: applicant.id,
      appointment_date: appointmentDateStr,
      appointment_time: "09:00:00",
    });
    if (aptErr) throw new Error(aptErr.message);

    return {
      applicationNumber,
      appointmentDate: appointmentDateStr,
      appointmentTime: "09:00 AM",
      venue: "Thabazi Secondary School Admissions Office",
      fee: "R100",
    };
  });