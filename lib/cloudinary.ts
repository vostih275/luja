import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import { randomUUID } from "crypto";
import { Readable } from "stream";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryEnabled() {
  return !!cloudName && !!apiKey && !!apiSecret;
}

if (isCloudinaryEnabled()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function extension(name: string) {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx) : "";
}

function uploadStream(
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<{ publicId: string; url: string }> {
  return new Promise((resolve, reject) => {
    const out = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      if (!result?.public_id || !result.secure_url) {
        return reject(new Error("Cloudinary upload returned no result"));
      }
      resolve({ publicId: result.public_id, url: result.secure_url });
    });
    Readable.from(buffer).pipe(out);
  });
}

export async function uploadBookFile(buffer: Buffer, originalName: string) {
  const publicId = `luja/books/${randomUUID()}${extension(originalName)}`;
  return uploadStream(buffer, {
    resource_type: "raw",
    type: "authenticated",
    public_id: publicId,
    overwrite: false,
  });
}

export async function uploadCoverImage(buffer: Buffer) {
  const publicId = `luja/covers/${randomUUID()}`;
  return uploadStream(buffer, {
    resource_type: "image",
    public_id: publicId,
    overwrite: false,
  });
}

export function getSignedBookUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
}

export async function deleteBookAsset(publicId: string, resourceType: "raw" | "image") {
  return new Promise<void>((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        type: resourceType === "raw" ? "authenticated" : "upload",
      },
      (err, result) => {
        if (err) return reject(err);
        if (result?.result !== "ok" && result?.result !== "not found") {
          return reject(new Error(`Cloudinary destroy failed: ${JSON.stringify(result)}`));
        }
        resolve();
      },
    );
  });
}
