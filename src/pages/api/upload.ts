import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  });

  form.parse(req, async (err, fields, files) => {
    console.log("Parsing upload...");
    if (err || !files.file) {
      console.error("Form parse error:", err);
      return res.status(400).json({ message: "File parsing error" });
    }

    const uploadedFile = files.file[0];
    const filePath = uploadedFile.filepath;
    console.log("Sending file to Python backend:", filePath);

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    try {
      const response = await fetch("http://localhost:5001/parse", {
        method: "POST",
        body: formData as any,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Python backend error:", errorText);
        return res.status(500).json({ message: "Backend error", detail: errorText });
      }

      const buffer = await response.buffer();
      const filename = `statement_${Date.now()}.xlsx`;
      const downloadPath = path.join(process.cwd(), "public", "downloads", filename);

      fs.mkdirSync(path.join(process.cwd(), "public", "downloads"), { recursive: true });
      fs.writeFileSync(downloadPath, buffer);

      const downloadUrl = `/downloads/${filename}`;
      console.log("Saved file:", downloadUrl);
      res.status(200).json({ downloadUrl });
    } catch (err) {
      console.error("Upload route error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}
