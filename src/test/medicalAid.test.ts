import { describe, it, expect } from "vitest";
import { consentTimestamp, emptyMedicalAidForm, validateMedicalAidForm } from "@/lib/medicalAid";

const valid = () => ({ ...emptyMedicalAidForm(), scheme_name: "Bonitas", membership_number: "123", consent_to_share_with_scheme: true });

describe("medical aid rules", () => {
  it("clears consent date when unticked", () => {
    expect(consentTimestamp(false, "2026-01-01T00:00:00.000Z")).toBeNull();
  });
  it("sets consent date when newly ticked and keeps an existing one", () => {
    const now = new Date("2026-10-28T09:00:00.000Z");
    expect(consentTimestamp(true, null, now)).toBe("2026-10-28T09:00:00.000Z");
    expect(consentTimestamp(true, "2026-01-01T00:00:00.000Z", now)).toBe("2026-01-01T00:00:00.000Z");
  });
  it("requires consent", () => {
    expect(validateMedicalAidForm({ ...valid(), consent_to_share_with_scheme: false })).not.toBeNull();
    expect(validateMedicalAidForm(valid())).toBeNull();
  });
  it("requires main member name, ID and DOB when not the main member", () => {
    const f = { ...valid(), is_main_member: false };
    expect(validateMedicalAidForm(f)).not.toBeNull();
    expect(validateMedicalAidForm({ ...f, main_member_name: "A", main_member_id_number: "1", main_member_dob: "1980-01-01" })).toBeNull();
  });
});
