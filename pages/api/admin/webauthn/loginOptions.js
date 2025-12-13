// pages/api/admin/webauthn/loginOptions.js
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: "Missing username" });

  // Lookup user's credentials to pass allowedCredentials
  const { data: admin } = await supabase.from("admins").select("credentials").eq("username", username).limit(1).single();
  const creds = admin?.credentials || [];

  const allowCredentials = creds.map(c => ({
    id: Buffer.from(c.credentialID, "base64"),
    type: "public-key",
    transports: ["internal", "usb", "ble", "nfc"].filter(Boolean),
  }));

  const options = generateAuthenticationOptions({
    timeout: 60000,
    allowCredentials,
    userVerification: "preferred",
  });

  // store challenge with purpose 'login'
  await supabase.from("webauthn_challenges").insert([{ username, challenge: options.challenge, purpose: "login" }]);

  return res.status(200).json(options);
}
