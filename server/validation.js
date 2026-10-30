import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(190).transform((email) => email.toLowerCase());
export const passwordSchema = z.string().min(12).max(200);
export const serviceTypes = ['website', 'application', 'server', 'database', 'other'];
export const roles = ['admin', 'it', 'viewer'];

export const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(roles),
});

export const credentialSchema = z.object({
  title: z.string().trim().min(1).max(160),
  service_type: z.enum(serviceTypes),
  url: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'URL harus menggunakan HTTP atau HTTPS.').optional().default(''),
  username: z.string().trim().max(190).optional().default(''),
  email: z.union([z.literal(''), emailSchema]).optional().default(''),
  password: z.string().max(4000).optional().default(''),
  notes: z.string().max(10000).optional().default(''),
  category_id: z.union([z.coerce.number().int().positive(), z.literal(''), z.null()]).optional().transform((value) => value || null),
});
