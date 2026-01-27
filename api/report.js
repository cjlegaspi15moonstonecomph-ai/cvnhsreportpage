import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ success: false });
    }

    try {
      const name = fields.name || "Anonymous";
      const grade_level = fields.grade_level;
      const section = fields.location; // <-- FIXED: map location to section
      const report_type = fields.report_type;
      const description = fields.description;

      const uploadedUrls = [];

      if (files.media) {
        const mediaFiles = Array.isArray(files.media)
          ? files.media
          : [files.media];

        for (const file of mediaFiles) {
          const fileBuffer = fs.readFileSync(file.filepath);
          const fileExt = file.originalFilename.split(".").pop();
          const fileName = `report-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(fileName, fileBuffer, {
              contentType: file.mimetype,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data } = supabase.storage
            .from("evidence")
            .getPublicUrl(fileName);

          uploadedUrls.push(data.publicUrl);
        }
      }

      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          name,
          grade_level,
          section,
          report_type,
          description,
          evidence: uploadedUrls,
        });

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return res.status(500).json({ success: false, error: insertError.message });
      }

      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Handler error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
}
