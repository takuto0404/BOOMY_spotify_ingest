import { initializeApp } from "firebase-admin/app";
import "dotenv/config";

initializeApp();

/**
 * Cloud Functions エントリーポイント
 * 
 * エクスポートされた関数:
 * - scheduledIngest: 1時間ごとに全ユーザーのインジェストを実行
 * - triggerUserIngest: 認証済みユーザーが手動でインジェストを実行
 */

export { scheduledIngest } from "./scheduledIngest.js";
export { triggerUserIngest } from "./triggerUserIngest.js";
export { upsertUserProfile } from "./upsertUserProfile.js";
export {
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getUserProfileById
} from "./friends/callables.js";
