import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
const directory = path.resolve(
  process.env.LOCAL_UPLOAD_DIR || "../../.local/uploads",
);
function safePath(key: string) {
  if (!/^[a-f0-9-]+\.webp$/.test(key)) throw Error("Invalid object key");
  return path.join(directory, key);
}
const local: Storage = {
  async put(key, data) {
    await mkdir(directory, { recursive: true });
    await writeFile(safePath(key), data);
  },
  async get(key) {
    return readFile(safePath(key));
  },
  async remove(key) {
    await unlink(safePath(key)).catch(() => {});
  },
};
function s3(): Storage {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw Error("S3_BUCKET is required");
  const client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
  return {
    async put(Key, Body) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key,
          Body,
          ContentType: "image/webp",
        }),
      );
    },
    async get(Key) {
      const data = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key }),
      );
      if (!data.Body) throw Error("Object missing");
      return Buffer.from(await data.Body.transformToByteArray());
    },
    async remove(Key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
    },
  };
}
if (env.NODE_ENV === "production" && process.env.STORAGE_PROVIDER !== "s3")
  throw Error("Production uploads require S3-compatible object storage");
export const storage = process.env.STORAGE_PROVIDER === "s3" ? s3() : local;
