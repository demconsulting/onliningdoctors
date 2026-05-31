import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Check, X, FileText } from "lucide-react";

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  filePath: string | null;
  title?: string;
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
}

const DocumentViewerModal = ({
  open,
  onOpenChange,
  bucket,
  filePath,
  title = "Document Viewer",
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Reject",
}: DocumentViewerModalProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !filePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.storage.from(bucket).createSignedUrl(filePath, 600).then(({ data }) => {
      if (cancelled) return;
      setSignedUrl(data?.signedUrl ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, filePath, bucket]);

  const ext = (filePath?.split(".").pop() || "").toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  const isPdf = ext === "pdf";

  const handleDownload = async () => {
    if (!signedUrl) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = filePath?.split("/").pop() || "document";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-[60vh] overflow-auto rounded border border-border bg-muted/20">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !signedUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Could not load document.
            </div>
          ) : isImage ? (
            <div className="flex h-full items-center justify-center p-3">
              <img src={signedUrl} alt={title} className="max-h-[70vh] max-w-full object-contain" loading="lazy" />
            </div>
          ) : isPdf ? (
            <iframe src={signedUrl} title={title} className="h-[70vh] w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-10 w-10" />
              Preview not available for this file type.
              <Button variant="outline" size="sm" onClick={handleDownload}>Download</Button>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} disabled={!signedUrl}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <div className="flex gap-2">
            {onReject && (
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onReject}>
                <X className="h-4 w-4" /> {rejectLabel}
              </Button>
            )}
            {onApprove && (
              <Button size="sm" className="gap-2" onClick={onApprove}>
                <Check className="h-4 w-4" /> {approveLabel}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerModal;
