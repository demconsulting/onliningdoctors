export const FUNNEL_STAGE_KEYS = [
  "lead",
  "contacted",
  "interested",
  "meeting_scheduled",
  "demo_completed",
  "invited",
  "registered",
  "pending_verification",
  "verified",
  "founding_doctor",
  "activated",
  "first_consultation_completed",
] as const;

const splitName = (fullName?: string | null) => {
  const parts = (fullName || "Unnamed Doctor").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "Unnamed",
    last_name: parts.slice(1).join(" ") || "Doctor",
  };
};

export const doctorStage = (doctor: any) => {
  if (doctor.is_founding_doctor) return "founding_doctor";
  if (doctor.is_verified) return "verified";
  return "pending_verification";
};

export const buildDoctorProspectRows = (doctors: any[], crmProspects: any[] = []) => {
  const linkedDoctorIds = new Set(crmProspects.map((p) => p.linked_doctor_profile_id).filter(Boolean));

  return doctors
    .filter((doctor) => !doctor.is_suspended && doctor.profile_id && !linkedDoctorIds.has(doctor.profile_id))
    .map((doctor) => {
      const profile = Array.isArray(doctor.profile) ? doctor.profile[0] : doctor.profile;
      const name = splitName(profile?.full_name);

      return {
        ...name,
        id: `doctor:${doctor.profile_id}`,
        __source: "doctor",
        title: doctor.title || "Dr.",
        specialty: doctor.specialty || "Registered doctor",
        hpcsa_number: doctor.license_number || "",
        practice_name: doctor.practice_name || "",
        province: profile?.state || profile?.province || "",
        city: profile?.city || "",
        mobile_number: profile?.phone || "",
        whatsapp_number: profile?.phone || "",
        email: "",
        referral_source: "direct registration",
        notes: doctor.is_verified ? "Registered doctor" : "Registered doctor awaiting verification documents",
        stage: doctorStage(doctor),
        linked_doctor_profile_id: doctor.profile_id,
        created_at: doctor.created_at,
        updated_at: doctor.updated_at || doctor.created_at,
        is_verified: doctor.is_verified,
        is_founding_doctor: doctor.is_founding_doctor,
      };
    });
};

export const mergeFunnelWithDoctors = (
  base: Record<string, number>,
  doctors: any[],
  availabilityRows: any[],
  completedAppointments: any[],
  manualProspectCount = 0,
) => {
  const next = { ...base };
  const docs = doctors.filter((doctor) => !doctor.is_suspended);
  const availability = new Set(availabilityRows.map((row) => row.doctor_id));
  const consultations = new Set(completedAppointments.map((row) => row.doctor_id));
  const bump = (key: string, value: number) => {
    next[key] = Math.max(next[key] || 0, value);
  };

  bump("lead", manualProspectCount + docs.length);
  bump("registered", docs.length);
  bump("pending_verification", docs.filter((doctor) => !doctor.is_verified).length);
  bump("verified", docs.filter((doctor) => doctor.is_verified).length);
  bump("founding_doctor", docs.filter((doctor) => doctor.is_founding_doctor).length);
  bump("activated", docs.filter((doctor) => doctor.is_verified && availability.has(doctor.profile_id)).length);
  bump("first_consultation_completed", docs.filter((doctor) => consultations.has(doctor.profile_id)).length);

  return next;
};