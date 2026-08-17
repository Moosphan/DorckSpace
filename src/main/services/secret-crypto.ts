import { safeStorage } from 'electron'

/**
 * At-rest encryption for secrets (API keys, tokens) using Electron's
 * `safeStorage`, which delegates to the macOS Keychain / OS credential store.
 *
 * Values are stored as base64 in TEXT columns; encryption degrades gracefully
 * to plaintext when no backing keychain is available (e.g. headless Linux).
 */

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

/** Encrypt a secret for storage. Returns plaintext when encryption is unavailable. */
export function encryptSecret(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  return safeStorage.encryptString(value).toString('base64')
}

/** Decrypt a secret produced by `encryptSecret`. Legacy plaintext is returned as-is. */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!safeStorage.isEncryptionAvailable()) return value
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    // Not ciphertext (legacy plaintext) or corrupt — return unchanged so the
    // row keeps working and is re-encrypted on its next write.
    return value
  }
}

/** True when `value` is already safeStorage ciphertext (vs legacy plaintext). */
export function isEncryptedSecret(value: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false
  try {
    safeStorage.decryptString(Buffer.from(value, 'base64'))
    return true
  } catch {
    return false
  }
}
