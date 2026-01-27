import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";

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
      const { name, grade_level, section, report_type, description } = fields;
      const uploadedUrls = [];

      // 🖼 Handle multiple files
      if (files.media) {
        const mediaFiles = Array.isArray(files.media) ? files.media : [files.media];

        for (const file of mediaFiles) {
          const fileData = await fsReadFile(file.filepath); // read file as buffer
          const fileExt = file.originalFilename.split(".").pop();
          const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(fileName, fileData, { contentType: file.mimetype });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data } = supabase.storage.from("evidence").getPublicUrl(fileName);
          uploadedUrls.push(data.publicUrl);
        }
      }

      // Insert report
      const { error: insertError } = await supabase.from("reports").insert({
        name: name || "Anonymous",
        grade_level,
        section,
        report_type,
        description,
        evidence: uploadedUrls,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return res.status(500).json({ success: false, error: "Failed to insert report" });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Server error:", e);
      return res.status(500).json({ success: false, error: "A server error occurred" });
    }
  });
}

// Helper: read file in serverless-safe way
function fsReadFile(filepath) {
  return new Promise((resolve, reject) => {
    import("fs").then(fs => {
      fs.readFile(filepath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    }).catch(reject);
  });
}
