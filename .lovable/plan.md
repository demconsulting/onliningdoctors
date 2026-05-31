## Secure File Upload Management & Storage Optimisation

Build a centralized upload utility + apply it across all existing upload points, plus an admin storage dashboard. Reuse existing buckets — do NOT create new ones (would orphan existing files).

### 1. Shared upload utility — `src/lib/fileUpload.ts`

Single source of truth for all uploads:
- `UPLOAD_PROFILES` config map: `avatar` (2MB, img), `doctor_id` (5MB, pdf+img), `hpcsa` (5MB), `patient_doc` (10MB), `prescription` (5MB pdf), `referral` (5MB pdf), `medical_report` (10MB pdf+img), `practice_logo` (3MB img), `practice_signature` (2MB img).
- `validateFile(file, profile)` — checks size, extension, MIME; blocks exe/zip/rar/bat/apk/dmg/js/html/php/py/sh and any unknown.
- `optimizeImage(file, {maxWidth, maxBytes, quality})` — uses HTMLCanvasElement + `canvas.toBlob('image/webp')` to resize (max 1600px long edge for documents, 512px for avatars), strip metadata, target 50–80% reduction. Skip for PDFs. Skip for ID/HPCSA if quality drop would harm verification — use lossless-ish (q=0.92) and larger max dimension (2000px).
- `uploadFile({ bucket, path, file, profile, onProgress })` — validate → optimize if image → upload to Supabase Storage → return `{ path, size, mimeType }`.
- Friendly toast helpers: "File exceeds maximum size limit", "Unsupported file type", "Optimising image before upload…".

### 2. Reusable preview component — `src/components/shared/FilePreview.tsx`

Renders selected file before upload: image thumbnail (object URL) or PDF icon + filename + size. Used in avatar upload, ID/HPCSA upload, document uploads.

### 3. Wire into existing components

Replace ad-hoc validation/upload code in:
- `src/components/shared/AvatarUpload.tsx` — 2MB → use avatar profile, auto-WEBP @ 512px.
- `src/pages/DoctorSignup.tsx` — ID copy + HPCSA inputs (5MB, pdf/img).
- `src/components/doctor/DoctorProfile.tsx` — same.
- `src/components/doctor/PrescriptionSettings.tsx` — logo (3MB img → webp), signature (2MB png preserving transparency).
- `src/components/patient/DocumentUpload.tsx` — 10MB, type-aware (prescriptions/referrals = pdf only).
- `src/components/doctor/PatientDocuments.tsx` — same patient-doc rules.

All show pre-upload preview where the user picks a file.

### 4. Admin Document Viewer — `src/components/admin/DocumentViewerModal.tsx`

In-app modal (Dialog) that fetches a signed URL and renders:
- Images → `<img>` inside the modal.
- PDFs → `<iframe>` of the signed URL.
- Buttons: Download, Approve, Reject (callbacks passed in).

Wire into `AdminDoctorVerification.tsx` to replace `window.open` flow for ID + HPCSA docs.

### 5. Admin Storage Dashboard — `src/components/admin/AdminStorageUsage.tsx`

New admin sidebar entry "Storage". Calls a new edge function `admin-storage-stats` (service role) that iterates each bucket via `supabase.storage.from(b).list('', {limit, recursive})` and aggregates:
- Total bytes used, per-bucket bytes + file count.
- Top 10 largest files (name, bucket, size, created_at).
- Recent uploads (last 7 days) chart.

Renders summary cards + table + Recharts AreaChart (matches existing earnings pattern). Admin-only via `has_role` check in edge function.

### 6. Storage architecture (no new buckets)

Keep existing buckets — they already cover the use cases:
- `avatars` → profile photos (public).
- `doctor-licenses` → ID + HPCSA (private).
- `patient-documents` → patient uploads, prescriptions, referrals, medical reports (private). Use `document_type` column to segregate logically — already supported.
- `prescription-assets` → practice logo + signature (private).
- `branding` → site branding (public).

This preserves all existing files and signed-URL flows.

### Files

**New**
- `src/lib/fileUpload.ts`
- `src/components/shared/FilePreview.tsx`
- `src/components/admin/DocumentViewerModal.tsx`
- `src/components/admin/AdminStorageUsage.tsx`
- `supabase/functions/admin-storage-stats/index.ts`

**Edited**
- `src/components/shared/AvatarUpload.tsx`
- `src/components/doctor/PrescriptionSettings.tsx`
- `src/components/patient/DocumentUpload.tsx`
- `src/components/doctor/PatientDocuments.tsx`
- `src/components/admin/AdminDoctorVerification.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/DoctorSignup.tsx`
- `src/components/doctor/DoctorProfile.tsx`
- `supabase/config.toml` (register new function)

### Technical notes

- Client-side image optimisation via Canvas → WEBP keeps cost at zero (no edge processing).
- PNG signatures with transparency stay PNG (no WEBP conversion) to preserve alpha for prescriptions.
- ID/HPCSA images compressed lightly (q=0.92, max 2000px) to keep text legible for verification.
- File type security uses an extension allowlist + MIME prefix check; everything else rejected with "Unsupported file type."
- No new tables. No new buckets. No DB migration needed.
