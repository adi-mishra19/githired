import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

export async function generatePresignedUploadUrl(
  fileName: string,
  fileType: string,
  userId: string
): Promise<{ url: string; key: string }> {
  // Generate unique file key
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `resumes/${userId}/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    // Removed ACL to avoid CORS issues - bucket should have default ACL policy
  });

  // Generate presigned URL valid for 15 minutes
  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return { url, key };
}

export function getPublicUrl(key: string): string {
  const region = process.env.AWS_REGION || process.env.AWS_S3_REGION || "us-east-1";
  const bucket = process.env.AWS_S3_BUCKET || "";
  
  // Use CloudFront CDN URL if available, otherwise use S3 direct URL
  if (process.env.AWS_CLOUDFRONT_URL) {
    return `${process.env.AWS_CLOUDFRONT_URL}/${key}`;
  }
  
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3
 * Used for cleaning up old resumes or unused files
 */
export async function deleteFile(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    console.log(`Successfully deleted file: ${key}`);
  } catch (error) {
    console.error(`Failed to delete file ${key}:`, error);
    throw new Error(`Failed to delete file from S3: ${error}`);
  }
}

/**
 * Delete multiple files from S3 in batch
 * More efficient for cleaning up multiple files
 */
export async function deleteFiles(keys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  
  if (keys.length === 0) {
    return { deleted: [], failed: [] };
  }

  // S3 batch delete supports up to 1000 objects at once
  const batchSize = 1000;
  const deleted: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: false,
      },
    });

    try {
      const response = await s3Client.send(command);
      
      // Track successful deletions
      if (response.Deleted) {
        response.Deleted.forEach(item => {
          if (item.Key) deleted.push(item.Key);
        });
      }
      
      // Track failed deletions
      if (response.Errors) {
        response.Errors.forEach(error => {
          if (error.Key) failed.push(error.Key);
        });
      }
    } catch (error) {
      console.error(`Batch delete failed for keys:`, batch, error);
      failed.push(...batch);
    }
  }

  console.log(`Deleted ${deleted.length} files, ${failed.length} failed`);
  return { deleted, failed };
}

