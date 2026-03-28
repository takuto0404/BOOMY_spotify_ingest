import axios from "axios";
import { z } from "zod";
import { getFirestore } from "firebase-admin/firestore";

import { getConfig } from "../config.js";

const tokenResponseSchema = z.object({
  access_token: z.string()
});

export const fetchSpotifyAccessToken = async (uid: string): Promise<string | null> => {
  try {
    const tokenDoc = await getFirestore()
      .collection("users")
      .doc(uid)
      .collection("tokens")
      .doc("spotify")
      .get();

    if (!tokenDoc.exists) {
      return null;
    }

    const refreshToken = tokenDoc.data()?.refresh_token;
    if (!refreshToken) {
      return null;
    }

    const { spotifyClientId, spotifyClientSecret } = getConfig();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
    const authHeader = Buffer.from(
      `${spotifyClientId}:${spotifyClientSecret}`
    ).toString("base64");

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authHeader}`
        },
        timeout: 10_000
      }
    );

    const parsed = tokenResponseSchema.parse(response.data);

    if (typeof response.data.refresh_token === "string" && response.data.refresh_token) {
      await tokenDoc.ref.update({
        refresh_token: response.data.refresh_token
      });
    }

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
        data: error.response?.data
      });
    }
    // Re-throw other errors (network issues, 502, etc.)
    throw error;
  }
};
