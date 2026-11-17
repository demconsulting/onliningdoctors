export interface PayoutTarget {
  subaccount_code?: string | null;
  is_ready?: boolean | null;
}

/** Paystack transaction_charge is the main account's share, in minor units. */
export function buildDirectSplit(amount: number, platformFee: number, payout: PayoutTarget | null) {
  if (!payout?.is_ready || !payout.subaccount_code?.startsWith("ACCT_")) {
    throw new Error("This doctor or practice has no approved Paystack payout account. Please contact the practice before paying.");
  }
  const gross = Math.round(amount * 100);
  const fee = Math.round(platformFee * 100);
  if (!Number.isSafeInteger(gross) || !Number.isSafeInteger(fee) || gross <= 0 || fee < 0 || fee >= gross) {
    throw new Error("The platform fee cannot be applied to this payment. Please contact support.");
  }
  return { subaccount: payout.subaccount_code, transaction_charge: fee, bearer: "account" as const };
}

export function isDirectSettlement(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const record = metadata as Record<string, unknown>;
  if (record.settlement_mode === "paystack_split") return true;
  return !!record.metadata && typeof record.metadata === "object" &&
    (record.metadata as Record<string, unknown>).settlement_mode === "paystack_split";
}