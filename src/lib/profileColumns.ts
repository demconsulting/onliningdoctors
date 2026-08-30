// Columns on `profiles` that are readable by authenticated clients.
// Identity document fields (id_number, id_number_hash, id_type) are intentionally
// excluded — they are only reachable by the owner through the
// `get_my_identity()` security-definer RPC.
export const PROFILE_COLUMNS =
  "id, full_name, avatar_url, phone, date_of_birth, gender, address, city, state, country, created_at, updated_at, is_suspended, suspension_reason, account_status, test_user, demo_user, environment, id_country_code, phone_verified, business_unit, email, status, created_by, last_login_at" as const;
