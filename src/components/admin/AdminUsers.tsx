import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, KeyRound, Trash2, ShieldBan, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [doctors, setDoctors] = useState<any[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; name: string; isDoctor: boolean } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, doctorsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("doctors").select("id, profile_id, is_suspended, suspension_reason"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);
    if (doctorsRes.data) setDoctors(doctorsRes.data);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await supabase.functions.invoke("admin-users", { method: "GET" });
        if (res.data?.users) {
          const map: Record<string, string> = {};
          for (const u of res.data.users) map[u.id] = u.email;
          setEmailMap(map);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user emails:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role as AppRole);

  const getDoctorRecord = (userId: string) =>
    doctors.find((d) => d.profile_id === userId);

  const isUserSuspended = (profile: any) => {
    const userRoles = getUserRoles(profile.id);
    if (userRoles.includes("doctor")) {
      const doc = getDoctorRecord(profile.id);
      return doc?.is_suspended || false;
    }
    return profile.is_suspended || false;
  };

  const getSuspensionReason = (profile: any) => {
    const userRoles = getUserRoles(profile.id);
    if (userRoles.includes("doctor")) {
      const doc = getDoctorRecord(profile.id);
      return doc?.suspension_reason || profile.suspension_reason || null;
    }
    return profile.suspension_reason || null;
  };

  const handlePasswordReset = async (userId: string) => {
    const email = emailMap[userId];
    if (!email) { toast({ variant: "destructive", title: "No email found for this user" }); return; }
    setResettingId(userId);
    try {
      const res = await supabase.functions.invoke("admin-users?action=reset-password", { body: { email } });
      if (res.error) throw res.error;
      toast({ title: "Password reset sent", description: `Reset email sent to ${email}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send reset", description: e.message || "Unknown error" });
    } finally { setResettingId(null); }
  };

  const handleChangeRole = async (userId: string, currentRole: AppRole, newRole: AppRole) => {
    if (currentRole === newRole) return;
    setUpdatingRole(userId);
    try {
      const roleRecord = roles.find((r) => r.user_id === userId && r.role === currentRole);
      if (!roleRecord) throw new Error("Role record not found");
      const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("id", roleRecord.id);
      if (error) throw error;
      toast({ title: "Role updated", description: `Changed from ${currentRole} to ${newRole}` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to update role", description: e.message || "Unknown error" });
    } finally { setUpdatingRole(null); }
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
      const { error } = await supabase.from("user_roles").delete().eq("id", roleRecord.id);
      if (error) throw error;
      toast({ title: "Role removed", description: `Removed ${role} role` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to remove role", description: e.message || "Unknown error" });
    } finally { setUpdatingRole(null); }
  };

  const handleAddRole = async (userId: string, role: AppRole) => {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      toast({ title: "Role added", description: `Added ${role} role` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to add role", description: e.message || "Unknown error" });
    } finally { setUpdatingRole(null); }
  };

  const handleSuspend = async () => {
    if (!suspendDialog || !suspendReason.trim()) {
      toast({ variant: "destructive", title: "Please provide a reason for suspension" });
      return;
    }
    const { userId, isDoctor } = suspendDialog;
    setSuspending(userId);

    try {
      // Suspend on profiles table (works for all users)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_suspended: true, suspension_reason: suspendReason.trim() })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Also suspend on doctors table if doctor
      if (isDoctor) {
        const doc = getDoctorRecord(userId);
        if (doc) {
          const { error: docError } = await supabase
            .from("doctors")
            .update({ is_suspended: true, is_available: false, suspension_reason: suspendReason.trim() })
            .eq("id", doc.id);
          if (docError) throw docError;
        }
      }

      // Notify user
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Account Suspended",
        message: `Your account has been suspended. Reason: ${suspendReason.trim()}`,
        type: "moderation",
        link: isDoctor ? "/doctor" : "/dashboard",
      });

      toast({ title: "User suspended", description: `${suspendDialog.name} has been suspended.` });
      setSuspendDialog(null);
      setSuspendReason("");
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Suspension failed", description: e.message || "Unknown error" });
    } finally { setSuspending(null); }
  };

  const handleUnsuspend = async (userId: string) => {
    setSuspending(userId);
    const userRoles = getUserRoles(userId);
    const isDoctor = userRoles.includes("doctor");

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspension_reason: null })
        .eq("id", userId);
      if (profileError) throw profileError;

      if (isDoctor) {
        const doc = getDoctorRecord(userId);
        if (doc) {
          const { error: docError } = await supabase
            .from("doctors")
            .update({ is_suspended: false, is_available: true, suspension_reason: null })
            .eq("id", doc.id);
          if (docError) throw docError;
        }
      }

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Account Reinstated",
        message: "Your account has been reinstated. You can now use the platform again.",
        type: "moderation",
        link: isDoctor ? "/doctor" : "/dashboard",
      });

      const profile = profiles.find(p => p.id === userId);
      toast({ title: "User reinstated", description: `${profile?.full_name || "User"} has been reinstated.` });
      await fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to unsuspend", description: e.message || "Unknown error" });
    } finally { setSuspending(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
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
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Roles</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((p) => {
                  const userRoles = getUserRoles(p.id);
                  const availableRoles = ROLES.filter((r) => !userRoles.includes(r));
                  const suspended = isUserSuspended(p);
                  const reason = getSuspensionReason(p);
                  const isDoctor = userRoles.includes("doctor");

                  return (
                    <tr key={p.id} className={`text-foreground ${suspended ? "opacity-60" : ""}`}>
                      <td className="py-2 pr-4 font-medium">{p.full_name || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{emailMap[p.id] || "—"}</td>
                      <td className="py-2 pr-4">{p.phone || "—"}</td>
                      <td className="py-2 pr-4">
                        {suspended ? (
                          <Badge variant="destructive" className="text-xs gap-1" title={reason || undefined}>
                            <ShieldBan className="h-3 w-3" /> Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-600/30">
                            <ShieldCheck className="h-3 w-3" /> Active
                          </Badge>
                        )}
                      </td>
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
                                    <SelectItem key={role} value={role} className="text-xs capitalize">{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {userRoles.length > 1 && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={updatingRole === p.id}>
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
                                      <AlertDialogAction onClick={() => handleDeleteRole(p.id, r)}>Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          ))}
                          {availableRoles.length > 0 && (
                            <Select value="" onValueChange={(role) => handleAddRole(p.id, role as AppRole)} disabled={updatingRole === p.id}>
                              <SelectTrigger className="h-7 w-28 text-xs text-muted-foreground border-dashed">
                                <span>+ Add role</span>
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((role) => (
                                  <SelectItem key={role} value={role} className="text-xs capitalize">{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!emailMap[p.id] || resettingId === p.id}
                            onClick={() => handlePasswordReset(p.id)}
                            title="Send password reset email"
                          >
                            {resettingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          </Button>
                          {suspended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnsuspend(p.id)}
                              disabled={suspending === p.id}
                              title="Reinstate user"
                              className="text-green-600 hover:text-green-700"
                            >
                              {suspending === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSuspendDialog({ userId: p.id, name: p.full_name || "User", isDoctor });
                                setSuspendReason("");
                              }}
                              disabled={suspending === p.id}
                              title="Suspend user"
                              className="text-destructive hover:text-destructive"
                            >
                              <ShieldBan className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspendDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This user will be notified of the suspension with the reason you provide.
              {suspendDialog?.isDoctor && " The doctor will also be hidden from patients."}
            </p>
            <div>
              <Label>Reason for Suspension</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Explain why this user is being suspended..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || suspending === suspendDialog?.userId}
              >
                {suspending === suspendDialog?.userId ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldBan className="mr-1 h-4 w-4" />}
                Suspend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsers;
