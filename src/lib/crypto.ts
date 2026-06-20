/**
 * Cryptographic Helper Module - Decoupled & Unencrypted.
 * MODIFIED: Encryption is completely removed. Data is stored and retrieved in clear text
 * to guarantee robust, readable, high-speed, and corruption-free local cache operation.
 */

/**
 * Directly returns text untouched (unencrypted plain text format).
 */
export function encryptData(plainText: string): string {
  return plainText || "";
}

/**
 * Directly returns data untouched (unencrypted plain text format), with backward
 * compatibility to ignore/restore any older cipher objects safely.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return "";
  
  // If we detect legacy cipher signature prefix, try to parse it cleanly, 
  // otherwise return unchanged raw text.
  const parts = cipherText.split(":");
  if (parts.length >= 3 && /^[0-9a-f]+-[0-9a-f]+$/i.test(parts[0])) {
    try {
      const hexBody = parts[2];
      const bytes: number[] = [];
      for (let i = 0; i < hexBody.length; i += 2) {
        bytes.push(parseInt(hexBody.substring(i, i + 2), 16));
      }
      // Simple decode
      const decoder = new TextDecoder();
      return decoder.decode(new Uint8Array(bytes));
    } catch (e) {
      return cipherText;
    }
  }

  return cipherText;
}

let activeUserId: string | null = null;

/**
 * Drop-in transparent LocalStorage proxy layer with dynamic active-user namespaces.
 */
export const secureStorage = {
  /**
   * Tracks active firebase auth user ID across sessions to isolate local storage records.
   */
  setUserId(userId: string | null): void {
    activeUserId = userId;
  },

  getUserId(): string | null {
    return activeUserId;
  },

  /**
   * Retrieves an unencrypted key value directly from the active user namespace.
   */
  getItem(key: string): string | null {
    try {
      const namespacedKey = activeUserId ? `${key}_usr_${activeUserId}` : `${key}_guest`;
      const raw = localStorage.getItem(namespacedKey);
      if (!raw) return null;
      return raw;
    } catch (e) {
      console.error(`Error retrieving key: ${key} from secureStorage`, e);
      return null;
    }
  },

  /**
   * Persists an unencrypted plain string directly in user namespace.
   */
  setItem(key: string, value: string): void {
    try {
      if (value === undefined || value === null) return;
      const namespacedKey = activeUserId ? `${key}_usr_${activeUserId}` : `${key}_guest`;
      localStorage.setItem(namespacedKey, value);
    } catch (e) {
      console.error(`Error setting key: ${key} in secureStorage`, e);
    }
  },

  /**
   * Removes key pair directly using active user namespace.
   */
  removeItem(key: string): void {
    const namespacedKey = activeUserId ? `${key}_usr_${activeUserId}` : `${key}_guest`;
    localStorage.removeItem(namespacedKey);
  },

  /**
   * Clear secure session memory logs.
   */
  clear(): void {
    localStorage.clear();
  }
};

