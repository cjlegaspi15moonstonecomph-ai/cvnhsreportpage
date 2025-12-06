import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error("Admin API error:", err);
    return res.status(500).json({ error: "Unable to fetch reports" });
  }
}
