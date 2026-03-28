import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, Calendar, Percent } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, subMonths, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DoctorEarningsProps {
  user: User;
  doctorCountry?: string | null;
}

const EarningsChart = ({
  payments,
  commissionRate,
  period,
  formatAmount,
}: {
  payments: any[];
  commissionRate: number;
  period: "week" | "month" | "year" | "all";
  formatAmount: (n: number) => string;
}) => {
  const chartData = useMemo(() => {
    if (payments.length === 0) return [];

    const now = new Date();

    if (period === "week") {
      // Daily for current week
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end: now });
      return days.map((day) => {
        const dayPayments = payments.filter((p) => p.paid_at && isSameDay(new Date(p.paid_at), day));
        const revenue = dayPayments.reduce((s, p) => s + Number(p.amount), 0);
        return {
          label: format(day, "EEE"),
          revenue,
          net: revenue * (1 - commissionRate / 100),
        };
      });
    }

    if (period === "month") {
      // Daily for current month
      const start = startOfMonth(now);
      const days = eachDayOfInterval({ start, end: now });
      return days.map((day) => {
        const dayPayments = payments.filter((p) => p.paid_at && isSameDay(new Date(p.paid_at), day));
        const revenue = dayPayments.reduce((s, p) => s + Number(p.amount), 0);
        return {
          label: format(day, "d"),
          revenue,
          net: revenue * (1 - commissionRate / 100),
        };
      });
    }

    if (period === "year") {
      // Monthly for current year
      const start = startOfYear(now);
      const months = eachMonthOfInterval({ start, end: now });
      return months.map((month) => {
        const monthPayments = payments.filter((p) => p.paid_at && isSameMonth(new Date(p.paid_at), month));
        const revenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
        return {
          label: format(month, "MMM"),
          revenue,
          net: revenue * (1 - commissionRate / 100),
        };
      });
    }

    // All time — monthly for last 12 months
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map((month) => {
      const monthPayments = payments.filter((p) => p.paid_at && isSameMonth(new Date(p.paid_at), month));
      const revenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
      return {
        label: format(month, "MMM yy"),
        revenue,
        net: revenue * (1 - commissionRate / 100),
      };
    });
  }, [payments, period, commissionRate]);

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data to display.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={60} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number, name: string) => [
            formatAmount(value),
            name === "revenue" ? "Revenue" : "Net Earnings",
          ]}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="net" stroke="hsl(142 76% 36%)" fill="url(#netGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const DoctorEarnings = ({ user, doctorCountry }: DoctorEarningsProps) => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [commissionRate, setCommissionRate] = useState(15);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("all");

  useEffect(() => {
    const load = async () => {
      // Fetch completed payments for this doctor
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*, appointments(scheduled_at, reason, patient_id)")
        .eq("doctor_id", user.id)
        .eq("status", "successful")
        .order("paid_at", { ascending: false });

      // Fetch platform commission rate
      const { data: configData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "paystack_config")
        .maybeSingle();

      if (configData?.value) {
        const cfg = configData.value as any;
        if (typeof cfg.platform_commission_percent === "number") {
          setCommissionRate(cfg.platform_commission_percent);
        }
      }

      setPayments(paymentData || []);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const filteredPayments = useMemo(() => {
    if (period === "all") return payments;
    const now = new Date();
    let cutoff: Date;
    if (period === "week") cutoff = startOfWeek(now, { weekStartsOn: 1 });
    else if (period === "month") cutoff = startOfMonth(now);
    else cutoff = startOfYear(now);
    return payments.filter((p) => p.paid_at && new Date(p.paid_at) >= cutoff);
  }, [payments, period]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCommission = totalRevenue * (commissionRate / 100);
  const netEarnings = totalRevenue - totalCommission;

  const periodLabel = period === "week" ? "This Week" : period === "month" ? "This Month" : period === "year" ? "This Year" : "All Time";

  // Determine currency: use doctor's country mapping, then payment data, then fallback
  const countryCode = doctorCountry?.length === 2 ? doctorCountry.toUpperCase() : undefined;
  const countryCurrencyCode = countryCode ? COUNTRY_CURRENCY[countryCode]?.currency : undefined;
  const currency = countryCurrencyCode || payments[0]?.currency || "ZAR";

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amount);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue ({periodLabel})</p>
                <p className="text-xl font-bold text-foreground">{formatAmount(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <Percent className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fee ({commissionRate}%)</p>
                <p className="text-xl font-bold text-foreground">{formatAmount(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Earnings</p>
                <p className="text-xl font-bold text-foreground">{formatAmount(netEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/50 p-2.5">
                <Calendar className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consultations</p>
                <p className="text-xl font-bold text-foreground">{filteredPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trend — {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <EarningsChart
            payments={filteredPayments}
            commissionRate={commissionRate}
            period={period}
            formatAmount={formatAmount}
          />
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History — {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed consultations yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((p) => {
                const commission = Number(p.amount) * (commissionRate / 100);
                const net = Number(p.amount) - commission;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {p.appointments?.reason || "Consultation"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.paid_at ? format(new Date(p.paid_at), "MMM dd, yyyy • hh:mm a") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatAmount(net)}</p>
                        <p className="text-xs text-muted-foreground">
                          of {formatAmount(Number(p.amount))}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {p.currency}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorEarnings;
