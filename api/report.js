import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const data = req.body;

    const { error } = await supabase.from("reports").insert(data);

    if (error) {
      console.error("Insert error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true });

  } catch(e) {
    console.error("Server error:", e);
    return res.status(500).json({ success: false, error: "A server error occurred" });
  }
}
