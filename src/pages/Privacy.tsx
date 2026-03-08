import { useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getPrivacy } from "@/data/legalContent";
import { Loader2 } from "lucide-react";
import PdfDownloadButton from "@/components/shared/PdfDownloadButton";

const Privacy = () => {
  const { geo, loading } = useGeoLocation();
  const doc = getPrivacy(geo?.countryCode ?? null);
  const contentRef = useRef<HTMLDivElement>(null);

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
            ) : (
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
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
