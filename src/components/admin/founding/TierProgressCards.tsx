import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Users } from "lucide-react";

interface Props {
  pioneerFilled: number;
  pioneerLimit: number;
  foundingFilled: number;
  foundingLimit: number;
}

const Tile = ({
  icon,
  title,
  filled,
  limit,
  accent,
}: { icon: React.ReactNode; title: string; filled: number; limit: number; accent: string }) => {
  const pct = limit > 0 ? Math.min(Math.round((filled / limit) * 100), 100) : 0;
  const remaining = Math.max(limit - filled, 0);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={accent}>{icon}</span>
            <p className="text-sm font-semibold truncate">{title}</p>
          </div>
          {remaining === 0 ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Complete</Badge>
          ) : (
            <Badge variant="outline">{remaining} left</Badge>
          )}
        </div>
        <p className="text-3xl font-bold">
          {filled}
          <span className="text-base font-normal text-muted-foreground"> / {limit}</span>
        </p>
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground">{pct}% filled</p>
      </CardContent>
    </Card>
  );
};

const TierProgressCards = ({ pioneerFilled, pioneerLimit, foundingFilled, foundingLimit }: Props) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Tile icon={<Sparkles className="h-4 w-4" />} title="Pioneer Founding Doctors" filled={pioneerFilled} limit={pioneerLimit} accent="text-amber-500" />
    <Tile icon={<Crown className="h-4 w-4" />} title="Founding Doctors" filled={foundingFilled} limit={foundingLimit} accent="text-primary" />
    <Tile icon={<Users className="h-4 w-4" />} title="Overall Programme" filled={pioneerFilled + foundingFilled} limit={pioneerLimit + foundingLimit} accent="text-cyan-600" />
  </div>
);

export default TierProgressCards;
