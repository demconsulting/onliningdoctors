import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import MedicalAidPanel from "@/components/patient/MedicalAidPanel";
import MedicalAidDetails from "@/components/patient/MedicalAidDetails";

const state = vi.hoisted(() => ({
  row: null as Record<string, any> | null,
  writes: [] as Record<string, any>[],
  requests: [] as Record<string, any>[],
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      let payload: Record<string, any> | undefined;
      const result = () => {
        if (payload && table === "patient_medical_aid") {
          state.writes.push(payload);
          state.row = { ...state.row, ...payload, id: "saved-aid" };
        }
        if (payload && table === "medical_aid_requests") state.requests.push(payload);
        return { data: table === "patient_medical_aid" ? (state.row ? [state.row] : []) : [], error: null };
      };
      const query: any = {
        select: () => query, eq: () => query, is: () => query, order: () => query,
        update: (p: Record<string, any>) => { payload = p; return query; },
        insert: (p: Record<string, any>) => { payload = p; return query; },
        maybeSingle: () => Promise.resolve({ data: state.row, error: null }),
        single: () => { result(); return Promise.resolve({ data: state.row, error: null }); },
        then: (resolve: (value: any) => void) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
    channel: () => { const channel: any = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel: vi.fn(),
  },
}));

const savedRow = (isMainMember: boolean) => ({
  id: "saved-aid", patient_id: "patient", dependent_id: null,
  scheme_name: "Bonitas", plan: "Standard", membership_number: "123",
  dependent_code: "00", is_main_member: isMainMember,
  main_member_name: isMainMember ? null : "Main Member",
  main_member_id_number: isMainMember ? null : "8001015009087",
  main_member_dob: isMainMember ? null : "1980-01-01",
  consent_to_share_with_scheme: true, consent_given_at: "2026-10-28T09:00:00.000Z",
});

async function openBooking() {
  render(<MedicalAidPanel patientId="patient" doctorId="doctor" currencySymbol="R" onActiveRequestChange={() => {}} />);
  await screen.findByRole("button", { name: "Request Verification" });
  await waitFor(() => expect(screen.getByDisplayValue("123")).toBeInTheDocument());
}

beforeEach(() => {
  cleanup(); state.row = null; state.writes = []; state.requests = []; state.toast.mockClear();
});

describe("medical aid booking saves", () => {
  it("preserves a saved main member through booking and a subsequent Medical Aid tab save", async () => {
    state.row = savedRow(true);
    await openBooking();
    fireEvent.change(screen.getByLabelText("Main member name *"), { target: { value: "Patient Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Verification" }));
    await waitFor(() => expect(state.requests).toHaveLength(1));
    expect(state.row).toMatchObject({ is_main_member: true, main_member_name: null, main_member_id_number: null, main_member_dob: null });
    expect(state.requests[0].main_member_name).toBe("Patient Name");
    cleanup();
    render(<MedicalAidDetails user={{ id: "patient" } as User} />);
    await screen.findByRole("button", { name: "Save" });
    expect(screen.getByRole("switch", { name: "This person is the main member" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.writes).toHaveLength(2));
    expect(state.row?.is_main_member).toBe(true);
  });

  it("preserves saved non-main-member name, ID and birth date", async () => {
    state.row = savedRow(false);
    await openBooking();
    fireEvent.click(screen.getByRole("button", { name: "Request Verification" }));
    await waitFor(() => expect(state.requests).toHaveLength(1));
    expect(state.row).toMatchObject({ is_main_member: false, main_member_name: "Main Member", main_member_id_number: "8001015009087", main_member_dob: "1980-01-01" });
  });

  it("saves a new self main member without inventing another member's ID or birth date", async () => {
    render(<MedicalAidPanel patientId="patient" doctorId="doctor" currencySymbol="R" onActiveRequestChange={() => {}} />);
    await screen.findByRole("button", { name: "Request Verification" });
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Bonitas" } });
    fireEvent.change(inputs[2], { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Main member name *"), { target: { value: "Patient Name" } });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Request Verification" }));
    await waitFor(() => expect(state.requests).toHaveLength(1));
    expect(state.row).toMatchObject({ is_main_member: true, main_member_id_number: null, main_member_dob: null });
  });

  it("does not overwrite a saved main member with incomplete other-member details", async () => {
    state.row = savedRow(true);
    await openBooking();
    fireEvent.change(screen.getByLabelText("Main member name *"), { target: { value: "Other Member" } });
    fireEvent.click(screen.getByRole("switch", { name: "This person is the main member" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Verification" }));
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Enter the main member's ID number" }));
    expect(state.writes).toHaveLength(0);
    expect(state.requests).toHaveLength(0);
    expect(state.row?.is_main_member).toBe(true);
  });
});