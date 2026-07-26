// ============================================================
// CLIENT-SIDE ENCRYPTION — TweetNaCl.js Wrapper
// All messages are encrypted BEFORE hitting the database
// The server NEVER sees plaintext messages
// ============================================================

import nacl from 'tweetnacl'
import {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64,
} from 'tweetnacl-util'

/**
 * Generate a new NaCl box key pair for asymmetric encryption.
 * The public key is shared; the secret key stays on the client.
 */
export function generateKeyPair(): {
  publicKey: Uint8Array
  secretKey: Uint8Array
} {
  return nacl.box.keyPair()
}

/**
 * Encrypt a plaintext message using NaCl box (authenticated encryption).
 *
 * @param message - Plaintext string to encrypt
 * @param theirPublicKey - Recipient's public key
 * @param mySecretKey - Sender's secret key
 * @returns Base64-encoded encrypted string (nonce + ciphertext)
 */
export function encryptMessage(
  message: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageUint8 = decodeUTF8(message)
  const encrypted = nacl.box(messageUint8, nonce, theirPublicKey, mySecretKey)

  if (!encrypted) {
    throw new Error('Encryption failed')
  }

  // Combine nonce + encrypted message into single array
  const fullMessage = new Uint8Array(nonce.length + encrypted.length)
  fullMessage.set(nonce)
  fullMessage.set(encrypted, nonce.length)

  return encodeBase64(fullMessage)
}

/**
 * Decrypt an encrypted message using NaCl box.
 *
 * @param encryptedMessage - Base64-encoded encrypted string (nonce + ciphertext)
 * @param theirPublicKey - Sender's public key
 * @param mySecretKey - Recipient's secret key
 * @returns Decrypted plaintext string
 */
export function decryptMessage(
  encryptedMessage: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): string {
  const fullMessage = decodeBase64(encryptedMessage)

  const nonce = fullMessage.slice(0, nacl.box.nonceLength)
  const ciphertext = fullMessage.slice(nacl.box.nonceLength)

  const decrypted = nacl.box.open(ciphertext, nonce, theirPublicKey, mySecretKey)

  if (!decrypted) {
    throw new Error('Decryption failed — invalid key or corrupted message')
  }

  return encodeUTF8(decrypted)
}

/**
 * Encode a Uint8Array key to a Base64 string for storage.
 * Keys are stored in localStorage keyed by deal_id.
 * NEVER send secret keys to the server.
 */
export function encodeKey(key: Uint8Array): string {
  return encodeBase64(key)
}

/**
 * Decode a Base64 string back to Uint8Array key.
 */
export function decodeKey(encoded: string): Uint8Array {
  return decodeBase64(encoded)
}

// ============================================================
// KEY MANAGEMENT UTILITIES
// These run ONLY in the browser — keys never touch the server
// ============================================================

const KEY_PREFIX = 'cybersec_keys_'

/**
 * Store encryption keys for a deal in localStorage.
 * Only call this from client-side code.
 */
export function storeKeysForDeal(
  dealId: string,
  publicKey: Uint8Array,
  secretKey: Uint8Array
): void {
  if (typeof window === 'undefined') {
    throw new Error('Key storage is only available in the browser')
  }

  const keyData = {
    publicKey: encodeKey(publicKey),
    secretKey: encodeKey(secretKey),
  }

  localStorage.setItem(`${KEY_PREFIX}${dealId}`, JSON.stringify(keyData))
}

/**
 * Retrieve encryption keys for a deal from localStorage.
 */
export function getKeysForDeal(
  dealId: string
): { publicKey: Uint8Array; secretKey: Uint8Array } | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(`${KEY_PREFIX}${dealId}`)
  if (!stored) return null

  try {
    const keyData = JSON.parse(stored) as {
      publicKey: string
      secretKey: string
    }
    return {
      publicKey: decodeKey(keyData.publicKey),
      secretKey: decodeKey(keyData.secretKey),
    }
  } catch {
    return null
  }
}

/**
 * Remove encryption keys for a deal from localStorage.
 */
export function removeKeysForDeal(dealId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${KEY_PREFIX}${dealId}`)
}
