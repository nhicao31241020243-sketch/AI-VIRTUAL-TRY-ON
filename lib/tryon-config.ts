export const TRYON_CONFIG = {
  timeoutMs: 60_000,
  maxRequestBytes: 4.5 * 1024 * 1024,
  maxImageBytes: 4 * 1024 * 1024,
  rateLimit: {
    requests: 5,
    windowMs: 60 * 60_000,
  },
} as const;
