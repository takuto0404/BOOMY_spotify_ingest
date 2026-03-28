import * as functions from "firebase-functions";

import { logger } from "../lib/logging.js";
import { toHttpsError } from "./errors.js";
import {
  getUserProfileByIdInputSchema,
  removeFriendInputSchema,
  requestIdInputSchema,
  sendFriendRequestInputSchema
} from "./schema.js";
import {
  acceptFriendRequest as acceptFriendRequestService,
  cancelFriendRequest as cancelFriendRequestService,
  getUserProfileById as getUserProfileByIdService,
  rejectFriendRequest as rejectFriendRequestService,
  removeFriend as removeFriendService,
  sendFriendRequest as sendFriendRequestService
} from "./service.js";

const runtime = functions.region("asia-northeast1").runWith({
  timeoutSeconds: 60,
  memory: "256MB"
});

const ensureAuthenticated = (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  return context.auth.uid;
};

export const sendFriendRequest = runtime.https.onCall(async (data, context) => {
  const actorUid = ensureAuthenticated(context);
  const parsed = sendFriendRequestInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid toUserId");
  }

  try {
    const result = await sendFriendRequestService(actorUid, parsed.data.toUserId);
    logger.info("sendFriendRequest completed", { actorUid, toUserId: parsed.data.toUserId });
    return result;
  } catch (error) {
    logger.error("sendFriendRequest failed", error, {
      actorUid,
      toUserId: parsed.data.toUserId
    });
    throw toHttpsError(error);
  }
});

export const acceptFriendRequest = runtime.https.onCall(async (data, context) => {
  const actorUid = ensureAuthenticated(context);
  const parsed = requestIdInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid requestId");
  }

  try {
    const result = await acceptFriendRequestService(actorUid, parsed.data.requestId);
    logger.info("acceptFriendRequest completed", {
      actorUid,
      requestId: parsed.data.requestId
    });
    return result;
  } catch (error) {
    logger.error("acceptFriendRequest failed", error, {
      actorUid,
      requestId: parsed.data.requestId
    });
    throw toHttpsError(error);
  }
});

export const cancelFriendRequest = runtime.https.onCall(async (data, context) => {
  const actorUid = ensureAuthenticated(context);
  const parsed = requestIdInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid requestId");
  }

  try {
    const result = await cancelFriendRequestService(actorUid, parsed.data.requestId);
    logger.info("cancelFriendRequest completed", {
      actorUid,
      requestId: parsed.data.requestId
    });
    return result;
  } catch (error) {
    logger.error("cancelFriendRequest failed", error, {
      actorUid,
      requestId: parsed.data.requestId
    });
    throw toHttpsError(error);
  }
});

export const rejectFriendRequest = runtime.https.onCall(async (data, context) => {
  const actorUid = ensureAuthenticated(context);
  const parsed = requestIdInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid requestId");
  }

  try {
    const result = await rejectFriendRequestService(actorUid, parsed.data.requestId);
    logger.info("rejectFriendRequest completed", {
      actorUid,
      requestId: parsed.data.requestId
    });
    return result;
  } catch (error) {
    logger.error("rejectFriendRequest failed", error, {
      actorUid,
      requestId: parsed.data.requestId
    });
    throw toHttpsError(error);
  }
});

export const removeFriend = runtime.https.onCall(async (data, context) => {
  const actorUid = ensureAuthenticated(context);
  const parsed = removeFriendInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid friendUserId");
  }

  try {
    const result = await removeFriendService(actorUid, parsed.data.friendUserId);
    logger.info("removeFriend completed", {
      actorUid,
      friendUserId: parsed.data.friendUserId
    });
    return result;
  } catch (error) {
    logger.error("removeFriend failed", error, {
      actorUid,
      friendUserId: parsed.data.friendUserId
    });
    throw toHttpsError(error);
  }
});

export const getUserProfileById = runtime.https.onCall(async (data, context) => {
  ensureAuthenticated(context);
  const parsed = getUserProfileByIdInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid userId");
  }

  try {
    const result = await getUserProfileByIdService(parsed.data.userId);
    logger.info("getUserProfileById completed", { userId: parsed.data.userId });
    return result;
  } catch (error) {
    logger.error("getUserProfileById failed", error, { userId: parsed.data.userId });
    throw toHttpsError(error);
  }
});
