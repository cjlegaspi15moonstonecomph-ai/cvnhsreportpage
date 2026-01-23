import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lrn } = req.body || {};

  if (!lrn) {
    return res.status(400).json({ error: "LRN is required" });
  }

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("lrn", lrn)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: "Invalid LRN" });
  }

  return res.status(200).json({
    success: true,
    student: {
      id: data.id,
      name: data.name,
      lrn: data.lrn
    }
  });
}
