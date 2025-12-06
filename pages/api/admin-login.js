import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  res.status(200).json(data);
}
