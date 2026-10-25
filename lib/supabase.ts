import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * 10MB in bytes: 10 * 1024 * 1024 = 10,485,760 bytes
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Permitted image MIME types and file extensions
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/x-icon",
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".bmp",
  ".ico",
];

/**
 * Validates that an attachment file is an image and does not exceed 10MB.
 */
export function validateAttachmentImage(file: {
  size: number;
  type?: string;
  name: string;
}): { valid: boolean; error?: string } {
  // 1. Size Validation (10MB max limit)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 10 MB.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "Cannot upload an empty file.",
    };
  }

  // 2. Image Type Validation
  const mimeType = (file.type || "").toLowerCase().trim();
  const name = (file.name || "").toLowerCase().trim();
  const hasImageExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
  const isImageMime = mimeType.startsWith("image/") || ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);

  if (!isImageMime && !hasImageExtension) {
    return {
      valid: false,
      error: "Only image files (JPEG, PNG, WebP, GIF, SVG, AVIF) are allowed.",
    };
  }

  return { valid: true };
}

/**
 * Retrieve Supabase Configuration from environment variables
 */
export function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";

  // Use SUPABASE_SECRET_KEY for server-side elevated storage operations,
  // falling back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    "attachments";

  return {
    url,
    key,
    bucket,
    isConfigured: Boolean(url && key),
  };
}

let cachedSupabaseClient: SupabaseClient | null = null;

/**
 * Returns an authenticated Supabase client for storage operations.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedSupabaseClient;
}

/**
 * Ensures the target Supabase Storage bucket exists.
 */
export async function ensureStorageBucket(supabase: SupabaseClient, bucketName: string): Promise<boolean> {
  try {
    const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName);
    if (bucket && !getError) {
      return true;
    }

    // Attempt to create public bucket if it does not exist
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: MAX_ATTACHMENT_SIZE_BYTES, // 10MB
      allowedMimeTypes: ["image/*"],
    });

    if (createError) {
      console.warn(`[Supabase Storage] Could not create bucket "${bucketName}":`, createError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Supabase Storage] Error checking bucket "${bucketName}":`, err);
    return false;
  }
}

/**
 * Uploads an image file to Supabase Storage and returns the public access URL.
 */
export async function uploadTaskAttachmentToSupabase(params: {
  taskId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  buffer: Buffer | Uint8Array;
}): Promise<{ fileUrl: string; filePath: string }> {
  // Validate first
  const validation = validateAttachmentImage({
    size: params.fileSize,
    type: params.fileType,
    name: params.fileName,
  });

  if (!validation.valid) {
    throw new Error(validation.error || "Invalid file");
  }

  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Supabase Storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in your .env file."
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client.");
  }

  // Ensure storage bucket exists
  await ensureStorageBucket(supabase, config.bucket);

  // Sanitize filename and create unique scoped storage path
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${params.taskId}/${uniquePrefix}-${sanitizedName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(config.bucket)
    .upload(filePath, params.buffer, {
      contentType: params.fileType || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Supabase Storage] Upload error:", uploadError);
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  // Generate public URL
  const { data: publicUrlData } = supabase.storage
    .from(config.bucket)
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded attachment.");
  }

  return {
    fileUrl: publicUrlData.publicUrl,
    filePath,
  };
}

/**
 * Removes an attachment file from Supabase Storage given its fileUrl or storage path.
 */
export async function deleteTaskAttachmentFromSupabase(fileUrlOrPath: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    let filePath = fileUrlOrPath;

    // If it's a full public URL, extract the relative storage path inside the bucket
    if (fileUrlOrPath.startsWith("http://") || fileUrlOrPath.startsWith("https://")) {
      const marker = `/storage/v1/object/public/${config.bucket}/`;
      const idx = fileUrlOrPath.indexOf(marker);
      if (idx !== -1) {
        filePath = decodeURIComponent(fileUrlOrPath.substring(idx + marker.length));
      } else {
        // Fallback: check if bucket name is in URL pathname
        const urlObj = new URL(fileUrlOrPath);
        const parts = urlObj.pathname.split(`/${config.bucket}/`);
        if (parts.length > 1) {
          filePath = decodeURIComponent(parts[1]);
        }
      }
    }

    if (!filePath) return false;

    const { error } = await supabase.storage.from(config.bucket).remove([filePath]);
    if (error) {
      console.warn("[Supabase Storage] Failed to remove file:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Supabase Storage] Delete exception:", err);
    return false;
  }
}
