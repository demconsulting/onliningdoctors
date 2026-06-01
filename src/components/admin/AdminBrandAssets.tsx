import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, RefreshCw, CheckCircle2, XCircle, Loader2, FileJson, Download } from "lucide-react";

interface AssetDef {
  name: string;
  path: string;
  expectedSize?: string;
  isImage: boolean;
  isManifest?: boolean;
}

const ASSETS: AssetDef[] = [
  { name: "favicon.ico", path: "/favicon.ico", expectedSize: "multi (16/32/48)", isImage: true },
  { name: "favicon-16x16.png", path: "/favicon-16x16.png", expectedSize: "16×16", isImage: true },
  { name: "favicon-32x32.png", path: "/favicon-32x32.png", expectedSize: "32×32", isImage: true },
  { name: "apple-touch-icon.png", path: "/apple-touch-icon.png", expectedSize: "180×180", isImage: true },
  { name: "android-chrome-192x192.png", path: "/android-chrome-192x192.png", expectedSize: "192×192", isImage: true },
  { name: "android-chrome-512x512.png", path: "/android-chrome-512x512.png", expectedSize: "512×512", isImage: true },
  { name: "site.webmanifest", path: "/site.webmanifest", expectedSize: "JSON", isImage: false, isManifest: true },
];

type Status = "idle" | "checking" | "ok" | "error";

interface CheckResult {
  status: Status;
  httpStatus?: number;
  lastModified?: string | null;
  contentType?: string | null;
  manifestValid?: boolean;
  manifestError?: string;
  error?: string;
}

const AssetCard = ({ asset }: { asset: AssetDef }) => {
  const [result, setResult] = useState<CheckResult>({ status: "idle" });

  const check = useCallback(async () => {
    setResult({ status: "checking" });
    try {
      const res = await fetch(asset.path, { cache: "no-store" });
      const lastModified = res.headers.get("last-modified");
      const contentType = res.headers.get("content-type");
      let manifestValid: boolean | undefined;
      let manifestError: string | undefined;
      if (asset.isManifest && res.ok) {
        try {
          const json = await res.clone().json();
          manifestValid = typeof json === "object" && !!json && Array.isArray(json.icons);
          if (!manifestValid) manifestError = "Missing icons array";
        } catch (e) {
          manifestValid = false;
          manifestError = (e as Error).message;
        }
      }
      setResult({
        status: res.ok ? "ok" : "error",
        httpStatus: res.status,
        lastModified,
        contentType,
        manifestValid,
        manifestError,
      });
    } catch (e) {
      setResult({ status: "error", error: (e as Error).message });
    }
  }, [asset]);

  useEffect(() => { check(); }, [check]);

  const url = `${window.location.origin}${asset.path}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: url });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-display">{asset.name}</CardTitle>
          {result.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {result.status === "ok" && <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{result.httpStatus}</Badge>}
          {result.status === "error" && <Badge variant="destructive" className="gap-1"><XCircle className="h-3.5 w-3.5" />{result.httpStatus ?? "ERR"}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center h-24 rounded-md border bg-muted/30 overflow-hidden">
          {asset.isImage ? (
            <img src={asset.path} alt={asset.name} className="max-h-20 max-w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
          ) : (
            <FileJson className="h-10 w-10 text-primary" />
          )}
        </div>
        <dl className="text-xs space-y-1 text-muted-foreground">
          <div className="flex justify-between gap-2"><dt>Path</dt><dd className="font-mono text-foreground truncate">{asset.path}</dd></div>
          {asset.expectedSize && <div className="flex justify-between gap-2"><dt>Expected</dt><dd className="text-foreground">{asset.expectedSize}</dd></div>}
          {result.contentType && <div className="flex justify-between gap-2"><dt>Type</dt><dd className="text-foreground truncate">{result.contentType}</dd></div>}
          {result.lastModified && <div className="flex justify-between gap-2"><dt>Last updated</dt><dd className="text-foreground truncate">{result.lastModified}</dd></div>}
          {asset.isManifest && result.status === "ok" && (
            <div className="flex justify-between gap-2"><dt>Manifest JSON</dt><dd className={result.manifestValid ? "text-green-600" : "text-destructive"}>{result.manifestValid ? "Valid" : `Invalid${result.manifestError ? `: ${result.manifestError}` : ""}`}</dd></div>
          )}
          {result.error && <div className="text-destructive">{result.error}</div>}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" />Copy URL</Button>
          <Button size="sm" variant="outline" asChild><a href={asset.path} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</a></Button>
          <Button size="sm" variant="ghost" onClick={check}><RefreshCw className="h-3.5 w-3.5 mr-1" />Re-check</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminBrandAssets = () => {
  const [robotsOk, setRobotsOk] = useState<boolean | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    fetch("/robots.txt", { cache: "no-store" })
      .then((r) => r.text())
      .then((txt) => {
        // Quick check: ensure no Disallow lines block icon paths
        const blocked = /Disallow:\s*\/(favicon|apple-touch-icon|android-chrome|site\.webmanifest)/i.test(txt);
        setRobotsOk(!blocked);
      })
      .catch(() => setRobotsOk(null));
  }, [nonce]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Favicon & App Icons</h2>
        <p className="text-sm text-muted-foreground mt-1">Verify that the existing favicon, app icon, and PWA manifest files are accessible at the site root.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Global checks</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="flex items-center gap-2">
              {robotsOk === null && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {robotsOk === true && <><CheckCircle2 className="h-4 w-4 text-green-600" /><span>robots.txt does not block icon paths</span></>}
              {robotsOk === false && <><XCircle className="h-4 w-4 text-destructive" /><span>robots.txt appears to block one or more icon paths</span></>}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Re-check robots</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ASSETS.map((a) => <AssetCard key={a.path} asset={a} />)}
      </div>
    </div>
  );
};

export default AdminBrandAssets;
