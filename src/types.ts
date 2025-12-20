export interface ListenSnapshot {
  docId: string;
  userId: string;
  trackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  durationMs: number;
  playedAt: Date;
  playedAtEpochMs: number;
  expireAt: Date;
}

export interface IngestMetadata {
  lastFetchedAt?: number;
  lastRunAt?: Date;
  processedCount?: number;
  lastError?: string | null;
}

export interface UserIngestTarget {
  uid: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
}

export interface SpotifyRecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export interface SpotifyRecentlyPlayedResponse {
  items: SpotifyRecentlyPlayedItem[];
  next?: string | null;
}

export interface IngestStats {
  processedUsers: number;
  processedListens: number;
  errors: number;
  [key: string]: unknown;
}
