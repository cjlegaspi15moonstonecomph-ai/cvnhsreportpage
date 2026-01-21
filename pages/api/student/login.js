import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const JWT_SECRET = process.env.JWT_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function setTokenCookie(res, token) {
  const cookie = `student_token=${token}; HttpOnly; Path=/; Max-Age=${60*60*8}; SameSite=Lax; Secure`;
  res.setHeader("Set-Cookie", cookie);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { lrn, password } = req.body || {};
  if (!lrn) return res.status(400).json({ error: "Missing LRN" });

  const { data, error } = await supabase.from("students").select("*").eq("lrn", lrn).limit(1).single();

  if (error || !data) return res.status(401).json({ error: "Invalid LRN" });

  // If you want password, check it:
  if (data.password_hash) {
    const isValid = bcrypt.compareSync(password, data.password_hash);
    if (!isValid) return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ sub: data.id, lrn: data.lrn }, JWT_SECRET, { expiresIn: "8h" });
  setTokenCookie(res, token);
  return res.status(200).json({ success: true, name: data.name });
}
