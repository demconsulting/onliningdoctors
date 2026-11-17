import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import PatientConsultationHistory from "@/components/call/PatientConsultationHistory";
import type { ConsultationHistory } from "@/lib/consultationHistory";

const state = vi.hoisted(() => ({ load: vi.fn(), removeChannel: vi.fn(), changed: null as (() => void) | null }));
vi.mock("@/lib/consultationHistory", () => ({ loadConsultationHistory: state.load }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: () => {
    const channel = { on: (_type: string, _filter: unknown, callback: () => void) => { state.changed = callback; return channel; }, subscribe: () => channel };
    return channel;
  },
  removeChannel: state.removeChannel,
} }));

const history = (): ConsultationHistory => ({
  appointment_id: "current", dependent_id: null,
  access_expires_at: new Date(Date.now() + 120_000).toISOString(),
  profile: { full_name: "Patient", date_of_birth: null, gender: null, allergies: "Penicillin" },
  consultations: [{ appointment_id: "previous", scheduled_at: "2026-11-10T10:00:00Z", doctor_name: "Previous Doctor", reason: "Follow-up", notes: "Previous clinical history", summary: null, prescriptions: [] }],
});

beforeEach(() => { state.load.mockReset(); state.removeChannel.mockClear(); state.changed = null; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("automatic consultation history loading", () => {
  it("loads previous consultations automatically without a document-sharing or expand action", async () => {
    state.load.mockResolvedValue(history());
    render(<PatientConsultationHistory appointmentId="current" />);
    await waitFor(() => expect(state.load).toHaveBeenCalledWith("current"));
    await waitFor(() => expect(state.load).toHaveBeenCalledTimes(1));
  });
  it("checks authorization again when the current consultation is completed or cancelled", async () => {
    state.load.mockResolvedValueOnce(history()).mockRejectedValueOnce(new Error("access ended"));
    const view = render(<PatientConsultationHistory appointmentId="current" />);
    await waitFor(() => expect(state.load).toHaveBeenCalledTimes(1));
    await act(async () => { state.changed?.(); });
    expect(state.load).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(state.removeChannel).toHaveBeenCalledTimes(1);
  });
  it("rechecks server access every minute while the consultation is open", async () => {
    vi.useFakeTimers();
    state.load.mockResolvedValue(history());
    render(<PatientConsultationHistory appointmentId="current" />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(state.load).toHaveBeenCalledTimes(2);
  });
  it("loads the new consultation rather than reusing a previous patient's history", async () => {
    state.load.mockResolvedValue(history());
    const view = render(<PatientConsultationHistory appointmentId="current" />);
    await waitFor(() => expect(state.load).toHaveBeenCalledWith("current"));
    view.rerender(<PatientConsultationHistory appointmentId="another" />);
    await waitFor(() => expect(state.load).toHaveBeenLastCalledWith("another"));
  });
});