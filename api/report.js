import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // disable Next.js default parser
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ success: false, error: "Form parse error" });
    }

    try {
      const {
        name,
        grade_level,
        section,
        report_type,
        description_where,
        description_who,
        description_what,
        description_when,
        description_why,
        description_how,
      } = fields;

      const uploadedUrls = [];

      // Handle media files
      if (files.media) {
        const mediaFiles = Array.isArray(files.media) ? files.media : [files.media];
        for (const file of mediaFiles) {
          const fileData = fs.readFileSync(file.filepath); // read file as buffer
          const fileExt = file.originalFilename.split(".").pop();
          const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(fileName, fileData, { contentType: file.mimetype });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      // Insert report
      const { error: insertError } = await supabase.from("reports").insert([{
        name: name || "Anonymous",
        grade_level,
        section,
        report_type,
        description_where,
        description_who,
        description_what,
        description_when,
        description_why,
        description_how,
        evidence: uploadedUrls,
      }]);

      if (insertError) {
        console.error("Insert error:", insertError);
        return res.status(500).json({ success: false, error: insertError.message });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Server error:", e);
      return res.status(500).json({ success: false, error: "A server error occurred" });
    }
  });
}
