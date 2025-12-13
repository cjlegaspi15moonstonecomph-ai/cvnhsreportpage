// pages/api/admin/logout.js
export default function handler(req, res) {
  res.setHeader("Set-Cookie", `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`);
  return res.status(200).json({ success: true });
}
