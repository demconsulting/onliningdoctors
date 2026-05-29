import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { prescriptionId, to, verifyUrl } = await req.json();
    if (!prescriptionId || !to) {
      return new Response(JSON.stringify({ error: 'prescriptionId and to required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rx } = await supabase
      .from('prescriptions').select('prescription_number, doctor_id, created_at, medications')
      .eq('id', prescriptionId).maybeSingle();
    if (!rx) {
      return new Response(JSON.stringify({ error: 'Prescription not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: doctor } = await supabase
      .from('profiles').select('full_name').eq('id', rx.doctor_id).maybeSingle();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>Your Prescription from Dr. ${doctor?.full_name || ''}</h2>
        <p>Prescription number: <strong>${rx.prescription_number}</strong></p>
        <p>Issued on ${new Date(rx.created_at).toLocaleDateString()}.</p>
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
        to: [to],
        subject: `Prescription ${rx.prescription_number} from Dr. ${doctor?.full_name || ''}`,
        html,
      }),
    });
    const payload = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'Email send failed', details: payload }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: payload.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
