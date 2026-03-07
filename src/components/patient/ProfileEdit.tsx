import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import LocationSelect from "@/components/shared/LocationSelect";
import AvatarUpload from "@/components/shared/AvatarUpload";

interface ProfileEditProps {
  user: User;
}

const ProfileEdit = ({ user }: ProfileEditProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    country: "",
  });

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url || null);
          setProfile({
            full_name: data.full_name || "",
            phone: data.phone || "",
            date_of_birth: data.date_of_birth || "",
            gender: data.gender || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
          });
        }
        setLoading(false);
      });
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...profile,
      date_of_birth: profile.date_of_birth || null,
    };
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error saving profile", description: error.message });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <LocationSelect
            country={profile.country}
            state={profile.state}
            city={profile.city}
            onCountryChange={(v) => setProfile((prev) => ({ ...prev, country: v, state: "", city: "" }))}
            onStateChange={(v) => setProfile((prev) => ({ ...prev, state: v, city: "" }))}
            onCityChange={(v) => setProfile((prev) => ({ ...prev, city: v }))}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileEdit;
