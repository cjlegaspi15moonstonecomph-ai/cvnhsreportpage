import nextConnect from "next-connect";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const upload = multer({ storage: multer.memoryStorage() });
const handler = nextConnect();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

handler.use(upload.array("media"));

handler.post(async (req, res) => {
  try {
    const mediaUrls = [];

    for (const file of req.files) {
      const ext = file.originalname.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("evidence")
        .upload(fileName, file.buffer);

      if (error) console.log(error);

      const publicUrl = supabase.storage.from("evidence").getPublicUrl(fileName).data.publicUrl;
      mediaUrls.push(publicUrl);
    }

    await supabase.from("reports").insert([
      {
        name: req.body.name,
        grade_level: req.body.grade_level,
        location: req.body.location,
        report_type: req.body.report_type,
        description: req.body.description,
        media_urls: mediaUrls
      }
    ]);

    res.status(200).send("Report submitted successfully.");
  } catch (err) {
    res.status(500).send("Error submitting report");
  }
});

export const config = { api: { bodyParser: false } };
export default handler;
