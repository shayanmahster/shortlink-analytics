import { z } from 'zod';

export const RESERVED_CODES = new Set([
  'api',
  'analytics',
  'admin',
  'dashboard',
  'login',
  'logout',
  'health',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  '_next',
]);

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid http:// or https:// URL' }
    ),
  customCode: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine(
      (val) => !val || /^[a-zA-Z0-9_-]{3,32}$/.test(val),
      { message: 'Custom alias must be 3-32 characters (letters, numbers, - or _)' }
    )
    .refine(
      (val) => !val || !RESERVED_CODES.has(val.toLowerCase()),
      { message: 'This alias is reserved and cannot be used' }
    ),
  title: z
    .string()
    .trim()
    .max(120, 'Title must be 120 characters or fewer')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  expiresAt: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
      },
      { message: 'Expiration date must be a valid future date' }
    ),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
