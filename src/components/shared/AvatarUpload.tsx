import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 2MB." });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
      setUploading(false);
      return;
    }

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
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-primary/20">
          <AvatarImage src={currentUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {initials || <User className="h-8 w-8" />}
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
        accept="image/*"
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
    </div>
  );
};

export default AvatarUpload;
