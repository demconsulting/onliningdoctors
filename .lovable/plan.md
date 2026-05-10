## Practice Management Calendar Module

A unified calendar for doctors, practice admins, and receptionists to manage **online** and **offline/in-person** appointments in one place, with strict conflict prevention.

---

### 1. Database changes (Supabase migration)

**`appointments` table — extend:**
- `appointment_type` text: `'online' | 'offline'` (default `'online'`)
- `patient_name` text (nullable, for offline walk-ins)
- `patient_phone` text (nullable)
- `patient_email` text (nullable)
- `end_time` timestamptz (nullable — derived from `scheduled_at + duration_minutes` if absent)
- `created_by` uuid (who recorded it — doctor, receptionist, or patient)
- Make `patient_id` nullable for offline-only entries
- Index on `(doctor_id, scheduled_at)` for conflict checks

**New table `doctor_blocked_times`:**
- `id`, `doctor_id`, `practice_id` (nullable), `reason` text, `block_type` text (`'break' | 'lunch' | 'leave' | 'unavailable' | 'other'`), `start_time` timestamptz, `end_time` timestamptz, `created_by`, `created_at`
- RLS:
  - Doctor manages own blocks
  - Practice managers / receptionists manage blocks for doctors in their practice (via `is_practice_member` / `is_practice_manager`)
  - Public `SELECT` so patient booking UI can hide blocked slots

**Conflict-check DB function** `check_appointment_conflict(_doctor_id, _start, _end, _exclude_appt_id)` (SECURITY DEFINER) — returns `boolean`. Used by:
- Online booking edge function (`paystack-payment` already validates pricing — extend to also call this)
- Offline appointment insert trigger (raises exception on overlap with confirmed/pending appointments OR active blocked times)

**RLS additions on `appointments`:**
- Practice receptionists/admins/doctors can `SELECT`, `INSERT`, `UPDATE` appointments where `doctor_id` belongs to their practice
- Cannot access wallet/billing/payments tables (existing RLS already restricts these)

---

### 2. Frontend: Calendar module

New folder `src/components/calendar/`:

- `PracticeCalendar.tsx` — main component, day/week/month tabs, fetches appointments + blocks, realtime subscription
- `CalendarDayView.tsx`, `CalendarWeekView.tsx`, `CalendarMonthView.tsx`
- `AppointmentCard.tsx` — color-coded chip:
  - Blue = online, Green = offline, Grey = blocked, Orange = medical-aid pending, Red = cancelled
- `OfflineAppointmentDialog.tsx` — create/edit offline appointment form
- `BlockTimeDialog.tsx` — create blocked period (break/lunch/leave)
- `CalendarSummaryWidgets.tsx` — today's totals (online, offline, upcoming, missed, available slots)
- `useCalendarConflicts.ts` — client-side helper that calls the DB function before insert

**Library:** use lightweight custom grid (no heavy calendar lib) — Tailwind grid + date-fns. Keeps mobile bundle small.

**Mobile:** stack list view on `<sm`, FAB for "+ Add appointment", swipe-between-days via simple touch handlers.

---

### 3. Integration points

- **DoctorDashboard:** new "Calendar" tab (replaces or complements "Appointments")
- **PracticeTeam page:** receptionists already supported via `practice_members.role = 'receptionist'` — wire them to calendar
- **BookAppointment (patient):** before showing time slots, also subtract `doctor_blocked_times` overlapping the day; existing slot-availability already excludes confirmed appointments
- **paystack-payment edge function:** call `check_appointment_conflict` server-side before creating the appointment to close race conditions

---

### 4. Permissions matrix

| Role | View calendar | Create offline | Edit/cancel | Block time | Wallet/billing |
|---|---|---|---|---|---|
| Doctor (owner of slot) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Practice owner / admin | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| Receptionist | ✓ (practice doctors) | ✓ | ✓ | ✓ | ✗ |
| Nurse | ✓ | ✗ | ✗ | ✗ | ✗ |
| Patient | own bookings only | ✗ | cancel own | ✗ | ✗ |

---

### 5. Color tokens (added to `index.css`)

```
--cal-online, --cal-offline, --cal-blocked, --cal-pending, --cal-cancelled
```
HSL values matching existing teal/cyan medical theme.

---

### 6. Out of scope (future-ready hooks left in place)

Queue management, invoicing, WhatsApp/SMS reminders, AI scheduling — schema fields and component slots reserved but not implemented.

---

### Technical details

- Realtime: `supabase.channel('practice-calendar-' + doctorId)` subscribed to `appointments` and `doctor_blocked_times` filtered by `doctor_id`
- All conflict checks server-side via `check_appointment_conflict` (single source of truth)
- Offline appointments skip Paystack — `payment_method_type = 'offline'`, `status = 'confirmed'`
- date-fns already in deps; no new heavy libs
- Lazy-load the calendar module in `DoctorDashboard` to keep dashboard LCP intact

---

### Delivery order

1. Migration (table + function + RLS)
2. Calendar components + dialogs
3. Wire into DoctorDashboard as new "Calendar" tab
4. Update `BookAppointment` slot filter to subtract blocked times
5. Patch `paystack-payment` to call conflict check
6. Mobile polish + summary widgets

Approve to proceed — I'll start with the migration.
