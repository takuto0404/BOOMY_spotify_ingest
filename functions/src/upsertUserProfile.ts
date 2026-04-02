import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
  onCall
} from "firebase-functions/v2/https";
import { z } from "zod";

import { logger } from "./lib/logging.js";

interface UserProfileDoc {
  userId: string;
  userName: string;
  displayName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const runtime = {
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "256MiB" as const
};

const upsertUserProfileInputSchema = z.object({
  userName: z.string().trim().min(1),
  displayName: z.string().trim().min(1)
});

const ensureAuthenticated = (request: CallableRequest<unknown>) => {
  if (!request.auth) {
    logger.warn("upsertUserProfile unauthenticated", {
      hasAuth: false
    });
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  return request.auth.uid;
};

export const upsertUserProfile = onCall(runtime, async (request) => {
  const userId = ensureAuthenticated(request);
  const parsed = upsertUserProfileInputSchema.safeParse(request.data);

  if (!parsed.success) {
    logger.warn("upsertUserProfile validation failed", {
      userId,
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    throw new HttpsError(
      "invalid-argument",
      "userName and displayName must be non-empty strings"
    );
  }

  const { userName, displayName } = parsed.data;
  const db = getFirestore();
  const profileRef = db.collection("users").doc(userId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const [profileSnap, duplicateUserNameSnap] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(
          db.collection("users").where("userName", "==", userName).limit(2)
        )
      ]);

      const duplicateDoc = duplicateUserNameSnap.docs.find(
        (doc) => doc.id !== userId
      );
      if (duplicateDoc) {
        logger.warn("upsertUserProfile duplicate userName", {
          userId,
          userName,
          duplicateUserId: duplicateDoc.id
        });
        throw new HttpsError(
          "already-exists",
          "userName is already in use"
        );
      }

      const existingProfile = profileSnap.data() as Partial<UserProfileDoc> | undefined;

      transaction.set(
        profileRef,
        {
          userId,
          userName,
          displayName,
          createdAt: existingProfile?.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return {
        userId,
        userName,
        displayName
      };
    });

    logger.info("upsertUserProfile completed", result);
    return result;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error("upsertUserProfile failed", error, {
      userId,
      userName,
      displayName
    });
    throw new HttpsError("internal", "Unexpected internal error");
  }
});
