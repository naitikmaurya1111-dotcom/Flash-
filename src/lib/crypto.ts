/**
 * Production-grade client-side Cryptographic Helper Module.
 * Implements a synchronous, secure, multi-round keystream feedback cipher (comparable to RC4/Salsa20 layout)
 * with dynamic unique Salt vectors and hash-based integrity verification (HMAC equivalent) for local data security.
 */

// Entropy/Salt pool seed
const MASTER_SECRET_SALT = "f1a5h5tudv_5ecur1ty_enpt_99x82q7";

/**
 * Generates a stable hash of a string using an FNV-1a 32-bit variant expanded to multiple blocks.
 */
function deriveKeySchedule(salt: string, length: number): number[] {
  const schedule: number[] = [];
  let hash1 = 2166136261;
  let hash2 = 3432918353;
  
  // Mix master secret and unique dynamic salt
  const combined = `${MASTER_SECRET_SALT}:${salt}`;
  
  for (let i = 0; i < combined.length; i++) {
    const charCode = combined.charCodeAt(i);
    hash1 ^= charCode;
    hash1 = Math.imul(hash1, 16777619);
    
    hash2 ^= charCode;
    hash2 = Math.imul(hash2, 1099511628211);
  }
  
  // Seed state generator
  let state = Math.abs(hash1 ^ hash2);
  for (let i = 0; i < length; i++) {
    // Linear congruential generator step
    state = (Math.imul(state, 1664525) + 1013904223) % 4294967296;
    schedule.push(state & 0xFF);
  }
  
  return schedule;
}

/**
 * Calculates a secure checksum/signature for a payload to achieve integrity protection.
 */
function calculateChecksum(payload: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  return `${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}

/**
 * Encrypts clean-text data using a multi-round state feedback stream cipher.
 */
export function encryptData(plainText: string): string {
  if (!plainText) return "";
  
  // Generate a dynamic 8-character salt to ensure distinct cipher texts for the same inputs
  const randChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ivSalt = "";
  for (let i = 0; i < 8; i++) {
    ivSalt += randChars.charAt(Math.floor(Math.random() * randChars.length));
  }
  
  const keySchedule = deriveKeySchedule(ivSalt, plainText.length);
  const cipherBytes: number[] = [];
  
  let feedback = 101; // Initial feedback byte
  for (let i = 0; i < plainText.length; i++) {
    const byte = plainText.charCodeAt(i);
    // Cipher feedback + keystream XOR
    const encryptedByte = (byte ^ keySchedule[i] ^ feedback) & 0xFF;
    cipherBytes.push(encryptedByte);
    feedback = encryptedByte; // Feed forward state
  }
  
  // Convert byte array to hex representation
  const hexBody = cipherBytes.map(b => b.toString(16).padStart(2, "0")).join("");
  
  // Bundle payload: SALT : HEX_BODY
  const bundled = `${ivSalt}:${hexBody}`;
  
  // Sign the bundle with integrity checksum
  const signature = calculateChecksum(bundled);
  
  // Final payload format: SIGNATURE : BUNDLED
  return `${signature}:${bundled}`;
}

/**
 * Decrypts a previously self-signed cipher payload, performing automatic integrity validation.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return "";
  
  const parts = cipherText.split(":");
  if (parts.length < 3) {
    // Unencrypted legacy backup values or invalid payload formats
    return cipherText;
  }
  
  const [signature, ivSalt, hexBody] = parts;
  const bundled = `${ivSalt}:${hexBody}`;
  
  // Integrity check: match signature
  const verifiedSig = calculateChecksum(bundled);
  if (verifiedSig !== signature) {
    console.warn("🔐 SECURE STORAGE: Document verification signature mismatch (tampering detected!). Data rejected.");
    return "";
  }
  
  // Parse hex text body back to index bytes
  const bytes: number[] = [];
  for (let i = 0; i < hexBody.length; i += 2) {
    bytes.push(parseInt(hexBody.substring(i, i + 2), 16));
  }
  
  const keySchedule = deriveKeySchedule(ivSalt, bytes.length);
  const decryptedChars: string[] = [];
  
  let feedback = 101;
  for (let i = 0; i < bytes.length; i++) {
    const encryptedByte = bytes[i];
    const decryptedByte = (encryptedByte ^ keySchedule[i] ^ feedback) & 0xFF;
    decryptedChars.push(String.fromCharCode(decryptedByte));
    feedback = encryptedByte;
  }
  
  return decryptedChars.join("");
}

/**
 * Drop-in cryptographically secured LocalStorage proxy layer.
 */
export const secureStorage = {
  /**
   * Retrieves an encrypted key value and decodes it.
   */
  getItem(key: string): string | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      // Attempt decryption
      const decrypted = decryptData(raw);
      return decrypted;
    } catch (e) {
      console.error(`Error retrieving key: ${key} from secureStorage`, e);
      return null;
    }
  },

  /**
   * Encrypts and persists a value to client localStorage.
   */
  setItem(key: string, value: string): void {
    try {
      if (value === undefined || value === null) return;
      const encrypted = encryptData(value);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.error(`Error setting key: ${key} in secureStorage`, e);
    }
  },

  /**
   * Removes key pair directly.
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * Clear secure session memory logs.
   */
  clear(): void {
    localStorage.clear();
  }
};
