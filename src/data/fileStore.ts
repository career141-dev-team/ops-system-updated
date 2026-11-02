import "server-only";

import fs from "node:fs";
import path from "node:path";

import { mimeFor } from "@/lib/files";

/**
 * Where the bytes actually go (15, Phase 1 step 23; Part F6).
 *
 * Two places, the same way the desk has two: Cloudflare R2 when it is
 * configured, which is what the server will use, and a folder on this machine
 * when it is not, which is what the laptop and the test-data preview use. The
 * registry row is identical either way, so nothing above this file knows or
 * cares.
 *
 * Nothing here is public. A download is a short-lived signed link in R2, and
 * our own screen reading the folder when the files are local.
 */

const LINK_MINUTES = 10;

function bucket(): string {
  return (process.env.R2_BUCKET ?? "").trim();
}

export function usingR2(): boolean {
  return Boolean(
    bucket() &&
      (process.env.R2_ENDPOINT ?? "").trim() &&
      (process.env.R2_ACCESS_KEY_ID ?? "").trim() &&
      (process.env.R2_SECRET_ACCESS_KEY ?? "").trim(),
  );
}

export function fileStoreInWords(): string {
  return usingR2()
    ? "Cloudflare R2, bucket " + bucket() + ". Links last " + LINK_MINUTES + " minutes."
    : "A folder on this machine. Nothing is in R2, so nothing can be seen from outside.";
}

const localDir = () => path.join(process.env.OPS_DATA_DIR || path.join(process.cwd(), ".data"), "files");

const localPath = (key: string) => path.join(localDir(), key.split("/").join(path.sep));

/** Set up once per process, the same way the TA System does it. */
async function r2() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function putBytes(key: string, bytes: Uint8Array, mime: string): Promise<void> {
  if (!usingR2()) {
    const where = localPath(key);
    fs.mkdirSync(path.dirname(where), { recursive: true });
    fs.writeFileSync(where, bytes);
    return;
  }
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await r2();
  await client.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: bytes, ContentType: mime }));
}

export async function readBytes(key: string): Promise<Uint8Array | null> {
  if (!usingR2()) {
    try {
      return fs.readFileSync(localPath(key));
    } catch {
      return null;
    }
  }
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await r2();
  try {
    const got = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const body = await got.Body?.transformToByteArray();
    return body ?? null;
  } catch {
    return null;
  }
}

/**
 * A link somebody can open, good for ten minutes.
 *
 * In R2 that is a signed link straight to the bucket, so the bytes never pass
 * through the app. Locally there is nothing to sign, so it is our own screen,
 * which asks who you are first.
 */
export async function linkFor(fileId: string, key: string, name: string): Promise<string> {
  if (!usingR2()) return "/api/files/" + fileId;
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await r2();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: mimeFor(name),
      ResponseContentDisposition: 'attachment; filename="' + name + '"',
    }),
    { expiresIn: LINK_MINUTES * 60 },
  );
}
