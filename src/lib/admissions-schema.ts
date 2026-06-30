import { z } from "zod";

export const GENDERS = ["Male", "Female", "Other"] as const;
export const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Other"] as const;

export const applicationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  idNumber: z.string().trim().regex(/^\d{13}$/, "SA ID must be 13 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Required"),
  gender: z.enum(GENDERS),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(5).max(300),

  parentName: z.string().trim().min(1).max(120),
  parentRelationship: z.enum(RELATIONSHIPS),
  parentPhone: z.string().trim().min(7).max(20),
  parentEmail: z.string().trim().email().max(255),

  previousSchool: z.string().trim().min(1).max(150),
  currentGrade: z.string().trim().min(1).max(20),
  applyingGradeId: z.string().uuid(),
  academicAverage: z.number().min(0).max(100),

  documents: z.object({
    idCopyPath: z.string().min(1),
    previousResultsPath: z.string().min(1),
    proofResiencePath: z.string().min(1),
    birthCertificatePath: z.string().nullable().optional(),
  }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function calcAge(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}