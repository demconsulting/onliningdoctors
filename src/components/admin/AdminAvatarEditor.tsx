import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, validateFile } from "@/lib/fileUpload";

interface AdminAvatarEditorProps {
  /** profile id of the user whose picture is being changed */
  profileId: string;
  currentUrl: string | null;
  fullName: string | null;
  onUploaded?: (url: string) => void;
  size?: "sm" | "md";
}

const AdminAvatarEditor = ({ profileId, currentUrl, fullName, onUploaded, size = "sm" }: AdminAvatarEditorProps) => {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials =
    fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const v = validateFile(file, "avatar");
    if (!v.ok) {
      toast({ variant: "destructive", title: "Invalid file", description: v.message });
      return;
    }

    setUploading(true);
    try {
      const { path } = await uploadFile({
        bucket: "avatars",
        path: `${profileId}/avatar.${file.name.split(".").pop()}`,
        file,
        profile: "avatar",
      });

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("id", profileId);

      if (error) throw error;

      setUrl(urlWithCacheBust);
      onUploaded?.(urlWithCacheBust);
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const dim = size === "md" ? "h-12 w-12" : "h-9 w-9";

  return (
    <div className="relative group shrink-0">
      <Avatar className={`${dim} border border-border`}>
        <AvatarImage src={url || undefined} alt={fullName || "Profile picture"} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        aria-label="Change profile picture"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-background" />
        ) : (
          <Camera className="h-4 w-4 text-background" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
};

export default AdminAvatarEditor;
