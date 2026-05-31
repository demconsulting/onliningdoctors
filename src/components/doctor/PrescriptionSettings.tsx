import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileSignature, Loader2, Save, Upload, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props { user: User }

const PrescriptionSettings = ({ user }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    practice_name: "",
    practice_address: "",
    practice_phone: "",
    practice_email: "",
    practice_website: "",
    education: "",
    license_number: "",
    practice_logo_url: "",
    practice_signature_url: "",
  });
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [logoSigned, setLogoSigned] = useState("");
  const [sigSigned, setSigSigned] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  const refreshSigned = async (logoPath: string, sigPath: string) => {
    if (logoPath) {
      const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(logoPath, 3600);
      setLogoSigned(url?.signedUrl || "");
    } else setLogoSigned("");
    if (sigPath) {
      const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(sigPath, 3600);
      setSigSigned(url?.signedUrl || "");
    } else setSigSigned("");
  };

  useEffect(() => {
    const load = async () => {
      const [doc, prof] = await Promise.all([
        supabase.from("doctors").select("practice_name, practice_address, practice_phone, practice_email, practice_website, education, license_number, practice_logo_url, practice_signature_url, title").eq("profile_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      const d: any = doc.data || {};
      setData({
        practice_name: d.practice_name || "",
        practice_address: d.practice_address || "",
        practice_phone: d.practice_phone || "",
        practice_email: d.practice_email || "",
        practice_website: d.practice_website || "",
        education: d.education || "",
        license_number: d.license_number || "",
        practice_logo_url: d.practice_logo_url || "",
        practice_signature_url: d.practice_signature_url || "",
      });
      setTitle(d.title || "Dr.");
      setFullName(prof.data?.full_name || "");
      await refreshSigned(d.practice_logo_url || "", d.practice_signature_url || "");
      setLoading(false);
    };
    load();
  }, [user.id]);

  const upload = async (file: File, kind: "logo" | "signature") => {
    const profileKey = kind === "logo" ? "practice_logo" : "practice_signature";
    const { validateFile, uploadFile } = await import("@/lib/fileUpload");
    const v = validateFile(file, profileKey);
    if (!v.ok) {
      toast({ variant: "destructive", title: "Invalid file", description: v.message });
      return;
    }
    const setter = kind === "logo" ? setUploadingLogo : setUploadingSig;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const initialPath = `${user.id}/${kind}_${Date.now()}.${ext}`;
      const { path } = await uploadFile({
        bucket: "prescription-assets",
        path: initialPath,
        file,
        profile: profileKey,
        onOptimizing: () => toast({ title: "Optimising image before upload..." }),
      });
      const field = kind === "logo" ? "practice_logo_url" : "practice_signature_url";
      await supabase.from("doctors").update({ [field]: path } as any).eq("profile_id", user.id);
      const next = { ...data, [field]: path };
      setData(next);
      await refreshSigned(next.practice_logo_url, next.practice_signature_url);
      toast({ title: `${kind === "logo" ? "Logo" : "Signature"} uploaded` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
    setter(false);
  };


  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("doctors").update(data as any).eq("profile_id", user.id);
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else toast({ title: "Prescription settings saved" });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <FileSignature className="h-5 w-5 text-primary" /> Prescription Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These details appear on every prescription, medical certificate and referral letter you issue.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Practice Logo</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {logoSigned ? <img src={logoSigned} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">No logo</span>}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], "logo")} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploadingLogo} onClick={() => logoRef.current?.click()}>
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {data.practice_logo_url ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Electronic Signature</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {sigSigned ? <img src={sigSigned} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">No signature</span>}
              </div>
              <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], "signature")} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploadingSig} onClick={() => sigRef.current?.click()}>
                {uploadingSig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {data.practice_signature_url ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Practice Name</Label>
            <Input value={data.practice_name} onChange={e => setData({ ...data, practice_name: e.target.value })} placeholder="e.g. Sandton Wellness Clinic" />
          </div>
          <div className="space-y-2">
            <Label>Qualifications</Label>
            <Input value={data.education} onChange={e => setData({ ...data, education: e.target.value })} placeholder="e.g. MBChB, FCP(SA)" />
          </div>
          <div className="space-y-2">
            <Label>HPCSA Registration Number</Label>
            <Input value={data.license_number} onChange={e => setData({ ...data, license_number: e.target.value })} placeholder="e.g. MP-0612345" />
          </div>
          <div className="space-y-2">
            <Label>Practice Telephone</Label>
            <Input value={data.practice_phone} onChange={e => setData({ ...data, practice_phone: e.target.value })} placeholder="e.g. +27 11 234 5678" />
          </div>
          <div className="space-y-2">
            <Label>Practice Email</Label>
            <Input type="email" value={data.practice_email} onChange={e => setData({ ...data, practice_email: e.target.value })} placeholder="hello@practice.co.za" />
          </div>
          <div className="space-y-2">
            <Label>Practice Website <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={data.practice_website} onChange={e => setData({ ...data, practice_website: e.target.value })} placeholder="https://practice.co.za" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Practice Address</Label>
          <Textarea rows={2} value={data.practice_address} onChange={e => setData({ ...data, practice_address: e.target.value })} placeholder="Street, suburb, city, postal code" />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Prescription Settings
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Preview Letterhead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Letterhead Preview</DialogTitle></DialogHeader>
              <div className="bg-white text-black p-6 rounded border" style={{ fontFamily: "Georgia, serif" }}>
                <div className="flex items-start justify-between border-b-2 border-primary pb-4">
                  <div className="flex items-start gap-4">
                    {logoSigned && <img src={logoSigned} alt="Logo" className="h-16 w-auto object-contain" />}
                    <div>
                      {data.practice_name && <h2 className="text-lg font-bold">{data.practice_name}</h2>}
                      <p className="text-base font-semibold">{title} {fullName}</p>
                      {data.education && <p className="text-xs text-gray-600">{data.education}</p>}
                      {data.license_number && <p className="text-xs text-gray-500">HPCSA: {data.license_number}</p>}
                      {data.practice_address && <p className="text-xs text-gray-500 whitespace-pre-line">{data.practice_address}</p>}
                      {data.practice_phone && <p className="text-xs text-gray-500">Tel: {data.practice_phone}</p>}
                      {data.practice_email && <p className="text-xs text-gray-500">Email: {data.practice_email}</p>}
                      {data.practice_website && <p className="text-xs text-gray-500">Web: {data.practice_website}</p>}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary/80" style={{ fontFamily: "monospace" }}>℞</div>
                </div>
                <p className="text-xs text-muted-foreground mt-6">— Patient & medication content appears here —</p>
                <div className="border-t border-gray-200 mt-10 pt-4">
                  {sigSigned && <img src={sigSigned} alt="Signature" className="h-12 w-auto object-contain mb-1" />}
                  <p className="text-sm font-semibold">{title} {fullName}</p>
                  <p className="text-xs text-gray-500">Authorized Prescriber · HPCSA {data.license_number || "—"}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrescriptionSettings;
