import { supabase } from "@/integrations/supabase/client";

export type UploadProfileKey =
  | "avatar"
  | "doctor_id"
  | "hpcsa"
  | "patient_doc"
  | "prescription"
  | "referral"
  | "medical_report"
  | "practice_logo"
  | "practice_signature";

export interface UploadProfile {
  maxBytes: number;
  /** allowed file extensions, lowercase, no dot */
  extensions: string[];
  /** allowed MIME prefixes / exacts */
  mimes: string[];
  /** image optimisation */
  image?: {
    maxDimension: number;
    quality: number;
    /** convert to webp (false = keep original format, e.g. signature PNG with alpha) */
    convertToWebp: boolean;
  };
}

export const UPLOAD_PROFILES: Record<UploadProfileKey, UploadProfile> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    extensions: ["jpg", "jpeg", "png", "webp"],
    mimes: ["image/jpeg", "image/png", "image/webp"],
    image: { maxDimension: 512, quality: 0.85, convertToWebp: true },
  },
  doctor_id: {
    maxBytes: 5 * 1024 * 1024,
    extensions: ["pdf", "jpg", "jpeg", "png"],
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    image: { maxDimension: 2000, quality: 0.92, convertToWebp: false },
  },
  hpcsa: {
    maxBytes: 5 * 1024 * 1024,
    extensions: ["pdf", "jpg", "jpeg", "png"],
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    image: { maxDimension: 2000, quality: 0.92, convertToWebp: false },
  },
  patient_doc: {
    maxBytes: 10 * 1024 * 1024,
    extensions: ["pdf", "jpg", "jpeg", "png", "webp"],
    mimes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    image: { maxDimension: 1800, quality: 0.85, convertToWebp: true },
  },
  prescription: {
    maxBytes: 5 * 1024 * 1024,
    extensions: ["pdf"],
    mimes: ["application/pdf"],
  },
  referral: {
    maxBytes: 5 * 1024 * 1024,
    extensions: ["pdf"],
    mimes: ["application/pdf"],
  },
  medical_report: {
    maxBytes: 10 * 1024 * 1024,
    extensions: ["pdf", "jpg", "jpeg", "png"],
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    image: { maxDimension: 1800, quality: 0.88, convertToWebp: true },
  },
  practice_logo: {
    maxBytes: 3 * 1024 * 1024,
    extensions: ["jpg", "jpeg", "png", "webp"],
    mimes: ["image/jpeg", "image/png", "image/webp"],
    image: { maxDimension: 800, quality: 0.9, convertToWebp: true },
  },
  practice_signature: {
    maxBytes: 2 * 1024 * 1024,
    extensions: ["png", "webp"],
    mimes: ["image/png", "image/webp"],
    // PNG preserved to keep transparency for signatures
    image: { maxDimension: 600, quality: 0.95, convertToWebp: false },
  },
};

/** Universally blocked extensions (defense-in-depth on top of allowlist). */
export const BLOCKED_EXTENSIONS = [
  "exe","zip","rar","bat","apk","dmg","js","mjs","cjs","html","htm","php","py","sh","com","msi","jar","scr","ps1","vbs",
];

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export const getExt = (name: string) => (name.split(".").pop() || "").toLowerCase();

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function validateFile(file: File, profileKey: UploadProfileKey): ValidationResult {
  const profile = UPLOAD_PROFILES[profileKey];
  const ext = getExt(file.name);

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { ok: false, message: "Unsupported file type." };
  }
  if (!profile.extensions.includes(ext)) {
    return { ok: false, message: `Unsupported file type. Allowed: ${profile.extensions.join(", ").toUpperCase()}` };
  }
  // MIME may be empty on some platforms; only enforce when present
  if (file.type) {
    const mimeOk = profile.mimes.some((m) => file.type === m || file.type.startsWith(m + ";"));
    if (!mimeOk) {
      return { ok: false, message: "Unsupported file type." };
    }
  }
  if (file.size > profile.maxBytes) {
    return { ok: false, message: `File exceeds maximum size limit (${formatBytes(profile.maxBytes)}).` };
  }
  return { ok: true };
}

/** Resize + recompress an image client-side. Returns a new File (or original if no shrink). */
export async function optimizeImage(file: File, profileKey: UploadProfileKey): Promise<File> {
  const profile = UPLOAD_PROFILES[profileKey];
  if (!profile.image) return file;
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await loadBitmap(file);
  if (!bitmap) return file;

  const { maxDimension, quality, convertToWebp } = profile.image;
  const { width, height } = scaleDown(bitmap.width, bitmap.height, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const outType = convertToWebp ? "image/webp" : file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, outType, quality));
  if (!blob) return file;

  // If "optimisation" made it bigger, keep the original
  if (blob.size >= file.size && !convertToWebp) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const ext = outType === "image/webp" ? "webp" : outType === "image/png" ? "png" : "jpg";
  return new File([blob], `${baseName}.${ext}`, { type: outType, lastModified: Date.now() });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    if ("createImageBitmap" in window) {
      return await createImageBitmap(file);
    }
  } catch {
    /* fall through */
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

function scaleDown(w: number, h: number, maxDim: number) {
  const longest = Math.max(w, h);
  if (longest <= maxDim) return { width: w, height: h };
  const ratio = maxDim / longest;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  profile: UploadProfileKey;
  upsert?: boolean;
  /** Called when image optimisation begins so UI can show a message. */
  onOptimizing?: () => void;
}

export interface UploadResult {
  path: string;
  size: number;
  mimeType: string;
  fileName: string;
}

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, profile, upsert = true, onOptimizing } = opts;

  const v = validateFile(file, profile);
  if (!v.ok) throw new Error(v.message);

  let toUpload = file;
  if (UPLOAD_PROFILES[profile].image && file.type.startsWith("image/")) {
    onOptimizing?.();
    toUpload = await optimizeImage(file, profile);
  }

  // Re-validate size after optimisation (only smaller is possible, but be safe)
  if (toUpload.size > UPLOAD_PROFILES[profile].maxBytes) {
    throw new Error(`File exceeds maximum size limit (${formatBytes(UPLOAD_PROFILES[profile].maxBytes)}).`);
  }

  // Replace extension in path to match the (possibly converted) file
  const finalExt = getExt(toUpload.name);
  const finalPath = path.replace(/\.[^./]+$/, "") + "." + finalExt;

  const { error } = await supabase.storage.from(bucket).upload(finalPath, toUpload, {
    upsert,
    contentType: toUpload.type || undefined,
    cacheControl: "3600",
  });
  if (error) throw error;

  return {
    path: finalPath,
    size: toUpload.size,
    mimeType: toUpload.type,
    fileName: toUpload.name,
  };
}
