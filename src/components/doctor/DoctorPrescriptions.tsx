import { lazy, Suspense, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, FileText, CalendarIcon, X, Eye } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const PrescriptionView = lazy(() => import("@/components/doctor/PrescriptionView"));

interface DoctorPrescriptionsProps {
  user: User;
}

interface PrescriptionRow {
  id: string;
  appointment_id: string;
  patient_id: string;
  diagnosis: string | null;
  medications: any[];
  created_at: string;
  updated_at: string;
  follow_up_date: string | null;
  patientName: string;
}

const ITEMS_PER_PAGE = 10;

const DoctorPrescriptions = ({ user }: DoctorPrescriptionsProps) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPrescriptions = async () => {
    setLoading(true);

    let query = supabase
      .from("prescriptions" as any)
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (dateFrom) {
      query = query.gte("created_at", startOfDay(dateFrom).toISOString());
    }
    if (dateTo) {
      query = query.lte("created_at", endOfDay(dateTo).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const rows = (data as any[]) || [];

    // Fetch patient names
    const patientIds = [...new Set(rows.map(r => r.patient_id))];
    let profileMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", patientIds);
      if (profiles) {
        profiles.forEach((p: any) => { profileMap[p.id] = p.full_name || "Unknown"; });
      }
    }

    setPrescriptions(rows.map(r => ({
      ...r,
      patientName: profileMap[r.patient_id] || "Unknown Patient",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPrescriptions(); }, [user.id, dateFrom, dateTo]);

  const filtered = prescriptions.filter(rx => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      rx.patientName.toLowerCase().includes(q) ||
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(q)) ||
      rx.medications.some((m: any) => m.name?.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search.trim() || dateFrom || dateTo;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <FileText className="h-5 w-5 text-primary" /> Prescriptions History
        </CardTitle>
        <p className="text-sm text-muted-foreground">All prescriptions you've created across appointments.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Date Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient, diagnosis, or medication..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", dateFrom && "border-primary text-primary")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", dateTo && "border-primary text-primary")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground">
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} prescription{filtered.length !== 1 ? "s" : ""}{hasFilters ? " (filtered)" : ""}</span>
          {prescriptions.length > 0 && (
            <span>Total: {prescriptions.length}</span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>{hasFilters ? "No prescriptions match your filters" : "No prescriptions created yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map(rx => (
              <div key={rx.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{rx.patientName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {format(new Date(rx.created_at), "dd MMM yyyy")}
                      </Badge>
                    </div>
                    {rx.diagnosis && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        <span className="font-medium">Dx:</span> {rx.diagnosis}
                      </p>
                    )}
                  </div>
                  <Suspense fallback={null}>
                    <PrescriptionView appointmentId={rx.appointment_id} viewAs="doctor" />
                  </Suspense>
                </div>

                {/* Medications summary */}
                <div className="flex flex-wrap gap-1.5">
                  {rx.medications.map((m: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal gap-1">
                      {m.name}
                      {m.dosage && <span className="text-muted-foreground">({m.dosage})</span>}
                    </Badge>
                  ))}
                </div>

                {/* Footer info */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{rx.medications.length} medication{rx.medications.length !== 1 ? "s" : ""}</span>
                  {rx.follow_up_date && (
                    <span>Follow-up: {format(new Date(rx.follow_up_date), "dd MMM yyyy")}</span>
                  )}
                  {rx.updated_at !== rx.created_at && (
                    <span>Updated: {format(new Date(rx.updated_at), "dd MMM yyyy")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="text-xs"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                .reduce<number[]>((acc, p) => {
                  if (acc.length > 0 && p - acc[acc.length - 1] > 1) acc.push(-1);
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === -1 ? (
                    <span key={`ellipsis-${i}`} className="flex items-center px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === safeCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className="text-xs min-w-[32px]"
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorPrescriptions;
