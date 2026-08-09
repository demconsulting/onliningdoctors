export const RECRUITMENT_SOURCES = [
  "Direct outreach",
  "Doctor referral",
  "Patient referral",
  "Website application",
  "Social media",
  "LinkedIn",
  "WhatsApp campaign",
  "Email campaign",
  "Conference or event",
  "Medical association",
  "Business developer",
] as const;

export const DIGITAL_SERVICES = [
  { key: "website", label: "Practice website" },
  { key: "google_business_profile", label: "Google Business Profile" },
  { key: "social_media", label: "Social media setup" },
  { key: "website_migration", label: "Website migration" },
  { key: "website_upgrade", label: "Website upgrade" },
  { key: "integration_only", label: "Integration only" },
] as const;

export const SERVICE_STATUSES = [
  { key: "not_required", label: "Not required" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_approval", label: "Awaiting approval" },
  { key: "live", label: "Live" },
  { key: "completed", label: "Completed" },
] as const;

export const TIER_LABELS: Record<string, string> = {
  pioneer: "Pioneer Founding Doctor",
  founding: "Founding Doctor",
  standard: "Standard Doctor",
};
