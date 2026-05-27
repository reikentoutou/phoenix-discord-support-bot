import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_ENTRY_CHANNEL_ID: z.string().min(1),
  DISCORD_STAFF_CHANNEL_ID: z.string().min(1),
  DISCORD_STAFF_ROLE_ID: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().default("deepseek-v4-flash"),
  SQLITE_PATH: z.string().default("./data/bot.sqlite"),
  KNOWLEDGE_DIR: z.string().default("./knowledge"),
  MIN_RETRIEVAL_SCORE: z.coerce.number().min(0).max(1).default(0.25),
  MAX_CONTEXT_CHUNKS: z.coerce.number().int().min(1).max(10).default(4)
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
