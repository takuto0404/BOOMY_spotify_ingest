import { z } from "zod";

export const friendRequestStatusSchema = z.enum([
  "pending",
  "accepted",
  "canceled"
]);

export type FriendRequestStatus = z.infer<typeof friendRequestStatusSchema>;

export const sendFriendRequestInputSchema = z.object({
  toUserId: z.string().min(1)
});

export const requestIdInputSchema = z.object({
  requestId: z.string().min(1)
});

export const removeFriendInputSchema = z.object({
  friendUserId: z.string().min(1)
});

export const getUserProfileByIdInputSchema = z.object({
  userId: z.string().min(1)
});

export interface UserProfileDoc {
  userId: string;
  userName: string;
  displayName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FriendRequestDoc {
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}
