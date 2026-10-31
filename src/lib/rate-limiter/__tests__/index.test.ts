import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '../index'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3,
    })
  })

  it('should allow requests within limit', () => {
    const result1 = rateLimiter.check('test-key')
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(2)

    const result2 = rateLimiter.check('test-key')
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(1)

    const result3 = rateLimiter.check('test-key')
    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(0)
  })

  it('should block requests exceeding limit', () => {
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')

    const result = rateLimiter.check('test-key')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should reset after window expires', async () => {
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100))

    const result = rateLimiter.check('test-key')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('should track different keys independently', () => {
    rateLimiter.check('key-1')
    rateLimiter.check('key-1')
    rateLimiter.check('key-1')

    const result1 = rateLimiter.check('key-1')
    expect(result1.allowed).toBe(false)

    const result2 = rateLimiter.check('key-2')
    expect(result2.allowed).toBe(true)
  })

  it('should reset specific key', () => {
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')
    rateLimiter.check('test-key')

    rateLimiter.reset('test-key')

    const result = rateLimiter.check('test-key')
    expect(result.allowed).toBe(true)
  })

  it('should cleanup expired entries', async () => {
    rateLimiter.check('key-1')
    rateLimiter.check('key-2')

    await new Promise(resolve => setTimeout(resolve, 1100))

    rateLimiter.cleanup()

    // After cleanup, both keys should be reset
    const result1 = rateLimiter.check('key-1')
    expect(result1.remaining).toBe(2)

    const result2 = rateLimiter.check('key-2')
    expect(result2.remaining).toBe(2)
  })
})
