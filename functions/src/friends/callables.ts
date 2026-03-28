import {
  type CallableRequest,
  HttpsError,
  onCall
} from "firebase-functions/v2/https";

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

const runtime = {
  region: "asia-northeast1",
  timeoutSeconds: 60,
  memory: "256MiB" as const
};

const ensureAuthenticated = (request: CallableRequest<unknown>) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  return request.auth.uid;
};

export const sendFriendRequest = onCall(runtime, async (request) => {
  const actorUid = ensureAuthenticated(request);
  const parsed = sendFriendRequestInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid toUserId");
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

export const acceptFriendRequest = onCall(runtime, async (request) => {
  const actorUid = ensureAuthenticated(request);
  const parsed = requestIdInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid requestId");
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

export const cancelFriendRequest = onCall(runtime, async (request) => {
  const actorUid = ensureAuthenticated(request);
  const parsed = requestIdInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid requestId");
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

export const rejectFriendRequest = onCall(runtime, async (request) => {
  const actorUid = ensureAuthenticated(request);
  const parsed = requestIdInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid requestId");
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

export const removeFriend = onCall(runtime, async (request) => {
  const actorUid = ensureAuthenticated(request);
  const parsed = removeFriendInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid friendUserId");
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

export const getUserProfileById = onCall(runtime, async (request) => {
  ensureAuthenticated(request);
  const parsed = getUserProfileByIdInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid userId");
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
