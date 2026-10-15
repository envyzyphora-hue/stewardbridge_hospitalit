import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function safeKey(key: string) {
  return key.replace(/^\/+/, "").replace(/\.\.(?=\/|$)/g, "");
}

function storageConfig() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Object storage is not configured. Set STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY.");
  }
  return {
    bucket,
    client: new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function putDocument(key: string, body: ArrayBuffer | ArrayBufferView, metadata: { contentType: string; fileName: string }) {
  const { client, bucket } = storageConfig();
  const bytes = body instanceof ArrayBuffer
    ? new Uint8Array(body)
    : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: safeKey(key),
    Body: bytes,
    ContentType: metadata.contentType,
    ContentDisposition: `inline; filename="${metadata.fileName.replace(/["\\]/g, "_")}"`,
    ServerSideEncryption: "AES256",
  }));
}

export async function getDocument(key: string) {
  const { client, bucket } = storageConfig();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
  return {
    body: object.Body?.transformToWebStream(),
    httpMetadata: { contentType: object.ContentType },
  };
}

export async function deleteDocumentObject(key: string) {
  const { client, bucket } = storageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
}
