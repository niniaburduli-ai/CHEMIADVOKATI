import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary env vars are not set");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadResult = {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  resourceType: string;
};

/** Upload a file buffer to Cloudinary via stream. Resolves to a trimmed result. */
export function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "chemiadvokati",
        resource_type: "auto",
        filename_override: options.filename,
        use_filename: Boolean(options.filename),
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

/** Delete an asset from Cloudinary by public id. */
export async function destroyAsset(
  publicId: string,
  resourceType = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };
