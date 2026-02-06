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

export interface AlbumImages {
  small: string | null;
  medium: string | null;
  large: string | null;
}

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  key: number;
  mode: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
}

export interface TrackSnapshot {
  trackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  durationMs: number;
  albumImages: AlbumImages | null;
  audioFeatures: AudioFeatures | null;
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
  images?: SpotifyAlbumImage[];
}

export interface SpotifyAlbumImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  key: number;
  mode: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
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
