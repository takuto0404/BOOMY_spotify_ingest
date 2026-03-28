import * as functions from "firebase-functions";

export type FriendAppErrorCode =
  | "not_found"
  | "already_friends"
  | "request_exists"
  | "invalid_state"
  | "permission_denied";

const toHttpsCode = (
  code: FriendAppErrorCode
): functions.https.FunctionsErrorCode => {
  switch (code) {
    case "not_found":
      return "not-found";
    case "already_friends":
      return "already-exists";
    case "request_exists":
      return "already-exists";
    case "invalid_state":
      return "failed-precondition";
    case "permission_denied":
      return "permission-denied";
  }
};

export class FriendAppError extends Error {
  public readonly code: FriendAppErrorCode;

  constructor(code: FriendAppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "FriendAppError";
  }
}

export const toHttpsError = (error: unknown): functions.https.HttpsError => {
  if (error instanceof functions.https.HttpsError) {
    return error;
  }

  if (error instanceof FriendAppError) {
    return new functions.https.HttpsError(
      toHttpsCode(error.code),
      error.message,
      { code: error.code }
    );
  }

  return new functions.https.HttpsError("internal", "Unexpected internal error");
};
