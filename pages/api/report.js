import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // important: we handle form-data manually
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Parse Form Data Manually (No multer needed)
    const form = await new Promise((resolve, reject) => {
      const busboy = require("busboy")({ headers: req.headers });

      const fields = {};
      const files = [];

      busboy.on("field", (name, value) => {
        fields[name] = value;
      });

      busboy.on("file", (name, file, info) => {
        let fileData = [];
        file.on("data", (data) => fileData.push(data));
        file.on("end", () => {
          files.push({
            filename: info.filename,
            type: info.mimeType,
            buffer: Buffer.concat(fileData),
          });
        });
      });

      busboy.on("finish", () => resolve({ fields, files }));
      busboy.on("error", reject);

      req.pipe(busboy);
    });

    const mediaUrls = [];

    // Upload evidence to Supabase Storage
    for (const file of form.files) {
      const ext = file.filename.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${ext}`;

      await supabase.storage
        .from("evidence")
        .upload(fileName, file.buffer, { contentType: file.type });

      // Get public URL
      const { data } = supabase.storage
        .from("evidence")
        .getPublicUrl(fileName);

      mediaUrls.push(data.publicUrl);
    }

    // Save report to DB
    await supabase.from("reports").insert([
      {
        name: form.fields.name,
        grade_level: form.fields.grade_level,
        location: form.fields.location,
        report_type: form.fields.report_type,
        description: form.fields.description,
        media_urls: mediaUrls,
      },
    ]);

    return res.status(200).send("Report submitted successfully");
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
