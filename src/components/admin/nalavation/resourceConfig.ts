import type { Database } from "@/integrations/supabase/types";

export type NalavationTable =
  | "digital_practice_projects"
  | "websites"
  | "website_pages"
  | "website_orders"
  | "domain_registrations"
  | "hosting_accounts"
  | "ssl_certificates"
  | "email_accounts"
  | "business_profiles"
  | "social_profiles"
  | "seo_projects"
  | "google_business_profiles"
  | "maintenance_plans"
  | "website_tasks"
  | "website_invoices"
  | "content_articles"
  | "landing_pages"
  | "digital_assets"
  | "service_catalogue"
  | "service_subscriptions"
  | "nalavation_service_requests"
  | "support_tickets";

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "project" | "doctor" | "boolean" | "tags";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  /** Show in the list table */
  list?: boolean;
  required?: boolean;
}

export interface ResourceDef {
  table: NalavationTable;
  title: string;
  description: string;
  /** Extra equality filters applied on read and on insert */
  scope?: Record<string, string>;
  /** Disable creating new rows (read-only modules) */
  readOnly?: boolean;
  fields: FieldDef[];
  orderBy?: string;
}

const STATUS = (opts: string[]): FieldDef => ({ key: "status", label: "Status", type: "select", options: opts, list: true });

export const RESOURCES: Record<string, ResourceDef> = {
  "nala-projects": {
    table: "digital_practice_projects",
    title: "Digital Practice Projects",
    description: "Every digital practice belongs to one doctor. Websites, hosting, domains and SEO all hang off a project.",
    fields: [
      { key: "name", label: "Project name", list: true, required: true },
      { key: "doctor_id", label: "Doctor", type: "doctor", list: true, required: true },
      { key: "package", label: "Package", list: true },
      STATUS(["onboarding", "in_progress", "live", "on_hold", "cancelled"]),
      { key: "setup_fee", label: "Setup fee", type: "number" },
      { key: "monthly_fee", label: "Monthly fee", type: "number", list: true },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "launch_date", label: "Launch date", type: "date", list: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  "nala-websites": {
    table: "websites",
    title: "Websites",
    description: "Practice websites built and managed by Nalavation.",
    fields: [
      { key: "name", label: "Website name", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "primary_domain", label: "Primary domain", list: true },
      { key: "platform", label: "Platform", type: "select", options: ["custom", "wordpress", "shopify", "webflow"], list: true },
      STATUS(["design", "build", "review", "live", "paused"]),
      { key: "live_url", label: "Live URL" },
      { key: "staging_url", label: "Staging URL" },
      { key: "launched_on", label: "Launched on", type: "date", list: true },
    ],
  },
  "nala-hosting": {
    table: "hosting_accounts",
    title: "Hosting",
    description: "Managed hosting accounts and their renewal dates.",
    fields: [
      { key: "provider", label: "Provider", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "plan", label: "Plan", list: true },
      { key: "server", label: "Server" },
      { key: "username", label: "Username" },
      STATUS(["active", "suspended", "cancelled"]),
      { key: "monthly_fee", label: "Monthly fee", type: "number", list: true },
      { key: "renews_on", label: "Renews on", type: "date", list: true },
    ],
  },
  "nala-domains": {
    table: "domain_registrations",
    title: "Domains",
    description: "Domain registrations and renewal tracking.",
    fields: [
      { key: "domain_name", label: "Domain", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "registrar", label: "Registrar", list: true },
      STATUS(["active", "pending", "expired", "transferred"]),
      { key: "registered_on", label: "Registered on", type: "date" },
      { key: "expires_on", label: "Expires on", type: "date", list: true },
      { key: "auto_renew", label: "Auto renew", type: "boolean", list: true },
      { key: "annual_fee", label: "Annual fee", type: "number" },
    ],
  },
  "nala-ssl": {
    table: "ssl_certificates",
    title: "SSL Certificates",
    description: "Certificate issuers, expiry and renewal state.",
    fields: [
      { key: "domain", label: "Domain", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "issuer", label: "Issuer", list: true },
      STATUS(["active", "pending", "expired"]),
      { key: "issued_on", label: "Issued on", type: "date" },
      { key: "expires_on", label: "Expires on", type: "date", list: true },
      { key: "auto_renew", label: "Auto renew", type: "boolean", list: true },
      { key: "annual_fee", label: "Annual fee", type: "number" },
    ],
  },
  "nala-emails": {
    table: "email_accounts",
    title: "Email Hosting",
    description: "Business mailboxes provisioned per practice.",
    fields: [
      { key: "email_address", label: "Email address", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "mailbox_size_mb", label: "Mailbox size (MB)", type: "number", list: true },
      { key: "monthly_fee", label: "Monthly fee", type: "number", list: true },
      STATUS(["active", "suspended", "cancelled"]),
    ],
  },
  "nala-gbp": {
    table: "google_business_profiles",
    title: "Google Business Profiles",
    description: "Listing creation, verification and review performance.",
    fields: [
      { key: "listing_name", label: "Listing name", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "category", label: "Category", list: true },
      { key: "verification_status", label: "Verification", type: "select", options: ["pending", "submitted", "verified", "rejected"], list: true },
      { key: "listing_url", label: "Listing URL" },
      { key: "rating", label: "Rating", type: "number", list: true },
      { key: "review_count", label: "Reviews", type: "number", list: true },
    ],
  },
  "nala-social": {
    table: "social_profiles",
    title: "Social Profiles",
    description: "Social accounts set up and managed for each practice.",
    fields: [
      { key: "platform", label: "Platform", type: "select", options: ["facebook", "instagram", "linkedin", "x", "tiktok", "youtube"], list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "handle", label: "Handle", list: true },
      { key: "url", label: "URL" },
      { key: "followers", label: "Followers", type: "number", list: true },
      STATUS(["pending", "active", "paused"]),
    ],
  },
  "nala-seo": {
    table: "seo_projects",
    title: "SEO",
    description: "SEO retainers, target keywords and audit history.",
    fields: [
      { key: "package", label: "Package", list: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "target_keywords", label: "Target keywords (comma separated)", type: "tags" },
      STATUS(["active", "paused", "completed"]),
      { key: "monthly_fee", label: "Monthly fee", type: "number", list: true },
      { key: "ranking_score", label: "Ranking score", type: "number", list: true },
    ],
  },
  "nala-articles": {
    table: "content_articles",
    title: "Articles",
    description: "Medical content articles written for practice websites.",
    fields: [
      { key: "title", label: "Title", list: true, required: true },
      { key: "slug", label: "Slug", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      STATUS(["draft", "in_review", "published", "archived"]),
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cover_image_url", label: "Cover image URL" },
    ],
  },
  "nala-landing": {
    table: "landing_pages",
    title: "Landing Pages",
    description: "Campaign landing pages and conversion performance.",
    fields: [
      { key: "title", label: "Title", list: true, required: true },
      { key: "slug", label: "Slug", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      { key: "conversion_goal", label: "Conversion goal", list: true },
      { key: "views", label: "Views", type: "number", list: true },
      { key: "conversions", label: "Conversions", type: "number", list: true },
      STATUS(["draft", "live", "archived"]),
    ],
  },
  "nala-media": {
    table: "digital_assets",
    title: "Media Library",
    description: "Logos, imagery and brand assets stored per practice.",
    fields: [
      { key: "name", label: "Asset name", list: true, required: true },
      { key: "asset_type", label: "Type", type: "select", options: ["image", "logo", "video", "document", "font"], list: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      { key: "doctor_id", label: "Doctor", type: "doctor", list: true },
      { key: "bucket", label: "Bucket" },
      { key: "storage_path", label: "Storage path" },
      { key: "url", label: "URL", list: true },
      { key: "tags", label: "Tags (comma separated)", type: "tags" },
    ],
  },
  "nala-billing": {
    table: "website_invoices",
    title: "Invoices",
    description: "Digital practice invoices — separate from patient consultation payments.",
    fields: [
      { key: "invoice_number", label: "Invoice number", list: true, required: true },
      { key: "doctor_id", label: "Doctor", type: "doctor", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      { key: "category", label: "Category", type: "select", options: ["website", "hosting", "domain", "ssl", "email", "seo", "marketing", "maintenance", "other"], list: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "amount", label: "Amount (excl. tax)", type: "number", list: true },
      { key: "tax_amount", label: "Tax", type: "number" },
      { key: "total_amount", label: "Total", type: "number", list: true },
      { key: "is_recurring", label: "Recurring", type: "boolean", list: true },
      STATUS(["draft", "sent", "paid", "overdue", "cancelled"]),
      { key: "issued_on", label: "Issued on", type: "date", list: true },
      { key: "due_on", label: "Due on", type: "date" },
      { key: "payment_reference", label: "Payment reference" },
    ],
  },
  "nala-services": {
    table: "service_catalogue",
    title: "Service Catalogue",
    description: "Products and services Nalavation sells to practices.",
    fields: [
      { key: "code", label: "Code", list: true, required: true },
      { key: "name", label: "Name", list: true, required: true },
      { key: "category", label: "Category", type: "select", options: ["website", "hosting", "domain", "ssl", "email", "seo", "google", "social", "maintenance", "content", "marketing"], list: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "price", label: "Price", type: "number", list: true },
      { key: "billing_cycle", label: "Billing cycle", type: "select", options: ["once_off", "monthly", "annual"], list: true },
      { key: "is_active", label: "Active", type: "boolean", list: true },
    ],
  },
  "nala-tasks": {
    table: "website_tasks",
    title: "Project Tasks",
    description: "Delivery tasks across all digital practice projects.",
    fields: [
      { key: "title", label: "Task", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true, required: true },
      { key: "description", label: "Description", type: "textarea" },
      STATUS(["todo", "in_progress", "blocked", "done"]),
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"], list: true },
      { key: "due_date", label: "Due date", type: "date", list: true },
    ],
  },
  "nala-support": {
    table: "support_tickets",
    title: "Nalavation Support",
    description: "Support requests raised against the Nalavation business unit.",
    scope: { business_unit: "nalavation" },
    fields: [
      { key: "subject", label: "Subject", list: true, required: true },
      { key: "name", label: "Name", list: true },
      { key: "email", label: "Email", list: true },
      { key: "message", label: "Message", type: "textarea" },
      { key: "source", label: "Source", list: true },
      STATUS(["open", "in_progress", "resolved", "closed"]),
    ],
  },
  "nala-subscriptions": {
    table: "service_subscriptions",
    title: "Active Subscriptions",
    description: "Recurring digital services — hosting, SEO retainers, maintenance and website plans.",
    scope: { business_unit: "nalavation" },
    fields: [
      { key: "name", label: "Subscription", list: true, required: true },
      { key: "doctor_id", label: "Doctor", type: "doctor", list: true, required: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      { key: "service_code", label: "Service code" },
      { key: "amount", label: "Amount", type: "number", list: true },
      { key: "currency", label: "Currency", type: "select", options: ["ZAR", "USD"], list: true },
      { key: "billing_cycle", label: "Billing cycle", type: "select", options: ["monthly", "annual", "quarterly"], list: true },
      STATUS(["active", "paused", "cancelled"]),
      { key: "started_on", label: "Started on", type: "date" },
      { key: "next_billing_on", label: "Next billing", type: "date", list: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  "nala-service-requests": {
    table: "nalavation_service_requests",
    title: "Service Requests",
    description: "Digital service requests raised by doctors from DoctorsOnlining. Convert these into projects, invoices and subscriptions.",
    fields: [
      { key: "service_name", label: "Service", list: true, required: true },
      { key: "service_code", label: "Service code", list: true },
      { key: "practice_name", label: "Practice", list: true },
      { key: "contact_name", label: "Contact" },
      { key: "contact_email", label: "Email", list: true },
      { key: "contact_phone", label: "Phone" },
      { key: "amount", label: "Amount", type: "number", list: true },
      { key: "currency", label: "Currency", type: "select", options: ["ZAR", "USD"] },
      { key: "billing_cycle", label: "Billing cycle", type: "select", options: ["once_off", "monthly", "annual"], list: true },
      { key: "source_platform", label: "Source", list: true },
      { key: "project_id", label: "Project", type: "project", list: true },
      STATUS(["new", "contacted", "quoted", "in_progress", "converted", "declined"]),
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
};

export type DbRow = Record<string, unknown> & { id: string };
export type Tables = Database["public"]["Tables"];
