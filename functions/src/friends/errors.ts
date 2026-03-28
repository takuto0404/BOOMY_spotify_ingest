import { type FunctionsErrorCode, HttpsError } from "firebase-functions/v2/https";

export type FriendAppErrorCode =
  | "not_found"
  | "already_friends"
  | "request_exists"
  | "invalid_state"
  | "permission_denied";

const toHttpsCode = (
  code: FriendAppErrorCode
): FunctionsErrorCode => {
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

export const toHttpsError = (error: unknown): HttpsError => {
  if (error instanceof HttpsError) {
    return error;
  }

  if (error instanceof FriendAppError) {
    return new HttpsError(
      toHttpsCode(error.code),
      error.message,
      { code: error.code }
    );
  }

  return new HttpsError("internal", "Unexpected internal error");
};
