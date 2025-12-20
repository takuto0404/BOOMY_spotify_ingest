import express from "express";
import axios from "axios";
import { z } from "zod";

import { logger } from "./lib/logging.js";

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, "Missing SPOTIFY_CLIENT_ID"),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, "Missing SPOTIFY_CLIENT_SECRET"),
  SPOTIFY_REFRESH_TOKENS_JSON: z.string().default("{}"),
  TOKEN_BROKER_PORT: z.coerce.number().int().positive().default(3000)
});

const env = envSchema.parse({
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKENS_JSON: process.env.SPOTIFY_REFRESH_TOKENS_JSON,
  TOKEN_BROKER_PORT: process.env.TOKEN_BROKER_PORT
});

const refreshTokenSchema = z.record(z.string());
const refreshTokenMap = refreshTokenSchema.parse(
  JSON.parse(env.SPOTIFY_REFRESH_TOKENS_JSON)
);

const app = express();

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/token", async (req, res) => {
  const uid = typeof req.query.uid === "string" ? req.query.uid : undefined;

  if (!uid) {
    return res.status(400).json({ error: "Missing uid query parameter" });
  }

  const refreshToken = refreshTokenMap[uid];
  if (!refreshToken) {
    return res.status(404).json({ error: "Unknown uid" });
  }

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.SPOTIFY_CLIENT_ID,
      client_secret: env.SPOTIFY_CLIENT_SECRET
    });

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    const body = response.data as {
      access_token: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    res.json({
      access_token: body.access_token,
      expires_in: body.expires_in,
      scope: body.scope,
      token_type: body.token_type
    });
  } catch (error) {
    logger.error("Failed to refresh Spotify token", error, { uid });
    res.status(502).json({ error: "Failed to refresh token" });
  }
});

app.listen(env.TOKEN_BROKER_PORT, () => {
  logger.info("Token broker listening", { port: env.TOKEN_BROKER_PORT });
});
