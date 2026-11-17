import { describe, expect, it } from "vitest";
import { practiceRegistrationDetails, practiceRegistrationSchema } from "@/lib/practiceRegistration";

const solo = {
  practice_name: "Solo Medical Practice", practice_number: "1234567", bhf_number: "",
  owner_doctor_name: "Dr Example", owner_hpcsa_number: "MP123456", email: "doctor@example.com",
  phone: "0810000000", address: "10 Medical Street", bank_name: "FNB",
  account_name: "Solo Medical Practice", account_number: "1234567890", is_medical_aid_practice: true,
};

describe("Solo practice registration", () => {
  it("registers a solo medical aid practice without any additional doctors", () => {
    expect(practiceRegistrationDetails(solo)).toMatchObject({ practice_type: "solo", is_medical_aid_practice: true });
  });
  it("allows registration without BHF so it can be added later", () => {
    expect(practiceRegistrationDetails(solo).bhf_number).toBeNull();
  });
  it("preserves the practice BHF for medical aid setup", () => {
    expect(practiceRegistrationDetails({ ...solo, bhf_number: " 7654321 " }).bhf_number).toBe("7654321");
  });
  it("keeps the owner's HPCSA mandatory", () => {
    expect(practiceRegistrationSchema.safeParse({ ...solo, owner_hpcsa_number: "" }).success).toBe(false);
  });
});