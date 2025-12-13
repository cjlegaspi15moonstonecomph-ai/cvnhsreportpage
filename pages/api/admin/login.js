// pages/api/admin/login.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const JWT_SECRET = process.env.JWT_SECRET;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function setTokenCookie(res, token) {
  // cookie valid 8 hours
  const cookie = `admin_token=${token}; HttpOnly; Path=/; Max-Age=${60*60*8}; SameSite=Lax; Secure`;
  res.setHeader("Set-Cookie", cookie);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  const { data, error } = await supabase.from("admins").select("*").eq("username", username).limit(1).single();

  if (error || !data) return res.status(401).json({ error: "Invalid credentials" });

  const isValid = data.password_hash ? bcrypt.compareSync(password, data.password_hash) : false;
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ sub: data.id, username: data.username }, JWT_SECRET, { expiresIn: "8h" });
  setTokenCookie(res, token);
  return res.status(200).json({ success: true });
}
