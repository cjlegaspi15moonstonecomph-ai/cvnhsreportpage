// pages/api/admin/getReports.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      return res.status(500).json({ error: "Database read failed" });
    }

    // Transform rows to match admin UI expectation
    const out = (data || []).map((row) => ({
      id: row.id,
      name: row.name || "Anonymous",
      grade: row.grade_level || "",
      reportType: row.report_type || "",
      location: row.location || "",
      message: row.description || "",
      // pick first media url if exists (admin UI supports single preview)
      fileUrl: Array.isArray(row.media_urls) && row.media_urls.length ? row.media_urls[0] : null,
      // keep original created_at string (or convert to nicer format if desired in frontend)
      created_at: row.created_at,
      raw_media_urls: row.media_urls || [],
    }));

    return res.status(200).json(out);
  } catch (err) {
    console.error("Admin API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
