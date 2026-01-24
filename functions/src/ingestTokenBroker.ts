import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

/**
 * Ingest専用のシンプルなToken Broker
 * 
 * Firestoreに保存されたリフレッシュトークンを使って、
 * Spotify APIからアクセストークンを取得
 * 
 * GET /ingestTokenBroker?uid=xxx
 */
export const ingestTokenBroker = functions
    .region("asia-northeast1")
    .runWith({
        timeoutSeconds: 30,
        memory: "256MB",
    })
    .https.onRequest(async (req, res) => {
        // GET /token?uid=xxx の形式に対応
        const uid = typeof req.query.uid === "string" ? req.query.uid : undefined;

        if (!uid) {
            res.status(400).json({ error: "Missing uid query parameter" });
            return;
        }

        try {
            const db = getFirestore();

            // Firestoreからリフレッシュトークンを取得
            // 既存のgetSpotifyAccessTokenと同じ場所を参照
            const tokenDoc = await db.collection("users").doc(uid).collection("tokens").doc("spotify").get();

            if (!tokenDoc.exists) {
                res.status(404).json({ error: "No stored refresh token for this user" });
                return;
            }

            const refreshToken = tokenDoc.data()?.refresh_token;
            if (!refreshToken) {
                res.status(404).json({ error: "No stored refresh token for this user" });
                return;
            }

            // Spotify APIでリフレッシュトークンをアクセストークンに変換
            const clientId = process.env.SPOTIFY_CLIENT_ID || functions.config().spotify?.client_id;
            const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || functions.config().spotify?.client_secret;

            if (!clientId || !clientSecret) {
                throw new Error("Spotify credentials not configured");
            }

            const params = new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            });

            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

            const response = await axios.post(
                "https://accounts.spotify.com/api/token",
                params.toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: `Basic ${authHeader}`,
                    },
                }
            );

            // 新しいリフレッシュトークンが返された場合は保存
            if (response.data.refresh_token) {
                await tokenDoc.ref.update({
                    refresh_token: response.data.refresh_token,
                });
            }

            // アクセストークンを返す
            res.json({
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
            });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.error("Spotify API error:", {
                    status: error.response.status,
                    data: error.response.data,
                });
            } else {
                console.error("Failed to get access token:", error);
            }
            res.status(502).json({ error: "Failed to get access token" });
        }
    });
