// pages/api/admin/webauthn/registerVerify.js
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, attResp } = req.body || {};
  if (!username || !attResp) return res.status(400).json({ error: "Missing data" });

  // fetch challenge from DB and delete it
  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("*")
    .eq("username", username)
    .eq("purpose", "register")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) return res.status(400).json({ error: "No challenge found" });

  try {
    const expectedOrigin = `https://${process.env.VERCEL_URL || new URL(process.env.SUPABASE_URL).hostname}`;
    const expectedRPID = new URL(process.env.SUPABASE_URL).hostname;

    const verification = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: "Registration not verified" });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Save credential to admins.credentials array
    const { data: admin } = await supabase.from("admins").select("id,credentials").eq("username", username).limit(1).single();

    const newCred = {
      credentialID: Buffer.from(credentialID).toString("base64"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
    };

    const updated = (admin.credentials || []).concat([newCred]);

    await supabase.from("admins").update({ credentials: updated }).eq("id", admin.id);

    // optionally remove challenge row
    await supabase.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }
}
