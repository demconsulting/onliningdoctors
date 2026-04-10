import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, KeyRound, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ROLES = ["admin", "patient", "doctor"] as const;
type AppRole = (typeof ROLES)[number];

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);

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

  useEffect(() => {
    fetchData();
  }, []);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role as AppRole);

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

  const handleChangeRole = async (userId: string, currentRole: AppRole, newRole: AppRole) => {
    if (currentRole === newRole) return;
    setUpdatingRole(userId);
    try {
      // Find the existing role record
      const roleRecord = roles.find((r) => r.user_id === userId && r.role === currentRole);
      if (!roleRecord) throw new Error("Role record not found");

      // Update the role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleRecord.id);

      if (error) throw error;

      toast({ title: "Role updated", description: `Changed from ${currentRole} to ${newRole}` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to update role", description: e.message || "Unknown error" });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteRole = async (userId: string, role: AppRole) => {
    const userRoles = getUserRoles(userId);
    if (userRoles.length <= 1) {
      toast({ variant: "destructive", title: "Cannot remove last role", description: "A user must have at least one role." });
      return;
    }
    setUpdatingRole(userId);
    try {
      const roleRecord = roles.find((r) => r.user_id === userId && r.role === role);
      if (!roleRecord) throw new Error("Role record not found");

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleRecord.id);

      if (error) throw error;

      toast({ title: "Role removed", description: `Removed ${role} role` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to remove role", description: e.message || "Unknown error" });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleAddRole = async (userId: string, role: AppRole) => {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({ title: "Role added", description: `Added ${role} role` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to add role", description: e.message || "Unknown error" });
    } finally {
      setUpdatingRole(null);
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
              {profiles.map((p) => {
                const userRoles = getUserRoles(p.id);
                const availableRoles = ROLES.filter((r) => !userRoles.includes(r));

                return (
                  <tr key={p.id} className="text-foreground">
                    <td className="py-2 pr-4 font-medium">{p.full_name || "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{emailMap[p.id] || "—"}</td>
                    <td className="py-2 pr-4">{p.phone || "—"}</td>
                    <td className="py-2 pr-4">{p.city || "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-col gap-1.5">
                        {userRoles.map((r) => (
                          <div key={r} className="flex items-center gap-1">
                            <Select
                              value={r}
                              onValueChange={(newRole) => handleChangeRole(p.id, r, newRole as AppRole)}
                              disabled={updatingRole === p.id}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role} className="text-xs capitalize">
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {userRoles.length > 1 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    disabled={updatingRole === p.id}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove role?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove the <strong>{r}</strong> role from {p.full_name || "this user"}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteRole(p.id, r)}>
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))}
                        {availableRoles.length > 0 && (
                          <Select
                            value=""
                            onValueChange={(role) => handleAddRole(p.id, role as AppRole)}
                            disabled={updatingRole === p.id}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs text-muted-foreground border-dashed">
                              <span>+ Add role</span>
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map((role) => (
                                <SelectItem key={role} value={role} className="text-xs capitalize">
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;
