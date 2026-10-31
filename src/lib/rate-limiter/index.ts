interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimiterConfig

  constructor(config: RateLimiterConfig) {
    this.config = config
  }

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetIn: this.config.windowMs,
      }
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    }
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Singleton instances
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts
})

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
})

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup()
    apiRateLimiter.cleanup()
  }, 5 * 60 * 1000)
}
