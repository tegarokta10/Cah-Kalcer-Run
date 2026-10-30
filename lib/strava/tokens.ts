import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const encoded = process.env.STRAVA_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Strava token encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Strava token encryption key must decode to 32 bytes.");
  return key;
}

export function encryptStravaToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptStravaToken(value: string) {
  const [version, ivPart, tagPart, ciphertextPart] = value.split(":");
  if (version !== "v1" || !ivPart || !tagPart || !ciphertextPart) throw new Error("Stored Strava token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
