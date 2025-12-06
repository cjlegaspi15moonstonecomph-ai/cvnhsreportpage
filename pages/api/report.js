// pages/api/report.js
import { createClient } from "@supabase/supabase-js";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = new IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    try {
      // Validate required fields (basic)
      if (!fields.grade_level || !fields.location || !fields.report_type || !fields.description) {
        // still accept but warn
        console.warn("Missing some required fields:", {
          grade_level: fields.grade_level,
          location: fields.location,
          report_type: fields.report_type,
          description: fields.description,
        });
      }

      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

      // Upload files (if any) to 'evidence' bucket and collect public URLs
      const mediaUrls = [];
      if (files && files.media) {
        const uploadList = Array.isArray(files.media) ? files.media : [files.media];

        for (const file of uploadList) {
          // Skip invalid entries
          if (!file || !file.originalFilename || !file.filepath) continue;

          const buf = fs.readFileSync(file.filepath);
          // sanitize filename a bit
          const safeName = file.originalFilename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-\.]/g, "");
          const destFilename = `${Date.now()}-${Math.round(Math.random()*10000)}-${safeName}`;

          // upload
          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(destFilename, buf, { contentType: file.mimetype });

          if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            // continue to try other files
            continue;
          }

          const { data } = supabase.storage.from("evidence").getPublicUrl(destFilename);
          if (data && data.publicUrl) mediaUrls.push(data.publicUrl);
        }
      }

      // Insert into reports table
      const insertPayload = {
        name: fields.name || null,
        grade_level: fields.grade_level || null,
        location: fields.location || null,
        report_type: fields.report_type || null,
        description: fields.description || null,
        media_urls: mediaUrls,
      };

      const { error: insertError } = await supabase.from("reports").insert([insertPayload]);

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return res.status(500).json({ error: "Database insert failed" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });
}
