// pages/api/admin/webauthn/registerOptions.js
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Called to start registration. Body: { username }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: "Missing username" });

  // Create registration options
  const rpName = "School Reporter Admin";
  const user = { id: Buffer.from(username).toString("base64url"), name: username, displayName: username };

  const options = generateRegistrationOptions({
    rpName,
    rpID: new URL(process.env.SUPABASE_URL).hostname, // use your domain? it's okay for localhost in testing
    userID: user.id,
    userName: user.name,
    attestationType: "indirect",
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "discouraged",
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  // store challenge in DB with purpose 'register'
  await supabase.from("webauthn_challenges").insert([{ username, challenge: options.challenge, purpose: "register" }]);

  return res.status(200).json(options);
}
