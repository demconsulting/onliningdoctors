import { describe, expect, it } from "vitest";
import { hasUsableAvailability, missingItems, nextDueReminder } from "../../supabase/functions/process-doctor-onboarding-reminders/rules";

const complete = { id_document_path: "id.pdf", license_document_path: "license.pdf", consultation_fee: 450, profile: { avatar_url: "photo.jpg" } };

describe("doctor onboarding reminders", () => {
  it("reminds doctors missing required documents", () => {
    expect(missingItems({ ...complete, id_document_path: null, license_document_path: null }, true)).toEqual(["ID Copy", "HPCSA Document"]);
  });
  it("reminds doctors who have not set their consultation fee", () => {
    expect(missingItems({ ...complete, consultation_fee: null }, true)).toEqual(["Consultation Fee"]);
  });
  it("reminds doctors who have not completed scheduling", () => {
    expect(missingItems(complete, false)).toEqual(["Availability"]);
  });
  it("does not treat disabled or empty schedules as completed scheduling", () => {
    expect(hasUsableAvailability([{ is_available: false, start_time: "09:00", end_time: "17:00" }, { is_available: true, start_time: "09:00", end_time: "09:00" }])).toBe(false);
    expect(hasUsableAvailability([{ is_available: true, start_time: "09:00", end_time: "17:00" }])).toBe(true);
  });
  it("does not remind a doctor with complete documents fees and scheduling", () => {
    expect(missingItems(complete, true)).toEqual([]);
  });
  it("sends only a due unsent configured reminder", () => {
    const reminders = [{ id: "day", delay_minutes: 1440 }, { id: "week", delay_minutes: 10080 }];
    expect(nextDueReminder(reminders, new Set(), 1439)).toBeUndefined();
    expect(nextDueReminder(reminders, new Set(["day"]), 10080)?.id).toBe("week");
    expect(nextDueReminder(reminders, new Set(["day", "week"]), 20000)).toBeUndefined();
  });
});