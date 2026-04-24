import { describe, expect, it } from 'vitest'
import {
  createPasswordVerifier,
  decryptWithPassword,
  encryptWithPassword,
  verifyPassword
} from './crypto'

describe('crypto service', () => {
  it('encrypts and decrypts text with password', () => {
    const encrypted = encryptWithPassword('hello world', 'secret-123')
    const plain = decryptWithPassword(encrypted, 'secret-123')
    expect(plain).toBe('hello world')
  })

  it('rejects invalid password verifiers', () => {
    const verifier = createPasswordVerifier('journal-pass')
    expect(verifyPassword('journal-pass', verifier.salt, verifier.verifier)).toBe(true)
    expect(verifyPassword('wrong-pass', verifier.salt, verifier.verifier)).toBe(false)
  })
})
