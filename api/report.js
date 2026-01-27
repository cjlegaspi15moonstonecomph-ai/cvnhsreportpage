import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // we'll handle files manually
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server key needed to bypass RLS for storage
);

// Helper to read file in serverless environment
async function fsReadFile(filepath) {
  const fs = await import("fs");
  return fs.promises.readFile(filepath);
}

// Use formidable to parse multipart/form-data
import formidable from "formidable";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, error: "Form parse error" });

    try {
      // Extract user_id from session token
      const token = fields.token; // send Supabase Auth session access_token from frontend
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) return res.status(401).json({ success: false, error: "Unauthorized" });
      const user_id = user.id;

      const {
        name, grade_level, section, report_type,
        description_where, description_who, description_what,
        description_when, description_why, description_how
      } = fields;

      // Handle evidence upload
      const uploadedUrls = [];
      if (files.media) {
        const mediaFiles = Array.isArray(files.media) ? files.media : [files.media];
        for (const file of mediaFiles) {
          const buffer = await fsReadFile(file.filepath);
          const ext = file.originalFilename.split(".").pop();
          const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(fileName, buffer, { contentType: file.mimetype });

          if (uploadError) continue;

          const { publicUrl } = supabase.storage.from("evidence").getPublicUrl(fileName).data;
          uploadedUrls.push(publicUrl);
        }
      }

      // Insert report
      const { error: insertError } = await supabase.from("reports").insert([{
        user_id,
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
        evidence: uploadedUrls
      }]);

      if (insertError) return res.status(500).json({ success: false, error: insertError.message });

      return res.status(200).json({ success: true });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });
}
