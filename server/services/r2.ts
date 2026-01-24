import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY
) {
  // Warn but don't crash, as it might be running in build or test env
  console.warn(
    "Missing R2 credentials. R2 service will not function correctly.",
  );
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "sportsreelstechnical";

export const generatePresignedGetUrl = async (
  key: string,
  expiresIn = 3600,
) => {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
};

export const generatePresignedPutUrl = async (
  key: string,
  contentType: string,
  expiresIn = 3600,
) => {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
};

export const getFileInfo = async (key: string) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    const response = await r2Client.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error("Error getting file info:", error);
    return null;
  }
};

export const copyFile = async (sourceKey: string, destinationKey: string) => {
  try {
    const command = new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${encodeURIComponent(sourceKey)}`,
      Key: destinationKey,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error(
      `Error copying file from ${sourceKey} to ${destinationKey}:`,
      error,
    );
    throw error;
  }
};
