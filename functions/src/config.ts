import { z } from "zod";

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  DEFAULT_USER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  SAFETY_WINDOW_MINUTES: z.coerce.number().int().nonnegative().default(129600)
});

let configCache: {
  spotifyClientId: string;
  spotifyClientSecret: string;
  userConcurrency: number;
  safetyWindowMs: number;
  spotifyPageLimit: number;
} | null = null;

export const getConfig = () => {
  if (configCache) return configCache;

  const parsed = envSchema.parse({
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    DEFAULT_USER_CONCURRENCY: process.env.DEFAULT_USER_CONCURRENCY,
    SAFETY_WINDOW_MINUTES: process.env.SAFETY_WINDOW_MINUTES
  });

  configCache = {
    spotifyClientId: parsed.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: parsed.SPOTIFY_CLIENT_SECRET,
    userConcurrency: parsed.DEFAULT_USER_CONCURRENCY,
    safetyWindowMs: parsed.SAFETY_WINDOW_MINUTES * 60 * 1000,
    spotifyPageLimit: 50
  };

  return configCache;
};
