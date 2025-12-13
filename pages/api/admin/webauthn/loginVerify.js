// pages/api/admin/webauthn/loginVerify.js
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const JWT_SECRET = process.env.JWT_SECRET;

function setTokenCookie(res, token) {
  const cookie = `admin_token=${token}; HttpOnly; Path=/; Max-Age=${60*60*8}; SameSite=Lax; Secure`;
  res.setHeader("Set-Cookie", cookie);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, assertion } = req.body || {};
  if (!username || !assertion) return res.status(400).json({ error: "Missing data" });

  // fetch last login challenge
  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("*")
    .eq("username", username)
    .eq("purpose", "login")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) return res.status(400).json({ error: "No challenge found" });

  // fetch user's credential info
  const { data: admin } = await supabase.from("admins").select("id,credentials").eq("username", username).limit(1).single();
  if (!admin) return res.status(400).json({ error: "Admin not found" });

  const cred = (admin.credentials || []).find(c => c.credentialID === assertion.id || c.credentialID === Buffer.from(assertion.id || "", "base64").toString("base64"));
  if (!cred && admin.credentials.length === 0) return res.status(400).json({ error: "No credentials registered" });

  try {
    const expectedOrigin = `https://${process.env.VERCEL_URL || new URL(process.env.SUPABASE_URL).hostname}`;
    const expectedRPID = new URL(process.env.SUPABASE_URL).hostname;

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID,
      authenticator: {
        credentialPublicKey: Buffer.from(cred.credentialPublicKey, "base64"),
        credentialID: Buffer.from(cred.credentialID, "base64"),
        counter: cred.counter || 0,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: "Verification failed" });
    }

    // update counter in DB
    const updatedCreds = (admin.credentials || []).map(c => {
      if (c.credentialID === cred.credentialID) {
        return { ...c, counter: verification.authenticationInfo.newCounter };
      }
      return c;
    });

    await supabase.from("admins").update({ credentials: updatedCreds }).eq("id", admin.id);

    // issue JWT
    const token = jwt.sign({ sub: admin.id }, JWT_SECRET, { expiresIn: "8h" });
    setTokenCookie(res, token);

    // cleanup challenge
    await supabase.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("webauthn login verify err:", err);
    return res.status(500).json({ error: "Verification error" });
  }
}
