import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);

      // Fetch emails from edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await supabase.functions.invoke("admin-users", {
            method: "GET",
          });
          if (res.data?.users) {
            const map: Record<string, string> = {};
            for (const u of res.data.users) {
              map[u.id] = u.email;
            }
            setEmailMap(map);
          }
        }
      } catch (e) {
        console.error("Failed to fetch user emails:", e);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const getUserRoles = (userId: string) =>
    roles.filter(r => r.user_id === userId).map(r => r.role);

  const handlePasswordReset = async (userId: string) => {
    const email = emailMap[userId];
    if (!email) {
      toast({ variant: "destructive", title: "No email found for this user" });
      return;
    }
    setResettingId(userId);
    try {
      const res = await supabase.functions.invoke("admin-users?action=reset-password", {
        body: { email },
      });
      if (res.error) throw res.error;
      toast({ title: "Password reset sent", description: `Reset email sent to ${email}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send reset", description: e.message || "Unknown error" });
    } finally {
      setResettingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Users className="h-5 w-5 text-primary" /> Users ({profiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">City</th>
                <th className="pb-2 pr-4">Roles</th>
                <th className="pb-2 pr-4">Joined</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => (
                <tr key={p.id} className="text-foreground">
                  <td className="py-2 pr-4 font-medium">{p.full_name || "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{emailMap[p.id] || "—"}</td>
                  <td className="py-2 pr-4">{p.phone || "—"}</td>
                  <td className="py-2 pr-4">{p.city || "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1">
                      {getUserRoles(p.id).map(r => (
                        <Badge key={r} variant="outline" className="text-xs capitalize">{r}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!emailMap[p.id] || resettingId === p.id}
                      onClick={() => handlePasswordReset(p.id)}
                      title="Send password reset email"
                    >
                      {resettingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;
