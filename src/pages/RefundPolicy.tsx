import { useRef, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { LegalDocument } from "@/data/legalContent";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PdfDownloadButton from "@/components/shared/PdfDownloadButton";
import Seo from "@/components/seo/Seo";

const fallbackRefundPolicy: LegalDocument = {
  heading: "Refund Policy",
  lastUpdated: "April 2026",
  sections: [
    {
      title: "1. Overview",
      content:
        "This Refund Policy outlines the conditions under which patients may request a refund for consultations booked through Onlining Doctors. We are committed to ensuring fair outcomes for both patients and healthcare providers.",
    },
    {
      title: "2. Eligibility for Refunds",
      content:
        "Refunds may be requested under the following circumstances: (a) The doctor did not attend the scheduled consultation and did not reschedule within a reasonable timeframe; (b) A technical failure on our platform prevented the consultation from taking place, and neither party was able to connect; (c) The consultation was cancelled by the doctor before the scheduled time. Refunds are generally not available for consultations that were completed, or where the patient failed to attend the scheduled appointment.",
    },
    {
      title: "3. Refund Request Process",
      content:
        "To request a refund, patients must contact our support team within 48 hours of the scheduled consultation. Please provide your appointment details, a description of the issue, and any supporting evidence. Our team will review the request and respond within 5 business days.",
    },
    {
      title: "4. Refund Amount",
      content:
        "Approved refunds will be processed for the full consultation fee paid. Transaction processing fees charged by payment providers may or may not be refundable depending on the payment provider's policies. Refunds will be issued to the original payment method used during booking.",
    },
    {
      title: "5. Processing Time",
      content:
        "Once a refund is approved, the funds will typically be returned within 5–10 business days, depending on your bank or payment provider. We will notify you via email once the refund has been initiated.",
    },
    {
      title: "6. Disputes",
      content:
        "If you disagree with a refund decision, you may escalate the matter by contacting our support team with additional information. We will conduct a secondary review and provide a final decision within 10 business days.",
    },
    {
      title: "7. Modifications to This Policy",
      content:
        "We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated effective date. Continued use of the platform after changes constitutes acceptance of the revised policy.",
    },
    {
      title: "8. Contact Us",
      content:
        "For refund-related inquiries, please contact our support team at support2@doctorsonlining.com or via WhatsApp at +27 60 544 5802.",
    },
  ],
};

const RefundPolicy = () => {
  const { geo, loading: geoLoading } = useGeoLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (geoLoading) return;

    const fetchDoc = async () => {
      const countryCode = geo?.countryCode ?? null;

      const queries = [
        supabase.from("legal_documents").select("*").eq("document_type", "refund").eq("is_default", true).maybeSingle(),
      ];
      if (countryCode) {
        queries.push(
          supabase.from("legal_documents").select("*").eq("document_type", "refund").eq("country_code", countryCode).maybeSingle()
        );
      }

      const results = await Promise.all(queries);
      const defaultDoc = results[0]?.data;
      const overrideDoc = results[1]?.data;

      if (defaultDoc && (defaultDoc.sections as any[])?.length > 0) {
        const baseSections = (defaultDoc.sections as any[]) || [];
        const overrideSections = overrideDoc ? (overrideDoc.sections as any[]) || [] : [];
        setDoc({
          heading: overrideDoc?.heading || defaultDoc.heading,
          lastUpdated: overrideDoc?.last_updated || defaultDoc.last_updated,
          sections: [...baseSections, ...overrideSections],
        });
      } else {
        setDoc(fallbackRefundPolicy);
      }
      setLoading(false);
    };

    fetchDoc();
  }, [geo, geoLoading]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Refund Policy | Doctors Onlining"
        description="Read the Doctors Onlining refund policy for cancelled or disrupted non-emergency video consultations."
        path="/refund-policy"
      />
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : doc ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-3xl font-bold text-foreground">{doc.heading}</h1>
                  <PdfDownloadButton contentRef={contentRef} filename="refund-policy" />
                </div>
                <div ref={contentRef} className="prose prose-sm dark:prose-invert">
                  <p className="text-muted-foreground">Last updated: {doc.lastUpdated}</p>
                  {geo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing policy applicable to <span className="font-medium text-foreground">{geo.countryName}</span>
                    </p>
                  )}
                  {doc.sections.map((s) => (
                    <div key={s.title}>
                      <h2 className="font-display text-xl font-semibold text-foreground mt-8">{s.title}</h2>
                      <p className="text-muted-foreground">{s.content}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicy;
