import crypto from "crypto";
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, hash] = storedHash.split(":");
    const testHash = crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch (err) {
    return false;
  }
}
const ENCRYPTION_ALGORITHM = "aes-256-cbc";
function getEncryptionKey() {
  const secret = process.env.DATABASE_ENCRYPTION_KEY || process.env.OAUTH_SESSION_SECRET || "ntl_dash_secure_default_627a192bc7b0";
  return crypto.createHash("sha256").update(secret).digest();
}
export function encryptData(plaintext) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("[Crypto Security] Encryption failed, returning raw fallback:", err.message);
    return plaintext;
  }
}
export function decryptData(cipherText) {
  if (!cipherText || !cipherText.includes(":")) {
    return cipherText;
  }
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 2 || parts[0].length !== 32) {
      return cipherText;
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("[Crypto Security] Decryption failed, assuming raw file content or old format:", err.message);
    return cipherText;
  }
}
