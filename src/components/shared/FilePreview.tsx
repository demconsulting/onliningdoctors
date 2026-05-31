import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/fileUpload";

interface FilePreviewProps {
  file: File | null;
  onClear?: () => void;
  className?: string;
}

/** Lightweight pre-upload preview: image thumbnail or PDF icon, with filename & size. */
const FilePreview = ({ file, onClear, className }: FilePreviewProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!file) return null;

  return (
    <div className={`flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2 ${className || ""}`}>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-background flex items-center justify-center">
        {url ? (
          <img src={url} alt="Preview" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <FileText className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      {onClear && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClear} aria-label="Remove file">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default FilePreview;
