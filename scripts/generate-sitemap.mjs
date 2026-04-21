const SITE_URL = "https://doctorsonlining.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const today = new Date().toISOString();

const staticPages = [
  { path: "/", priority: "1.0", changefreq: "daily", lastmod: today },
  { path: "/doctors", priority: "0.9", changefreq: "daily", lastmod: today },
  { path: "/about", priority: "0.7", changefreq: "monthly", lastmod: today },
  { path: "/contact", priority: "0.7", changefreq: "monthly", lastmod: today },
  { path: "/doctor-benefits", priority: "0.7", changefreq: "monthly", lastmod: today },
  { path: "/terms", priority: "0.4", changefreq: "monthly", lastmod: today },
  { path: "/privacy", priority: "0.4", changefreq: "monthly", lastmod: today },
  { path: "/refund-policy", priority: "0.4", changefreq: "monthly", lastmod: today },
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function fetchAllDoctors() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn("Skipping doctor sitemap generation: missing Supabase public env vars.");
    return [];
  }

  const pageSize = 1000;
  let start = 0;
  let total = Infinity;
  const doctors = [];

  while (start < total) {
    const end = start + pageSize - 1;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/doctors?select=profile_id,updated_at&is_verified=eq.true&is_suspended=eq.false&order=updated_at.desc.nullslast`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          Range: `${start}-${end}`,
          Prefer: "count=exact",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase sitemap fetch failed: ${response.status} ${response.statusText}`);
    }

    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      const [, totalCount] = contentRange.split("/");
      total = Number(totalCount) || 0;
    } else {
      total = 0;
    }

    const batch = await response.json();
    doctors.push(...batch);

    if (batch.length < pageSize) break;
    start += pageSize;
  }

  return doctors
    .filter((doctor) => doctor?.profile_id)
    .map((doctor) => ({
      path: `/doctors/${doctor.profile_id}`,
      priority: "0.8",
      changefreq: "daily",
      lastmod: doctor.updated_at || today,
    }));
}

async function generateSitemap() {
  const fs = await import("node:fs/promises");
  const doctorPages = await fetchAllDoctors().catch((error) => {
    console.error(error.message);
    return [];
  });

  const urls = [...staticPages, ...doctorPages]
    .map(
      ({ path, lastmod, changefreq, priority }) => `  <url>\n    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  await fs.mkdir("public", { recursive: true });
  await fs.writeFile("public/sitemap.xml", xml, "utf8");
  console.log(`Generated sitemap with ${staticPages.length + doctorPages.length} URLs.`);
}

generateSitemap().catch((error) => {
  console.error(error);
  process.exit(1);
});