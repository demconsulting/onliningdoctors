import { useRef, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getPrivacy, LegalDocument } from "@/data/legalContent";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PdfDownloadButton from "@/components/shared/PdfDownloadButton";

const Privacy = () => {
  const { geo, loading: geoLoading } = useGeoLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (geoLoading) return;

    const fetchDoc = async () => {
      const countryCode = geo?.countryCode ?? null;

      const queries = [
        supabase.from("legal_documents").select("*").eq("document_type", "privacy").eq("is_default", true).maybeSingle(),
      ];
      if (countryCode) {
        queries.push(
          supabase.from("legal_documents").select("*").eq("document_type", "privacy").eq("country_code", countryCode).maybeSingle()
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
        setDoc(getPrivacy(countryCode));
      }
      setLoading(false);
    };

    fetchDoc();
  }, [geo, geoLoading]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
                  <PdfDownloadButton contentRef={contentRef} filename="privacy-policy" />
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

export default Privacy;
