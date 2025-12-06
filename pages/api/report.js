import { createClient } from "@supabase/supabase-js";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = new IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing failed" });

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE
      );

      // SAFE FILE HANDLING
      let mediaUrls = [];

      if (files.media) {
        const uploads = Array.isArray(files.media) ? files.media : [files.media];

        for (const file of uploads) {
          if (!file || !file.originalFilename) continue;

          const fileBuffer = fs.readFileSync(file.filepath);
          const fileName = `${Date.now()}-${file.originalFilename}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(fileName, fileBuffer, {
              contentType: file.mimetype,
            });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from("evidence")
            .getPublicUrl(fileName);

          mediaUrls.push(data.publicUrl);
        }
      }

      // Insert report
      await supabase.from("reports").insert([
        {
          name: fields.name || "Anonymous",
          grade_level: fields.grade_level,
          location: fields.location,
          report_type: fields.report_type,
          description: fields.description,
          media_urls: mediaUrls
        }
      ]);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });
}
