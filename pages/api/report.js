import { createClient } from "@supabase/supabase-js";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = new IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing failed" });

    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

      const mediaUrls = [];

      if (files.media) {
        const fileList = Array.isArray(files.media) ? files.media : [files.media];

        for (const file of fileList) {
          const buffer = fs.readFileSync(file.filepath);
          const safeName = file.originalFilename.replace(/\s+/g, "_");
          const dest = `${Date.now()}-${Math.round(Math.random()*10000)}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(dest, buffer, { contentType: file.mimetype });

          if (!uploadError) {
            const { data } = supabase.storage.from("evidence").getPublicUrl(dest);
            mediaUrls.push(data.publicUrl);
          }
        }
      }

      const { error: insertError } = await supabase.from("reports").insert([{
        name: fields.name || null,
        grade_level: fields.grade_level || null,
        location: fields.location || null,
        report_type: fields.report_type || null,
        description: fields.description || null,
        media_urls: mediaUrls,
      }]);

      if (insertError) return res.status(500).json({ error: "Database insert failed" });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });
}
