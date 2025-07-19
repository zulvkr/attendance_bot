import { z } from "zod";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const envSchema = z.object({
  BOT_TOKEN: z.string().min(10),
  TOTP_SECRET: z.string().min(16),
  ADMIN_PASSWORD: z.string().min(8),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

function getEnv() {
  const env = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    TOTP_SECRET: process.env.TOTP_SECRET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  };
  if (env.NODE_ENV === "development") {
    console.log(env);
  }
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment variables: " + JSON.stringify(parsed.error.issues)
    );
  }
  return parsed.data;
}

export const ENV = getEnv();
