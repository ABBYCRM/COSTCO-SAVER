import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

let client = null;

function config() {
  const region = process.env.SPACES_REGION;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw Object.assign(new Error('DigitalOcean Spaces is not configured'), { status: 503 });
  }
  return { region, bucket, accessKeyId, secretAccessKey };
}

function s3() {
  if (client) return client;
  const cfg = config();
  client = new S3Client({
    region: cfg.region,
    endpoint: `https://${cfg.region}.digitaloceanspaces.com`,
    forcePathStyle: false,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return client;
}

export function newStorageKey(userId, kind, fileName) {
  const safe = String(fileName || 'upload.bin')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-120);
  return `private/${userId}/${kind}/${randomUUID()}-${safe}`;
}

export async function putObject({ key, body, contentType, contentLength }) {
  const cfg = config();
  await s3().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      ContentLength: contentLength,
      ACL: 'private',
    }),
  );
}

export async function getObject(key) {
  const cfg = config();
  return s3().send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

export async function deleteObject(key) {
  const cfg = config();
  await s3().send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}
