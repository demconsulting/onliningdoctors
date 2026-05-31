import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKETS = ["avatars", "doctor-licenses", "patient-documents", "prescription-assets", "branding"];

interface FileMeta {
  bucket: string;
  path: string;
  size: number;
  createdAt: string | null;
}

async function listAll(admin: ReturnType<typeof createClient>, bucket: string, prefix = ""): Promise<FileMeta[]> {
  const out: FileMeta[] = [];
  let offset = 0;
  const limit = 100;
  // BFS through folders since list() isn't recursive
  const queue: string[] = [prefix];
  while (queue.length) {
    const current = queue.shift()!;
    offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(current, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !data) break;
      for (const item of data) {
        // Folders have no metadata.size / null id
        if (item.id === null || !item.metadata) {
          const sub = current ? `${current}/${item.name}` : item.name;
          queue.push(sub);
        } else {
          const fullPath = current ? `${current}/${item.name}` : item.name;
          out.push({
            bucket,
            path: fullPath,
            size: Number(item.metadata?.size ?? 0),
            createdAt: item.created_at ?? null,
          });
        }
      }
      if (data.length < limit) break;
      offset += limit;
      if (offset > 10000) break; // safety
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "platform_admin"]);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const all: FileMeta[] = [];
    for (const b of BUCKETS) {
      try {
        const files = await listAll(admin, b);
        all.push(...files);
      } catch (e) {
        console.error("List failed for bucket", b, e);
      }
    }

    const buckets = BUCKETS.map((b) => {
      const files = all.filter((f) => f.bucket === b);
      return {
        bucket: b,
        fileCount: files.length,
        totalBytes: files.reduce((s, f) => s + f.size, 0),
      };
    });

    const largest = [...all].sort((a, b) => b.size - a.size).slice(0, 10);

    // Activity over last 7 days
    const now = new Date();
    const days: { date: string; count: number; bytes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      days.push({ date: d.toISOString().slice(0, 10), count: 0, bytes: 0 });
    }
    for (const f of all) {
      if (!f.createdAt) continue;
      const key = f.createdAt.slice(0, 10);
      const day = days.find((d) => d.date === key);
      if (day) {
        day.count += 1;
        day.bytes += f.size;
      }
    }

    const totals = {
      fileCount: all.length,
      totalBytes: all.reduce((s, f) => s + f.size, 0),
    };

    return new Response(JSON.stringify({ totals, buckets, largest, activity: days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-storage-stats error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
