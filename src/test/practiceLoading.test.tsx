import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePractice } from "@/hooks/usePractice";

const mock = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: () => mock.read() };
  return query;
} } }));

describe("Practice loading for a signed-in owner", () => {
  it("waits for the owner's practice instead of treating it as missing when the session arrives", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mock.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ data: { role: "owner", status: "active" } });
    const { result, rerender } = renderHook(({ id }) => usePractice(id), { initialProps: { id: undefined as string | undefined } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ id: "solo-owner" });
    expect(result.current.loading).toBe(true);
    await act(async () => { finish?.({ data: { id: "solo-practice", owner_id: "solo-owner" } }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.practice?.id).toBe("solo-practice");
    expect(result.current.isManager).toBe(true);
  });
});