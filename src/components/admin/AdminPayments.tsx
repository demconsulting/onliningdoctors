import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Receipt, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const statusVariant = (s: string) => {
  if (s === "success") return "default";
  if (s === "failed") return "destructive";
  return "secondary";
};

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setPayments(data);

        // Collect unique doctor/patient IDs
        const doctorIds = [...new Set(data.map((p) => p.doctor_id))];
        const patientIds = [...new Set(data.map((p) => p.patient_id))];
        const allIds = [...new Set([...doctorIds, ...patientIds])];

        if (allIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", allIds);

          if (profiles) {
            const docMap: Record<string, string> = {};
            const patMap: Record<string, string> = {};
            profiles.forEach((p) => {
              if (doctorIds.includes(p.id)) docMap[p.id] = p.full_name || "Unknown";
              if (patientIds.includes(p.id)) patMap[p.id] = p.full_name || "Unknown";
            });
            setDoctors(docMap);
            setPatients(patMap);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const uniqueDoctors = useMemo(() => {
    return Object.entries(doctors).sort((a, b) => a[1].localeCompare(b[1]));
  }, [doctors]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (doctorFilter !== "all" && p.doctor_id !== doctorFilter) return false;
      if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(p.created_at) > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const doctorName = (doctors[p.doctor_id] || "").toLowerCase();
        const patientName = (patients[p.patient_id] || "").toLowerCase();
        const ref = (p.paystack_reference || "").toLowerCase();
        if (!doctorName.includes(q) && !patientName.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [payments, statusFilter, doctorFilter, dateFrom, dateTo, search, doctors, patients]);

  const totalAmount = useMemo(() => {
    return filtered
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Successful Revenue</p>
            <p className="text-2xl font-bold text-foreground">
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Payments</p>
            <p className="text-2xl font-bold text-foreground">
              {filtered.filter((p) => p.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Payment Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {uniqueDoctors.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-40"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-40"
              placeholder="To"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(p.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">{patients[p.patient_id] || "—"}</TableCell>
                      <TableCell className="text-sm">{doctors[p.doctor_id] || "—"}</TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {p.currency} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{p.payment_method || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.status)} className="capitalize text-xs">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">
                        {p.paystack_reference || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
