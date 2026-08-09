import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Settings2 } from "lucide-react";
import { RECRUITMENT_SOURCES } from "./constants";

interface Props {
  title: string;
  description: string;
  doctors: any[];
  profiles: Record<string, any>;
  foundingPlans: any[];
  showPlan?: boolean;
  onChangePlan?: (profileId: string, planId: string) => void;
  onChangeSource: (profileId: string, source: string) => void;
  onDeactivate?: (profileId: string) => void;
  onOpenServices: (profileId: string) => void;
}

const DoctorTierTable = ({
  title, description, doctors, profiles, foundingPlans, showPlan = true,
  onChangePlan, onChangeSource, onDeactivate, onOpenServices,
}: Props) => (
  <Card>
    <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent>
      {doctors.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No doctors in this tier yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Recruitment source</TableHead>
                {showPlan && <TableHead>Founding plan</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((d) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline">{d.founding_sequence ?? "—"}</Badge></TableCell>
                  <TableCell className="font-medium">{profiles[d.profile_id]?.full_name || d.profile_id}</TableCell>
                  <TableCell>{d.founding_doctor_since ? format(new Date(d.founding_doctor_since), "PP") : "—"}</TableCell>
                  <TableCell>
                    <Select value={d.recruitment_source || ""} onValueChange={(v) => onChangeSource(d.profile_id, v)}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        {RECRUITMENT_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {showPlan && (
                    <TableCell>
                      <Select value={d.founding_pricing_plan_id || ""} onValueChange={(v) => onChangePlan?.(d.profile_id, v)}>
                        <SelectTrigger className="w-52"><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          {foundingPlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.platform_fee_percent}%)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onOpenServices(d.profile_id)}>
                        <Settings2 className="h-4 w-4 mr-1" /> Services
                      </Button>
                      {onDeactivate && (
                        <Button size="sm" variant="outline" onClick={() => onDeactivate(d.profile_id)}>Deactivate</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default DoctorTierTable;
