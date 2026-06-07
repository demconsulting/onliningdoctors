export type TemplateKey =
  | "introduction"
  | "follow_up"
  | "founding_invitation"
  | "missing_documents"
  | "verification_approved"
  | "welcome_doctor"
  | "missing_hpcsa"
  | "missing_id"
  | "incomplete_profile";

export interface RecruitmentTemplate {
  key: TemplateKey;
  label: string;
  emailSubject: string;
  emailBody: string;
  whatsapp: string;
}

export const TEMPLATES: RecruitmentTemplate[] = [
  {
    key: "introduction",
    label: "Introduction",
    emailSubject: "Introducing Doctors Onlining",
    emailBody: `<p>Hi Dr. {{name}},</p><p>I'm reaching out from <strong>Doctors Onlining</strong>, South Africa's modern telemedicine platform built around HPCSA & POPIA compliance.</p><p>We'd love to show you how our platform helps doctors reach more patients with zero setup cost. Could we schedule a 15-minute demo this week?</p>`,
    whatsapp: `Hi Dr. {{name}}, this is the team from Doctors Onlining 👋. We're inviting select HPCSA-registered doctors to join South Africa's modern telemedicine platform. Could we schedule a quick 15-min demo this week?`,
  },
  {
    key: "follow_up",
    label: "Follow-Up",
    emailSubject: "Quick follow-up — Doctors Onlining",
    emailBody: `<p>Hi Dr. {{name}},</p><p>Just following up on our previous conversation about Doctors Onlining. Do you have a few minutes this week for a quick chat?</p>`,
    whatsapp: `Hi Dr. {{name}}, just following up on Doctors Onlining 🙂. Any thoughts? Happy to answer questions or schedule a short demo.`,
  },
  {
    key: "founding_invitation",
    label: "Founding Doctor Invitation",
    emailSubject: "You're invited: Founding 10 Doctors Program 👑",
    emailBody: `<p>Dr. {{name}},</p><p>We'd like to invite you to apply for our exclusive <strong>Founding 10 Doctors Program</strong>. Founding doctors enjoy locked-in lifetime pricing, priority placement, and early access to new features.</p><p>Only 10 spots are available. Apply today from your Doctors Onlining dashboard.</p>`,
    whatsapp: `Dr. {{name}}, you've been invited to apply for our Founding 10 Doctors Program 👑. Locked-in pricing & priority placement — only 10 slots. Want me to send details?`,
  },
  {
    key: "missing_documents",
    label: "Missing Documents Reminder",
    emailSubject: "Quick reminder: a few documents are missing",
    emailBody: `<p>Hi Dr. {{name}},</p><p>To finish verifying your Doctors Onlining account, we still need a few documents (HPCSA certificate / ID / profile photo). Log in to your dashboard to upload them and we'll have you live shortly.</p>`,
    whatsapp: `Hi Dr. {{name}}, just a friendly reminder — please upload your missing verification documents in your Doctors Onlining dashboard so we can complete your verification.`,
  },
  {
    key: "verification_approved",
    label: "Verification Approved",
    emailSubject: "🎉 Your Doctors Onlining account is verified",
    emailBody: `<p>Congratulations Dr. {{name}}!</p><p>Your account has been verified. You can now set your availability and start accepting patients.</p>`,
    whatsapp: `🎉 Dr. {{name}}, your Doctors Onlining account has been verified! You can now set your availability and start accepting patients.`,
  },
  {
    key: "welcome_doctor",
    label: "Welcome Doctor",
    emailSubject: "Welcome to Doctors Onlining",
    emailBody: `<p>Welcome Dr. {{name}},</p><p>Thanks for joining Doctors Onlining. Here's how to get the most out of your first week...</p>`,
    whatsapp: `Welcome to Doctors Onlining, Dr. {{name}} 🩺! Let me know if you'd like a quick onboarding walkthrough.`,
  },
  {
    key: "missing_hpcsa",
    label: "Missing HPCSA",
    emailSubject: "Action needed: HPCSA certificate",
    emailBody: `<p>Hi Dr. {{name}},</p><p>We still need your <strong>HPCSA certificate</strong> to complete your verification.</p>`,
    whatsapp: `Hi Dr. {{name}}, please upload your HPCSA certificate in your dashboard to finish verification.`,
  },
  {
    key: "missing_id",
    label: "Missing ID",
    emailSubject: "Action needed: ID document",
    emailBody: `<p>Hi Dr. {{name}},</p><p>We still need a copy of your <strong>ID document</strong> to complete your verification.</p>`,
    whatsapp: `Hi Dr. {{name}}, please upload your ID document in your dashboard to finish verification.`,
  },
  {
    key: "incomplete_profile",
    label: "Incomplete Profile",
    emailSubject: "Complete your Doctors Onlining profile",
    emailBody: `<p>Hi Dr. {{name}},</p><p>Your profile is almost ready — please add the remaining details so patients can find you.</p>`,
    whatsapp: `Hi Dr. {{name}}, your Doctors Onlining profile is almost complete — just a few details left. Need help?`,
  },
];

export const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "bg-slate-500" },
  { key: "contacted", label: "Contacted", color: "bg-blue-500" },
  { key: "interested", label: "Interested", color: "bg-cyan-500" },
  { key: "meeting_scheduled", label: "Meeting Scheduled", color: "bg-indigo-500" },
  { key: "demo_completed", label: "Demo Completed", color: "bg-violet-500" },
  { key: "invited", label: "Invited", color: "bg-purple-500" },
  { key: "registered", label: "Registered", color: "bg-amber-500" },
  { key: "pending_verification", label: "Pending Verification", color: "bg-orange-500" },
  { key: "verified", label: "Verified", color: "bg-emerald-500" },
  { key: "founding_doctor", label: "Founding Doctor", color: "bg-yellow-500" },
  { key: "declined", label: "Declined", color: "bg-rose-500" },
];

export function stageLabel(key: string) {
  return PIPELINE_STAGES.find((s) => s.key === key)?.label || key;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
