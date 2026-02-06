import axios from "axios";

import type {
  SpotifyAudioFeatures,
  SpotifyRecentlyPlayedItem
} from "../types.js";
import { getConfig } from "../config.js";

const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played";
const AUDIO_FEATURES_ENDPOINT = "https://api.spotify.com/v1/audio-features";

interface FetchParams {
  accessToken: string;
  after?: number;
}

interface PageArgs extends FetchParams {
  before?: number;
}

const spotifyClient = axios.create({
  timeout: 10_000
});

const fetchPage = async ({ accessToken, after, before }: PageArgs) => {
  const url = new URL(RECENTLY_PLAYED_ENDPOINT);
  url.searchParams.set("limit", String(getConfig().spotifyPageLimit));
  if (after) {
    url.searchParams.set("after", String(after));
  }
  if (before) {
    url.searchParams.set("before", String(before));
  }

  const response = await spotifyClient.get(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data as {
    items: SpotifyRecentlyPlayedItem[];
  };
};

export const fetchRecentlyPlayed = async (
  params: FetchParams
): Promise<SpotifyRecentlyPlayedItem[]> => {
  const results: SpotifyRecentlyPlayedItem[] = [];
  const afterCursor = params.after;
  let beforeCursor: number | undefined;

  while (true) {
    const page = await fetchPage({
      accessToken: params.accessToken,
      after: beforeCursor ? undefined : afterCursor,
      before: beforeCursor
    });

    if (!page.items.length) {
      break;
    }

    const filtered = page.items.filter((item) => {
      if (!afterCursor) return true;
      return new Date(item.played_at).getTime() > afterCursor;
    });

    results.push(...filtered);

    if (page.items.length < getConfig().spotifyPageLimit) {
      break;
    }

    const oldest = page.items.at(-1);
    if (!oldest) {
      break;
    }

    beforeCursor = new Date(oldest.played_at).getTime();

    if (afterCursor && beforeCursor <= afterCursor) {
      break;
    }
  }

  return results;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const fetchAudioFeaturesByIds = async (
  params: { accessToken: string; trackIds: string[] }
): Promise<Map<string, SpotifyAudioFeatures>> => {
  const map = new Map<string, SpotifyAudioFeatures>();
  const uniqueIds = Array.from(new Set(params.trackIds)).filter(Boolean);

  if (!uniqueIds.length) return map;

  const batches = chunk(uniqueIds, 100);

  for (const ids of batches) {
    const url = new URL(AUDIO_FEATURES_ENDPOINT);
    url.searchParams.set("ids", ids.join(","));

    const response = await spotifyClient.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${params.accessToken}`
      }
    });

    const payload = response.data as {
      audio_features: (SpotifyAudioFeatures | null)[];
    };

    payload.audio_features.forEach((feature) => {
      if (!feature?.id) return;
      map.set(feature.id, feature);
    });
  }

  return map;
};
