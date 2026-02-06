import axios from "axios";
import { z } from "zod";

import { getConfig } from "../config.js";

const tokenResponseSchema = z.object({
  access_token: z.string()
});

export const fetchSpotifyAccessToken = async (uid: string): Promise<string | null> => {
  try {
    const response = await axios.get(getConfig().tokenBrokerUrl, {
      params: { uid },
      timeout: 10_000
    });

    const parsed = tokenResponseSchema.parse(response.data);
    return parsed.access_token;
  } catch (error) {
    // 404 means user hasn't authenticated with Spotify yet
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    // Log detailed error information for debugging
    if (axios.isAxiosError(error)) {
      console.error("Token fetch failed:", {
        uid,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: getConfig().tokenBrokerUrl
      });
    }
    // Re-throw other errors (network issues, 502, etc.)
    throw error;
  }
};
