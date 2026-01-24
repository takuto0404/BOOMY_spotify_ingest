import { z } from "zod";

const envSchema = z.object({
  TOKEN_BROKER_URL: z.string().url(),
  DEFAULT_USER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  SAFETY_WINDOW_MINUTES: z.coerce.number().int().nonnegative().default(120)
});

let configCache: {
  tokenBrokerUrl: string;
  userConcurrency: number;
  safetyWindowMs: number;
  spotifyPageLimit: number;
} | null = null;

export const getConfig = () => {
  if (configCache) return configCache;

  const parsed = envSchema.parse({
    TOKEN_BROKER_URL: process.env.TOKEN_BROKER_URL,
    DEFAULT_USER_CONCURRENCY: process.env.DEFAULT_USER_CONCURRENCY,
    SAFETY_WINDOW_MINUTES: process.env.SAFETY_WINDOW_MINUTES
  });

  configCache = {
    tokenBrokerUrl: parsed.TOKEN_BROKER_URL,
    userConcurrency: parsed.DEFAULT_USER_CONCURRENCY,
    safetyWindowMs: parsed.SAFETY_WINDOW_MINUTES * 60 * 1000,
    spotifyPageLimit: 50
  };

  return configCache;
};
