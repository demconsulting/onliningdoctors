import { describe, expect, it } from "vitest";
import { canAccessGroupPractice, missingDoctorCredentials, MEMBER_ROLES, PRACTICE_TYPES } from "@/lib/groupPractice";
describe("Group practice foundation", () => {
  it("allows practice administrators and admins only", () => {
    expect(canAccessGroupPractice(["practice_admin"])).toBe(true);
    expect(canAccessGroupPractice(["admin"])).toBe(true);
    expect(canAccessGroupPractice(["doctor", "patient"])).toBe(false);
    expect(canAccessGroupPractice([])).toBe(false);
  });
  it("flags each missing doctor credential", () => {
    expect(missingDoctorCredentials({})).toEqual(["HPCSA", "Individual BHF", "Physical practice address"]);
    expect(missingDoctorCredentials({ hpcsa_number: "MP123", individual_bhf_number: "123", physical_practice_address: " " })).toEqual(["Physical practice address"]);
    expect(missingDoctorCredentials({ hpcsa_number: "MP123", individual_bhf_number: "123", physical_practice_address: "1 Main Road" })).toEqual([]);
  });
  it("supports the requested practice types", () => expect(PRACTICE_TYPES).toEqual(["solo", "partnership", "association", "incorporated"]));
  it("supports the requested membership roles", () => expect(MEMBER_ROLES).toEqual(["principal", "partner", "associate"]));
});