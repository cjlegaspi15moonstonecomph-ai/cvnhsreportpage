// pages/api/admin/getReports.js
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const JWT_SECRET = process.env.JWT_SECRET;

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="));
  if (!match) return null;
  return match.split("=")[1];
}

export default async function handler(req, res) {
  const token = getCookie(req, "admin_token");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // payload.sub is admin id
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: "DB error" });

    const out = (data || []).map((row) => ({
      id: row.id,
      name: row.name || "Anonymous",
      grade: row.grade_level || "",
      reportType: row.report_type || "",
      location: row.location || "",
      message: row.description || "",
      fileUrl: Array.isArray(row.media_urls) && row.media_urls.length ? row.media_urls[0] : null,
      created_at: row.created_at,
      raw_media_urls: row.media_urls || [],
    }));

    return res.status(200).json(out);
  } catch (err) {
    console.error("auth/verify error:", err);
    return res.status(401).json({ error: "Invalid session" });
  }
}
