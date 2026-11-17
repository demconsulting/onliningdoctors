import { describe, expect, it } from "vitest";
import { buildDirectSplit, isDirectSettlement } from "../../supabase/functions/paystack-payment/split";

describe("direct Paystack consultation settlement", () => {
  it("allocates only the platform fee to Doctors Onlining and the rest to the doctor", () => {
    const split = buildDirectSplit(450, 65, { is_ready: true, subaccount_code: "ACCT_doctor" });
    expect(split).toEqual({ subaccount: "ACCT_doctor", transaction_charge: 6500, bearer: "account" });
    expect(45000 - split.transaction_charge).toBe(38500);
  });
  it("uses the approved practice recipient for the consulting doctor", () => {
    expect(buildDirectSplit(600, 75, { is_ready: true, subaccount_code: "ACCT_practice" }).subaccount).toBe("ACCT_practice");
  });
  it("never falls back to collecting all funds when approval or recipient is missing", () => {
    expect(() => buildDirectSplit(450, 65, null)).toThrow();
    expect(() => buildDirectSplit(450, 65, { is_ready: false, subaccount_code: "ACCT_pending" })).toThrow();
    expect(() => buildDirectSplit(450, 65, { is_ready: true })).toThrow();
  });
  it("rejects a fee that consumes more than the patient's payment", () => {
    expect(() => buildDirectSplit(50, 65, { is_ready: true, subaccount_code: "ACCT_doctor" })).toThrow();
  });
  it("excludes direct settlements from manual withdrawal, including verified provider metadata", () => {
    expect(isDirectSettlement({ settlement_mode: "paystack_split" })).toBe(true);
    expect(isDirectSettlement({ metadata: { settlement_mode: "paystack_split" } })).toBe(true);
    expect(isDirectSettlement({})).toBe(false);
  });
});