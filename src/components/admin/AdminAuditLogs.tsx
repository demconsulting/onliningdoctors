import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Search, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  details: any;
  created_at: string;
}

const SENSITIVE_TABLES = [
  "profiles",
  "patient_medical_info",
  "patient_documents",
  "appointments",
  "user_roles",
  "document_sharing",
];

const ACTION_COLORS: Record<string, string> = {
  insert: "bg-green-500/10 text-green-700 border-green-500/20",
  update: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  delete: "bg-red-500/10 text-red-700 border-red-500/20",
  read: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (tableFilter !== "all") {
      query = query.eq("table_name", tableFilter);
    }
    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data, error } = await query;
    if (!error && data) {
      setLogs(data);
      // Fetch user names for all unique user_ids
      const userIds = [...new Set(data.map((l) => l.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach((p) => {
            names[p.id] = p.full_name || "Unknown";
          });
          setUserNames(names);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actionFilter, dateFrom, dateTo]);

  const filteredLogs = userSearch
    ? logs.filter((log) => {
        const name = userNames[log.user_id]?.toLowerCase() || "";
        const uid = log.user_id.toLowerCase();
        const search = userSearch.toLowerCase();
        return name.includes(search) || uid.includes(search);
      })
    : logs;

  const clearFilters = () => {
    setUserSearch("");
    setTableFilter("all");
    setActionFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Track all sensitive data changes across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-lg border border-border bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {SENSITIVE_TABLES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="insert">Insert</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PP") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "PP") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {(userSearch || tableFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo) && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredLogs.length} result{filteredLogs.length !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No audit logs found matching your filters.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <div className="truncate text-sm font-medium">
                      {userNames[log.user_id] || "Unknown"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground font-mono">
                      {log.user_id.slice(0, 8)}…
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize text-xs",
                        ACTION_COLORS[log.action] || ""
                      )}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.table_name}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.record_id ? `${log.record_id.slice(0, 8)}…` : "—"}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Audit Log Details — {log.action} on {log.table_name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium text-muted-foreground">User:</span>{" "}
                              {userNames[log.user_id] || "Unknown"}
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">User ID:</span>{" "}
                              <code className="text-xs">{log.user_id}</code>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Time:</span>{" "}
                              {format(new Date(log.created_at), "PPpp")}
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Record:</span>{" "}
                              <code className="text-xs">{log.record_id || "—"}</code>
                            </div>
                          </div>
                          <ScrollArea className="h-[400px] rounded-md border border-border p-4">
                            <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
