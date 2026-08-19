import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, ExternalLink, Search, Share2, Mail, Server, Palette, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NALAVATION_CARE_PLANS = "https://nalavation.com/care-plans#plans";

/** Entry-point service code used to register interest before the doctor picks a plan on Nalavation. */
const DIGITAL_PRACTICE_CODE = "care_essential";

type DigitalPracticeStatus =
  | "Not Enabled"
  | "Interested / Setup Requested"
  | "Awaiting Payment"
  | "Payment Received"
  | "Awaiting Setup"
  | "In Setup"
  | "Live"
  | "Suspended"
  | "Cancelled";

const STATUS_TONE: Record<DigitalPracticeStatus, "default" | "secondary" | "outline" | "destructive"> = {
  "Not Enabled": "outline",
  "Interested / Setup Requested": "secondary",
  "Awaiting Payment": "secondary",
  "Payment Received": "secondary",
  "Awaiting Setup": "secondary",
  "In Setup": "secondary",
  Live: "default",
  Suspended: "destructive",
  Cancelled: "destructive",
};

const CATEGORY_ICON: Record<string, typeof Globe> = {
  website: Globe,
  hosting: Server,
  domain: Globe,
  ssl: ShieldCheck,
  email: Mail,
  seo: Search,
  gbp: Search,
  social: Share2,
  branding: Palette,
};

interface ServiceRow {
  code: string;
  name: string;
  category: string;
  billing_type: string;
  amount: number;
  description: string;
}

interface Props {
  user: User;
}

const projectStageToStatus = (stage: string | null | undefined): DigitalPracticeStatus | null => {
  switch ((stage || "").toLowerCase()) {
    case "live":
    case "launched":
      return "Live";
    case "suspended":
      return "Suspended";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "design":
    case "build":
    case "content":
    case "in_progress":
    case "review":
      return "In Setup";
    case "discovery":
    case "onboarding":
    case "awaiting_setup":
    case "queued":
      return "Awaiting Setup";
    default:
      return null;
  }
};

const requestStatusToStatus = (status: string | null | undefined): DigitalPracticeStatus => {
  switch ((status || "").toLowerCase()) {
    case "declined":
      return "Cancelled";
    case "converted":
      return "Awaiting Setup";
    case "quoted":
      return "Awaiting Payment";
    default:
      return "Interested / Setup Requested";
  }
};

const DoctorPracticeServices = ({ user }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [status, setStatus] = useState<DigitalPracticeStatus>("Not Enabled");
  const [projectDomain, setProjectDomain] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: serviceRows }, { data: requestRows }, { data: projectRows }] = await Promise.all([
      supabase
        .from("nalavation_services")
        .select("code,name,category,billing_type,amount,description")
        .eq("is_active", true)
        .order("category"),
      supabase
        .from("nalavation_service_requests")
        .select("status,created_at")
        .eq("requester_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("nalavation_website_projects")
        .select("stage,domain,updated_at")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1),
    ]);

    setServices((serviceRows as ServiceRow[]) || []);

    const project = projectRows?.[0];
    const projectStatus = projectStageToStatus(project?.stage);
    if (projectStatus) {
      setStatus(projectStatus);
      setProjectDomain(project?.domain ?? null);
    } else if (requestRows?.[0]) {
      setStatus(requestStatusToStatus(requestRows[0].status));
      setProjectDomain(null);
    } else {
      setStatus("Not Enabled");
      setProjectDomain(null);
    }

    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEnable = async () => {
    setStarting(true);
    try {
      // Fetch the doctor's own contact/practice details for the handoff (no tokens in the URL).
      const [{ data: profile }, { data: doctorRow }] = await Promise.all([
        supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle(),
        supabase.from("doctors").select("practice_id").eq("profile_id", user.id).maybeSingle(),
      ]);

      let practiceName: string | null = null;
      if (doctorRow?.practice_id) {
        const { data: practice } = await supabase
          .from("practices")
          .select("practice_name")
          .eq("id", doctorRow.practice_id)
          .maybeSingle();
        practiceName = practice?.practice_name ?? null;
      }

      const { data: requestId, error } = await supabase.rpc("nalavation_request_service", {
        _service_code: DIGITAL_PRACTICE_CODE,
        _practice_name: practiceName,
        _contact_name: profile?.full_name || user.user_metadata?.full_name || "",
        _contact_email: profile?.email || user.email || "",
        _contact_phone: profile?.phone || null,
        _notes: "Digital Practice interest from Doctors Onlining dashboard. Plan selected on Nalavation Care Plans.",
        _source_platform: "doctorsonlining",
        _external_ref: user.id,
      });

      if (error) throw error;

      // Only an opaque request reference travels in the URL — Nalavation resolves the
      // doctor identity server-side from the shared database.
      const url = new URL(NALAVATION_CARE_PLANS);
      url.searchParams.set("src", "doctorsonlining");
      if (requestId) url.searchParams.set("ref", String(requestId));

      await load();
      window.open(`${url.origin}${url.pathname}?${url.searchParams.toString()}#plans`, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the Digital Practice request.";
      toast({ title: "Something went wrong", description: message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const isEnabled = status !== "Not Enabled" && status !== "Cancelled";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Services for Your Practice</h2>
        <p className="text-sm text-muted-foreground">
          Optional professional services for your practice, delivered and billed by Nalavation — separate from your patient consultations and payouts.
        </p>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">by Nalavation</span>
                <Badge variant={STATUS_TONE[status]}>Status: {status}</Badge>
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight">Digital Practice</h3>
              <p className="mt-2 text-base text-muted-foreground">
                {isEnabled
                  ? status === "Live"
                    ? "Your Digital Practice is live, managed by Nalavation."
                    : "Your Digital Practice is being handled by Nalavation."
                  : "Build and grow your professional online presence with Nalavation. Get a professional healthcare website and digital presence designed specifically for your practice."}
              </p>
              {projectDomain && (
                <p className="mt-2 text-sm font-medium text-foreground">{projectDomain}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Optional. Plans, setup, hosting and billing are handled by Nalavation.
              </p>
            </div>
            <Button
              size="lg"
              className="shrink-0 gradient-primary border-0 text-primary-foreground"
              onClick={isEnabled ? () => window.open(NALAVATION_CARE_PLANS, "_blank", "noopener,noreferrer") : handleEnable}
              disabled={starting}
            >
              {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEnabled ? "View Digital Practice" : "Enable Digital Practice"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {services.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">More Nalavation services</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = CATEGORY_ICON[service.category] || Globe;
              return (
                <Card key={service.code}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-display text-base font-semibold">{service.name}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {service.billing_type.replace("_", " ")} · billed by Nalavation
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPracticeServices;
