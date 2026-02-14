import pRetry from "p-retry";
import { addDays } from "date-fns";

import { getConfig } from "../config.js";
import { createUserQueue } from "../lib/rate-limit.js";
import { logger } from "../lib/logging.js";
import {
  flushWrites,
  getIngestMetadata,
  getUsersForIngestion,
  updateIngestMetadata,
  upsertListens,
  upsertTracks
} from "../services/firestore.js";
import { fetchSpotifyAccessToken } from "../services/token.js";
import { fetchRecentlyPlayed } from "../services/spotify.js";
import type {
  IngestStats,
  ListenSnapshot,
  SpotifyAlbumImage,
  SpotifyRecentlyPlayedItem,
  TrackSnapshot,
  UserIngestTarget
} from "../types.js";

const TTL_DAYS = 90;

export const runHourlyIngest = async (): Promise<IngestStats> => {
  const users = await getUsersForIngestion();
  const stats: IngestStats = { processedUsers: 0, processedListens: 0, errors: 0 };

  logger.info("Starting ingest run", { userCount: users.length });

  const config = getConfig();
  const queue = createUserQueue(config.userConcurrency);

  const userJobs = users.map((user) =>
    queue.add(async () => {
      try {
        const result = await pRetry(() => processSingleUser(user), {
          retries: 2,
          onFailedAttempt: (error) => {
            logger.warn("Retrying user ingest", {
              uid: user.uid,
              attempt: error.attemptNumber,
              retriesLeft: error.retriesLeft
            });
          }
        });

        stats.processedUsers += 1;
        stats.processedListens += result.processed;

        logger.info("User ingest complete", {
          uid: user.uid,
          processed: result.processed,
          newestPlayedAt: result.newestPlayedAt
        });
      } catch (error) {
        stats.errors += 1;
        await updateIngestMetadata(user.uid, {
          lastError: error instanceof Error ? error.message : String(error)
        });
        logger.error("User ingest failed", error, { uid: user.uid });
        throw error;
      }
    })
  );

  await Promise.allSettled(userJobs);
  await queue.onIdle();
  await flushWrites();

  logger.info("Finished ingest run", stats);

  return stats;
};

export const processSingleUser = async (user: UserIngestTarget) => {
  const { uid } = user;
  const meta = await getIngestMetadata(uid);
  const cursorBase = meta.lastFetchedAt ?? Date.now();
  const config = getConfig();
  const afterCursor = Math.max(0, cursorBase - config.safetyWindowMs);

  const accessToken = await fetchSpotifyAccessToken(uid);

  // Skip users who haven't authenticated with Spotify yet
  if (!accessToken) {
    logger.info("No access token available, skipping user", { uid });
    return { processed: 0, newestPlayedAt: afterCursor };
  }

  const items = await fetchRecentlyPlayed({
    accessToken,
    after: afterCursor
  });

  logger.info("Fetched recently played", {
    uid,
    afterCursor,
    safetyWindowMs: config.safetyWindowMs,
    itemCount: items.length
  });

  const snapshots = items
    .map((item) => toListenSnapshot(uid, item))
    .sort((a, b) => a.playedAtEpochMs - b.playedAtEpochMs);

  const tracks = buildTrackSnapshots(items);

  await upsertTracks(tracks);
  await upsertListens(uid, snapshots);

  const newestPlayedAt = snapshots.at(-1)?.playedAtEpochMs ?? afterCursor;

  await updateIngestMetadata(uid, {
    lastFetchedAt: newestPlayedAt,
    processedCount: snapshots.length,
    lastError: null
  });

  return {
    processed: snapshots.length,
    newestPlayedAt
  };
};

const toListenSnapshot = (
  uid: string,
  item: SpotifyRecentlyPlayedItem
): ListenSnapshot => {
  const playedAt = new Date(item.played_at);
  const track = item.track;

  return {
    docId: `${playedAt.getTime()}_${track.id}`,
    userId: uid,
    trackId: track.id,
    trackName: track.name,
    artistNames: track.artists.map((artist: { name: string }) => artist.name),
    albumName: track.album.name,
    durationMs: track.duration_ms,
    playedAt,
    playedAtEpochMs: playedAt.getTime(),
    expireAt: addDays(playedAt, TTL_DAYS)
  };
};

const buildTrackSnapshots = (
  items: SpotifyRecentlyPlayedItem[]
): TrackSnapshot[] => {
  const map = new Map<string, TrackSnapshot>();

  items.forEach((item) => {
    const track = item.track;
    if (map.has(track.id)) return;

    map.set(track.id, {
      trackId: track.id,
      trackName: track.name,
      artistNames: track.artists.map((artist) => artist.name),
      albumName: track.album.name,
      durationMs: track.duration_ms,
      albumImages: toAlbumImages(track.album.images)
    });
  });

  return Array.from(map.values());
};

const toAlbumImages = (images?: SpotifyAlbumImage[]) => {
  if (!images?.length) return null;

  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0)
  );

  const large = sorted[0]?.url ?? null;
  const medium = sorted[1]?.url ?? null;
  const small = sorted.at(-1)?.url ?? null;

  return { small, medium, large };
};
