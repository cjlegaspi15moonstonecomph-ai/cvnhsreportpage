// pages/api/report.js
import { IncomingForm } from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({
    multiples: true,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form error" });
    }

    try {
      // 🔹 Combine description fields
      const description = `
Sino ang sangkot:
${fields.desc_sino || ""}

Ano ang nangyari:
${fields.desc_ano || ""}

Saan ito nangyari:
${fields.desc_saan || ""}

Kailan ito nangyari:
${fields.desc_kailan || ""}

Bakit ito nangyari:
${fields.desc_bakit || ""}

Paano ito nangyari:
${fields.desc_paano || ""}
      `.trim();

      // 🔹 Upload evidence (optional)
      let fileUrl = null;

      if (files.media) {
        const file = Array.isArray(files.media)
          ? files.media[0]
          : files.media;

        const fileExt = file.originalFilename?.split(".").pop();
        const filePath = `evidence/${Date.now()}-${file.originalFilename}`;

        const fileBuffer = fs.readFileSync(file.filepath);

        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(filePath, fileBuffer, {
            contentType: file.mimetype,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from("evidence")
            .getPublicUrl(filePath);

          fileUrl = data.publicUrl;
        }
      }

      // 🔹 Insert report into database
      const { error: insertError } = await supabase.from("reports").insert([
        {
          name: fields.name || "Anonymous",
          grade: fields.grade_level,
          reportType: fields.report_type,
          location: fields.location,
          message: description,
          fileUrl: fileUrl,
        },
      ]);

      if (insertError) {
        console.error("Insert error:", insertError);
        return res.status(500).json({ error: "Database error" });
      }

      return res.status(200).json({ success: true });

    } catch (e) {
      console.error("SERVER ERROR:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });
}
