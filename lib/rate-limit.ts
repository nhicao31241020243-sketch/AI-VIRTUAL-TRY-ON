export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

interface RateLimitOptions {
  requests: number;
  windowMs: number;
}

// In-memory: không bền trên serverless (mỗi instance có bộ nhớ riêng, mất khi cold start).
// Để chạy production, viết một RateLimiter dùng Upstash Redis / Vercel KV và trả về trong createRateLimiter().
export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, number[]>();

  constructor(private readonly options: RateLimitOptions) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const cutoff = now - this.options.windowMs;
    const recent = (this.entries.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

    if (recent.length >= this.options.requests) {
      this.entries.set(key, recent);
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((recent[0] + this.options.windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.entries.set(key, recent);
    if (this.entries.size > 1000) {
      for (const [entryKey, timestamps] of this.entries) {
        if (timestamps.every((timestamp) => timestamp <= cutoff)) this.entries.delete(entryKey);
      }
    }
    return { allowed: true };
  }
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new MemoryRateLimiter(options);
}
