# Doctor Profile Change Management System

## Overview

Build a two-tier profile update system: most fields update instantly (self-service), while regulated/verification fields go through an admin approval queue. Adds a new `doctor_profile_changes` table, doctor "Profile Changes" view, and admin "Doctor Profile Reviews" panel.

## Field Categorization

**Category A – Auto Approved (instant save)**
- Profile photo (with client-side validation), bio, about me, languages, consultation fee, availability, practice address/phone/website, areas of interest, experience description, awards, social links

**Category B – Review Required (pending → admin approves/rejects)**
- Full name, HPCSA/license number, specialty, qualifications/education, practice number, identity/registration document paths

## Database

New table `public.doctor_profile_changes`:
- `id`, `doctor_id` (uuid), `field_name` (text), `old_value` (jsonb), `new_value` (jsonb)
- `status` (enum: pending/approved/rejected, default pending)
- `rejection_reason` (text, nullable)
- `created_at`, `reviewed_at`, `reviewed_by` (uuid, nullable)

RLS:
- Doctors INSERT/SELECT their own rows
- Admins SELECT all, UPDATE status (approve/reject)
- On approval, an admin-side handler writes the new value into `profiles`/`doctors`

Grants: `authenticated` (SELECT/INSERT), `service_role` ALL.

Indexes on `(doctor_id, status)` and `(status, created_at)`.

## Doctor Side

`DoctorProfile.tsx` is split into two save paths:
- **Auto fields**: existing direct `update()` on `profiles`/`doctors` (already works for most). Show "Saved" toast.
- **Review fields**: instead of writing to live tables, insert a row per changed field into `doctor_profile_changes` with status=pending and show "Submitted for review" toast. If a pending change already exists for that field, update it instead of creating duplicates.

Add a new tab **"Profile Changes"** in `DoctorDashboard`:
- Lists pending / approved / rejected change requests with field, old → new value, submission date, status, rejection reason.

## Admin Side

New `AdminDoctorProfileReviews.tsx` component + sidebar entry **"Profile Reviews"** in `AdminDashboard`:
- Table grouped by doctor: field, old value, new value, submitted date
- Approve button → calls RPC `approve_profile_change(change_id)` that updates target table and marks row approved
- Reject button → opens dialog requiring reason, marks row rejected

Approval RPC is `SECURITY DEFINER`, checks `has_role(auth.uid(),'admin')`, dispatches by `field_name` to update either `profiles.full_name` or `doctors.<column>`.

## Profile Photo Validation

Add client-side checks in `AvatarUpload.tsx` before upload:
- Reject unsupported formats (already done)
- Reject extremely small (<200px) or low-quality images (file <5KB or >2MB)
- Basic blur heuristic via canvas (variance of Laplacian approximation) — optional, off by default with a TODO; face-detection requires a model, so we keep a lightweight `face-api`-free heuristic (image dimensions + aspect + non-blank check) and accept otherwise.
- Document the limitation; full face-detection can be a follow-up.

## Notifications

Reuse existing `notifications` system (in-app bell):
- On insert into `doctor_profile_changes`: trigger creates notification for all admins ("New profile change submitted").
- On update to approved/rejected: trigger creates notification for the doctor.

## Audit Trail

The `doctor_profile_changes` table itself is the audit trail (keeps old/new/reviewer/date). Approved-changes view is filterable by date and field. We do not delete rows.

## Files

- New migration: create enum, table, grants, RLS, approve/reject RPCs, notification triggers
- New `src/components/doctor/DoctorProfileChanges.tsx`
- Update `src/components/doctor/DoctorProfile.tsx` (split save logic; review fields submit changes instead)
- Update `src/pages/DoctorDashboard.tsx` (add tab)
- New `src/components/admin/AdminDoctorProfileReviews.tsx`
- Update `src/components/admin/AdminSidebar.tsx` + `src/pages/AdminDashboard.tsx` (add section)
- Update `src/components/shared/AvatarUpload.tsx` (image validation)

## Out of Scope

- ML-based face detection (documented limitation; basic heuristics only)
- Email notifications for change events (in-app only for now)

Confirm and I'll implement.
