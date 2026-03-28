import { FieldValue, getFirestore, Transaction } from "firebase-admin/firestore";

import { FriendAppError } from "./errors.js";
import type { FriendRequestDoc, UserProfileDoc } from "./schema.js";

const USERS_COLLECTION = "users";
const FRIENDS_SUBCOLLECTION = "friends";
const FRIEND_REQUESTS_COLLECTION = "friendRequests";

const db = () => getFirestore();

const userRef = (uid: string) => db().collection(USERS_COLLECTION).doc(uid);
const friendRef = (uid: string, friendUid: string) =>
  userRef(uid).collection(FRIENDS_SUBCOLLECTION).doc(friendUid);
const friendRequestRef = (requestId: string) =>
  db().collection(FRIEND_REQUESTS_COLLECTION).doc(requestId);
const friendRequestPairQuery = (fromUserId: string, toUserId: string) =>
  db()
    .collection(FRIEND_REQUESTS_COLLECTION)
    .where("fromUserId", "==", fromUserId)
    .where("toUserId", "==", toUserId);

const hasPendingRequest = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
  docs.some((doc) => {
    const data = doc.data() as Partial<FriendRequestDoc>;
    return data.status === "pending";
  });

const cancelRequestIfNeeded = (
  tx: Transaction,
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
) => {
  docs.forEach((doc) => {
    const data = doc.data() as Partial<FriendRequestDoc>;
    if (data.status === "pending" || data.status === "accepted") {
      tx.update(doc.ref, {
        status: "canceled",
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });
};

export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
  if (fromUserId === toUserId) {
    throw new FriendAppError("invalid_state", "Cannot send friend request to yourself");
  }

  return db().runTransaction(async (tx) => {
    const [toUserSnap, existingFriendSnap, reverseFriendSnap, forwardReqSnap, reverseReqSnap] =
      await Promise.all([
        tx.get(userRef(toUserId)),
        tx.get(friendRef(fromUserId, toUserId)),
        tx.get(friendRef(toUserId, fromUserId)),
        tx.get(friendRequestPairQuery(fromUserId, toUserId)),
        tx.get(friendRequestPairQuery(toUserId, fromUserId))
      ]);

    if (!toUserSnap.exists) {
      throw new FriendAppError("not_found", "Target user was not found");
    }

    if (existingFriendSnap.exists || reverseFriendSnap.exists) {
      throw new FriendAppError("already_friends", "Users are already friends");
    }

    if (hasPendingRequest(forwardReqSnap.docs) || hasPendingRequest(reverseReqSnap.docs)) {
      throw new FriendAppError("request_exists", "A pending friend request already exists");
    }

    const requestDocRef = db().collection(FRIEND_REQUESTS_COLLECTION).doc();
    tx.set(requestDocRef, {
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      requestId: requestDocRef.id,
      status: "pending" as const
    };
  });
};

export const acceptFriendRequest = async (actorUid: string, requestId: string) =>
  db().runTransaction(async (tx) => {
    const requestSnap = await tx.get(friendRequestRef(requestId));
    if (!requestSnap.exists) {
      throw new FriendAppError("not_found", "Friend request was not found");
    }

    const request = requestSnap.data() as FriendRequestDoc;

    if (request.toUserId !== actorUid) {
      throw new FriendAppError("permission_denied", "Only receiver can accept this request");
    }

    if (request.status !== "pending") {
      throw new FriendAppError("invalid_state", "Friend request is not pending");
    }

    tx.update(requestSnap.ref, {
      status: "accepted",
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.set(
      friendRef(request.fromUserId, request.toUserId),
      {
        friendUserId: request.toUserId,
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    tx.set(
      friendRef(request.toUserId, request.fromUserId),
      {
        friendUserId: request.fromUserId,
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return {
      friendUserId: request.fromUserId,
      status: "accepted" as const
    };
  });

export const cancelFriendRequest = async (actorUid: string, requestId: string) =>
  db().runTransaction(async (tx) => {
    const requestSnap = await tx.get(friendRequestRef(requestId));
    if (!requestSnap.exists) {
      throw new FriendAppError("not_found", "Friend request was not found");
    }

    const request = requestSnap.data() as FriendRequestDoc;

    if (request.fromUserId !== actorUid) {
      throw new FriendAppError("permission_denied", "Only sender can cancel this request");
    }

    if (request.status !== "pending") {
      throw new FriendAppError("invalid_state", "Friend request is not pending");
    }

    tx.update(requestSnap.ref, {
      status: "canceled",
      updatedAt: FieldValue.serverTimestamp()
    });

    return { status: "canceled" as const };
  });

export const rejectFriendRequest = async (actorUid: string, requestId: string) =>
  db().runTransaction(async (tx) => {
    const requestSnap = await tx.get(friendRequestRef(requestId));
    if (!requestSnap.exists) {
      throw new FriendAppError("not_found", "Friend request was not found");
    }

    const request = requestSnap.data() as FriendRequestDoc;

    if (request.toUserId !== actorUid) {
      throw new FriendAppError("permission_denied", "Only receiver can reject this request");
    }

    if (request.status !== "pending") {
      throw new FriendAppError("invalid_state", "Friend request is not pending");
    }

    tx.delete(requestSnap.ref);

    return { status: "canceled" as const };
  });

export const removeFriend = async (actorUid: string, friendUserId: string) =>
  db().runTransaction(async (tx) => {
    if (actorUid === friendUserId) {
      throw new FriendAppError("invalid_state", "Cannot remove yourself from friends");
    }

    const friendUserSnap = await tx.get(userRef(friendUserId));
    if (!friendUserSnap.exists) {
      throw new FriendAppError("not_found", "Friend user was not found");
    }

    tx.delete(friendRef(actorUid, friendUserId));
    tx.delete(friendRef(friendUserId, actorUid));

    const [forwardReqSnap, reverseReqSnap] = await Promise.all([
      tx.get(friendRequestPairQuery(actorUid, friendUserId)),
      tx.get(friendRequestPairQuery(friendUserId, actorUid))
    ]);

    cancelRequestIfNeeded(tx, forwardReqSnap.docs);
    cancelRequestIfNeeded(tx, reverseReqSnap.docs);

    return { status: "canceled" as const };
  });

export const getUserProfileById = async (userId: string) => {
  const userSnap = await userRef(userId).get();
  if (!userSnap.exists) {
    throw new FriendAppError("not_found", "User profile was not found");
  }

  const userData = userSnap.data() as Partial<UserProfileDoc> | undefined;

  return {
    userId: userData?.userId ?? userId,
    userName: userData?.userName ?? "",
    displayName: userData?.displayName ?? ""
  };
};
