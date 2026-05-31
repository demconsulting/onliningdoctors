import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, validateFile } from "@/lib/fileUpload";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  fullName: string;
  onUploaded: (url: string) => void;
}

const AvatarUpload = ({ userId, currentUrl, fullName, onUploaded }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = fullName
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
        path: `${userId}/avatar.${file.name.split(".").pop()}`,
        file,
        profile: "avatar",
        onOptimizing: () => toast({ title: "Optimising image before upload..." }),
      });

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("id", userId);

      if (updateError) {
        toast({ variant: "destructive", title: "Failed to save", description: updateError.message });
      } else {
        onUploaded(urlWithCacheBust);
        toast({ title: "Profile picture updated" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-2 border-primary/20">
          <AvatarImage src={currentUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {initials || <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-muted-foreground"
      >
        {uploading ? "Uploading..." : "Change photo"}
      </Button>
      <p className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · Max 2MB</p>
    </div>
  );
};

export default AvatarUpload;
