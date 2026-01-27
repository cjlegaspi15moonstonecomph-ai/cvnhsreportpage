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
      console.error(err);
      return res.status(500).json({ success: false });
    }

    try {
      const {
        name,
        grade_level,
        section,
        report_type,
        description,
      } = fields;

      const uploadedUrls = [];

      // 🖼 Handle multiple files
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
            console.error(uploadError);
            continue;
          }

          const { data } = supabase.storage
            .from("evidence")
            .getPublicUrl(fileName);

          uploadedUrls.push(data.publicUrl);
        }
      }

      // 📝 Insert report
      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          name: name || "Anonymous",
          grade_level,
          section,
          report_type,
          description,
          evidence: uploadedUrls,
        });

      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ success: false });
      }

      res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false });
    }
  });
}
