import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Heart } from "lucide-react";

interface Props { doctorProfileId: string; }

export default function DoctorHealthScoreCard({ doctorProfileId }: Props) {
  const [data, setData] = useState<{ score: number; recommendations: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_doctor_health_score" as any, { _doctor_profile_id: doctorProfileId });
      setData(data as any);
      setLoading(false);
    })();
  }, [doctorProfileId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (!data) return null;

  const tone = data.score >= 80 ? "text-emerald-600" : data.score >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Doctor Health Score</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${tone}`}>{data.score}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <Progress value={data.score} />
        {data.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
