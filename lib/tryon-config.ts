export const TRYON_CONFIG = {
  defaultModel: 'cuuupid/idm-vton',
  timeoutMs: 90_000,
  maxRequestBytes: 4 * 1024 * 1024,
  maxImageBytes: 1024 * 1024,
  rateLimit: {
    requests: 5,
    windowMs: 60 * 60_000,
  },
  inputFields: {
    personImage: 'human_img',
    garmentImage: 'garm_img',
    garmentDescription: 'garment_des',
    category: 'category',
  },
} as const;
