import { z } from "zod";

export const practiceRegistrationSchema = z.object({
  practice_name: z.string().trim().min(2).max(200),
  practice_number: z.string().trim().min(3).max(50),
  bhf_number: z.string().trim().max(50).optional().or(z.literal("")),
  owner_doctor_name: z.string().trim().min(2).max(200),
  owner_hpcsa_number: z.string().trim().min(2).max(50),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(3).max(50),
  address: z.string().trim().min(3).max(500),
  bank_name: z.string().trim().min(2).max(100),
  account_name: z.string().trim().min(2).max(200),
  account_number: z.string().trim().min(5).max(30),
  is_medical_aid_practice: z.boolean(),
});

type RegistrationInput = z.infer<typeof practiceRegistrationSchema>;
type RegistrationDetails = Required<Omit<RegistrationInput, "bhf_number">> & { bhf_number: string | null; practice_type: "solo" };

export function practiceRegistrationDetails(form: RegistrationInput): RegistrationDetails {
  const data = practiceRegistrationSchema.parse(form);
  return {
    practice_name: data.practice_name ?? "", practice_number: data.practice_number ?? "",
    owner_doctor_name: data.owner_doctor_name ?? "", owner_hpcsa_number: data.owner_hpcsa_number ?? "",
    email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "",
    bank_name: data.bank_name ?? "", account_name: data.account_name ?? "", account_number: data.account_number ?? "",
    is_medical_aid_practice: data.is_medical_aid_practice ?? false,
    bhf_number: data.bhf_number || null, practice_type: "solo",
  };
}