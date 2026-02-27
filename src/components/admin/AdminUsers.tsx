import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Admins need to see all profiles - using service via RPC or direct query
      // Since we have RLS, admin can only see doctor profiles + own. 
      // For a full admin view, we'd need a DB function. For now show what's accessible.
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      setLoading(false);
    };
    fetch();
  }, []);

  const getUserRoles = (userId: string) =>
    roles.filter(r => r.user_id === userId).map(r => r.role);

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
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">City</th>
                <th className="pb-2 pr-4">Roles</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => (
                <tr key={p.id} className="text-foreground">
                  <td className="py-2 pr-4 font-medium">{p.full_name || "—"}</td>
                  <td className="py-2 pr-4">{p.phone || "—"}</td>
                  <td className="py-2 pr-4">{p.city || "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1">
                      {getUserRoles(p.id).map(r => (
                        <Badge key={r} variant="outline" className="text-xs capitalize">{r}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
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
