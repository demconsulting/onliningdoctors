import { describe, expect, it, vi } from "vitest";
import { isConsultationHistoryActive, loadConsultationHistory } from "@/lib/consultationHistory";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

const start = Date.parse("2026-11-17T10:00:00Z");
const appointment = { status: "confirmed", scheduled_at: "2026-11-17T10:00:00Z", duration_minutes: 30 };

describe("current consultation history access", () => {
  it("automatically permits a confirmed consultation during its appointment time", () => {
    expect(isConsultationHistoryActive(appointment, start)).toBe(true);
  });
  it("does not reveal history before the consultation preparation window", () => {
    expect(isConsultationHistoryActive(appointment, start - 15 * 60_000 - 1)).toBe(false);
    expect(isConsultationHistoryActive(appointment, start - 15 * 60_000)).toBe(true);
  });
  it("expires access thirty minutes after the appointment end", () => {
    expect(isConsultationHistoryActive(appointment, start + 60 * 60_000 - 1)).toBe(true);
    expect(isConsultationHistoryActive(appointment, start + 60 * 60_000)).toBe(false);
  });
  it.each(["completed", "cancelled", "awaiting_payment", "pending", "no_show"])("denies automatic history access for %s appointments", status => {
    expect(isConsultationHistoryActive({ ...appointment, status }, start)).toBe(false);
  });
  it("honours a stored end time", () => {
    expect(isConsultationHistoryActive({ ...appointment, end_time: "2026-11-17T10:15:00Z" }, start + 45 * 60_000)).toBe(false);
  });
  it("uses only the appointment-scoped audited RPC, without accepting a patient or doctor id", async () => {
    const result = { appointment_id: "current", consultations: [] };
    rpc.mockResolvedValueOnce({ data: result, error: null });
    expect(await loadConsultationHistory("current")).toEqual(result);
    expect(rpc).toHaveBeenLastCalledWith("get_current_consultation_history", { _appointment_id: "current" });
  });
  it("does not return history when the server rejects access or audit logging", async () => {
    rpc.mockResolvedValueOnce({ data: { consultations: [{ notes: "private" }] }, error: new Error("access denied") });
    await expect(loadConsultationHistory("current")).rejects.toThrow("access denied");
  });
});