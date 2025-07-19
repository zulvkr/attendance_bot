import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  BOT_TOKEN: z.string().min(10),
  TOTP_SECRET: z.string().min(16),
});

function getEnv() {
  const env = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    TOTP_SECRET: process.env.TOTP_SECRET,
  };
  console.log("Environment Variables:", env);
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment variables: " + JSON.stringify(parsed.error.issues)
    );
  }
  return parsed.data;
}

export const ENV = getEnv();
