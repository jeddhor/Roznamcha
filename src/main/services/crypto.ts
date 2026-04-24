import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, timingSafeEqual, createHash } from 'crypto'

const KEY_SIZE = 32
const IV_SIZE = 12
const PBKDF2_ITERATIONS = 210000
const DIGEST = 'sha512'

export interface EncryptedPayload {
  cipherText: string
  iv: string
  authTag: string
  salt?: string
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_SIZE, DIGEST)
}

export function encryptWithPassword(plainText: string, password: string): EncryptedPayload {
  const salt = randomBytes(16)
  const key = deriveKey(password, salt)
  const encrypted = encryptWithKey(plainText, key)
  return {
    ...encrypted,
    salt: salt.toString('base64')
  }
}

export function decryptWithPassword(payload: EncryptedPayload, password: string): string {
  if (!payload.salt) {
    throw new Error('Missing salt for password encryption')
  }
  const key = deriveKey(password, Buffer.from(payload.salt, 'base64'))
  return decryptWithKey(payload, key)
}

export function encryptWithKey(plainText: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(IV_SIZE)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    cipherText: cipherText.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  }
}

export function decryptWithKey(payload: EncryptedPayload, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const plainText = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, 'base64')),
    decipher.final()
  ])

  return plainText.toString('utf8')
}

export function createPasswordVerifier(password: string): { salt: string; verifier: string } {
  const salt = randomBytes(16)
  const key = deriveKey(password, salt)
  const verifier = createHash('sha256').update(key).digest('base64')
  return { salt: salt.toString('base64'), verifier }
}

export function verifyPassword(password: string, saltB64: string, expectedVerifier: string): boolean {
  const key = deriveKey(password, Buffer.from(saltB64, 'base64'))
  const digest = createHash('sha256').update(key).digest()
  const expected = Buffer.from(expectedVerifier, 'base64')
  if (digest.length !== expected.length) {
    return false
  }
  return timingSafeEqual(digest, expected)
}

export function deriveSessionKey(password: string, saltB64: string): Buffer {
  return deriveKey(password, Buffer.from(saltB64, 'base64'))
}
