import fs from "fs";
import path from "path";
import { generatePresignedPutUrl } from "../services/r2";

// Ensure global fetch is available (for Node < 18, but project uses Node 20+)
// If needed: import fetch from 'node-fetch';

async function testUpload() {
  const filePath =
    "/Users/romeoscript/Desktop/sports-reels/Screen Recording 2026-01-24 at 14.15.51.mov";

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);
  const fileSize = fileContent.length;

  console.log(`Preparing to upload ${fileName} (${fileSize} bytes)...`);

  try {
    const key = `originals/videos/test-upload/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const contentType = "video/quicktime";

    console.log("Generating presigned URL...");
    const presignedUrl = await generatePresignedPutUrl(key, contentType, 3600);
    console.log(
      "Presigned URL generated (truncated):",
      presignedUrl.substring(0, 100) + "...",
    );

    console.log("Uploading to R2...");
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: fileContent,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
      },
      // duplex: 'half' is sometimes needed for fetch with body in Node 18+
      duplex: "half",
    } as any);

    if (response.ok) {
      console.log("✅ Upload successful!");
      console.log("Key:", key);
      console.log("Status:", response.status);
    } else {
      console.error("❌ Upload failed:", response.status, response.statusText);
      const text = await response.text();
      console.error("Response body:", text);
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
  }
}

testUpload();
