import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contentRef: React.RefObject<HTMLDivElement>;
  filename: string;
}

const PdfDownloadButton = ({ contentRef, filename }: Props) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "pdf_download_enabled")
      .maybeSingle()
      .then(({ data }) => {
        setEnabled((data?.value as any)?.enabled !== false);
      });
  }, []);

  if (enabled === null || !enabled) return null;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${filename}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(contentRef.current)
        .save();
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={generating} className="gap-2">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download PDF
    </Button>
  );
};

export default PdfDownloadButton;
