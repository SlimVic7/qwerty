import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  SUPABASE_URL: z.string().url("Must be a valid URL").optional(),
  SUPABASE_SECRET_KEY: z.string().min(1, "Secret key is required").optional(),
  GEMINI_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  // In a real strict environment we would throw, but for AI Studio preview
  // we will warn and proceed so the app shell still loads.
}

export const env = _env.success ? _env.data : {} as z.infer<typeof envSchema>;
