import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, Calendar, Percent } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DoctorEarningsProps {
  user: User;
  doctorCountry?: string | null;
}

const DoctorEarnings = ({ user, doctorCountry }: DoctorEarningsProps) => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [commissionRate, setCommissionRate] = useState(15);

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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCommission = totalRevenue * (commissionRate / 100);
  const netEarnings = totalRevenue - totalCommission;

  // Determine currency: use doctor's country mapping, then payment data, then fallback
  const countryCode = doctorCountry?.length === 2 ? doctorCountry.toUpperCase() : undefined;
  const countryCurrencyCode = countryCode ? COUNTRY_CURRENCY[countryCode]?.currency : undefined;
  const currency = countryCurrencyCode || payments[0]?.currency || "ZAR";

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amount);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
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
                <p className="text-xl font-bold text-foreground">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consultation Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed consultations yet.
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
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
