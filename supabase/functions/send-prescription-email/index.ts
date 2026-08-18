import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ORIGINS = [
  'https://doctorsonlining.com',
  'https://www.doctorsonlining.com',
  'https://onliningdoctors.lovable.app',
];

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // SECURITY: require an authenticated caller.
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    const caller = userData?.user;
    if (userErr || !caller) return json({ error: 'Unauthorized' }, 401);

    const { prescriptionId, to } = await req.json();
    if (!prescriptionId || !to || typeof to !== 'string') {
      return json({ error: 'prescriptionId and to required' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      return json({ error: 'Invalid recipient email' }, 400);
    }

    const { data: rx } = await supabase
      .from('prescriptions')
      .select('prescription_number, doctor_id, patient_id, created_at, verification_token')
      .eq('id', prescriptionId).maybeSingle();

    // SECURITY: do not leak existence of prescriptions the caller cannot access.
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });
    const authorized = !!rx && (rx.doctor_id === caller.id || rx.patient_id === caller.id || isAdmin === true);
    if (!authorized) return json({ error: 'Not found' }, 404);

    const { data: doctor } = await supabase
      .from('profiles').select('full_name').eq('id', rx!.doctor_id).maybeSingle();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    // SECURITY: build the verification link server-side from an allow-listed origin.
    const requestOrigin = req.headers.get('origin') || '';
    const baseUrl = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
    const verifyUrl = rx!.verification_token
      ? `${baseUrl}/verify-prescription?token=${encodeURIComponent(rx!.verification_token)}`
      : `${baseUrl}/dashboard`;

    const doctorName = escapeHtml(doctor?.full_name || '');
    const rxNumber = escapeHtml(rx!.prescription_number || '');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>Your Prescription from Dr. ${doctorName}</h2>
        <p>Prescription number: <strong>${rxNumber}</strong></p>
        <p>Issued on ${new Date(rx!.created_at).toLocaleDateString()}.</p>
        <p>You can view and download your prescription securely here:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#0891b2;color:#fff;text-decoration:none;border-radius:6px">View Prescription</a></p>
        <hr/>
        <p style="font-size:12px;color:#777">Generated securely through Doctors Onlining.</p>
      </div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Doctors Onlining <noreply@onliningdoctors.lovable.app>',
        to: [to.trim()],
        subject: `Prescription ${rx!.prescription_number} from Dr. ${doctor?.full_name || ''}`,
        html,
      }),
    });
    const payload = await r.json();
    if (!r.ok) return json({ error: 'Email send failed', details: payload }, 502);

    return json({ ok: true, id: payload.id });
  } catch (e) {
    console.error('send-prescription-email error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
