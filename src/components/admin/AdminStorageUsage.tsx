import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, HardDrive, Database, FileStack, RefreshCw, TrendingUp } from "lucide-react";
import { formatBytes } from "@/lib/fileUpload";
import { useToast } from "@/hooks/use-toast";

interface BucketStat {
  bucket: string;
  fileCount: number;
  totalBytes: number;
}
interface LargestFile {
  bucket: string;
  path: string;
  size: number;
  createdAt: string | null;
}
interface UploadActivityPoint {
  date: string;
  count: number;
  bytes: number;
}
interface StatsResponse {
  totals: { fileCount: number; totalBytes: number };
  buckets: BucketStat[];
  largest: LargestFile[];
  activity: UploadActivityPoint[];
}

const AdminStorageUsage = () => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("admin-storage-stats", { body: {} });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to load storage stats", description: error.message });
      return;
    }
    setData(res as StatsResponse);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  const maxActivity = Math.max(1, ...data.activity.map(a => a.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Supabase Storage usage across all buckets.</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4 text-primary" /> Total Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">{formatBytes(data.totals.totalBytes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileStack className="h-4 w-4 text-primary" /> Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">{data.totals.fileCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Database className="h-4 w-4 text-primary" /> Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">{data.buckets.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Storage by Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.buckets.map((b) => {
              const pct = data.totals.totalBytes > 0 ? Math.round((b.totalBytes / data.totals.totalBytes) * 100) : 0;
              return (
                <div key={b.bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.bucket}</span>
                    <span className="text-muted-foreground">
                      {formatBytes(b.totalBytes)} · {b.fileCount.toLocaleString()} files
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.buckets.length === 0 && <p className="text-sm text-muted-foreground">No bucket data.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Upload Activity (last 7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent uploads.</p>
          ) : (
            <div className="flex h-32 items-end gap-2">
              {data.activity.map((a) => (
                <div key={a.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all"
                    style={{ height: `${(a.count / maxActivity) * 100}%`, minHeight: a.count > 0 ? "4px" : "0" }}
                    title={`${a.count} files · ${formatBytes(a.bytes)}`}
                  />
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Largest Files (top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.largest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Bucket</th>
                    <th className="pb-2 pr-4">Path</th>
                    <th className="pb-2 pr-4">Size</th>
                    <th className="pb-2">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.largest.map((f, i) => (
                    <tr key={`${f.bucket}-${f.path}-${i}`}>
                      <td className="py-2 pr-4"><Badge variant="outline">{f.bucket}</Badge></td>
                      <td className="py-2 pr-4 font-mono text-xs truncate max-w-[300px]">{f.path}</td>
                      <td className="py-2 pr-4 font-medium">{formatBytes(f.size)}</td>
                      <td className="py-2 text-xs text-muted-foreground">{f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStorageUsage;
