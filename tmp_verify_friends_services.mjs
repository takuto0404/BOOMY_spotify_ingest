import assert from 'node:assert/strict';

import {
  getApps,
  initializeApp
} from './functions/lib/node_modules/firebase-admin/lib/app/index.js';
import {
  FieldValue,
  getFirestore
} from './functions/lib/node_modules/firebase-admin/lib/firestore/index.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-friends-test';

if (!getApps().length) {
  initializeApp({ projectId });
}

const {
  acceptFriendRequest,
  cancelFriendRequest,
  getUserProfileById,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest
} = await import('./functions/lib/friends/service.js');

const { FriendAppError } = await import('./functions/lib/friends/errors.js');

const db = getFirestore();

const now = Date.now();
const u1 = `u1_${now}`;
const u2 = `u2_${now}`;
const u3 = `u3_${now}`;

const seedUser = async (uid, userName, displayName) => {
  await db.collection('users').doc(uid).set({
    userId: uid,
    userName,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
};

const expectFriendError = async (fn, code) => {
  try {
    await fn();
    assert.fail(`Expected FriendAppError(${code})`);
  } catch (error) {
    assert.ok(error instanceof FriendAppError, `Unexpected error type: ${error}`);
    assert.equal(error.code, code);
  }
};

await seedUser(u1, `name_${u1}`, 'User 1');
await seedUser(u2, `name_${u2}`, 'User 2');
await seedUser(u3, `name_${u3}`, 'User 3');

const profile = await getUserProfileById(u1);
assert.equal(profile.userId, u1);
assert.equal(profile.displayName, 'User 1');

const req1 = await sendFriendRequest(u1, u2);
assert.equal(req1.status, 'pending');

await expectFriendError(() => sendFriendRequest(u1, u2), 'request_exists');
await expectFriendError(() => sendFriendRequest(u2, u1), 'request_exists');
await expectFriendError(() => sendFriendRequest(u1, u1), 'invalid_state');

const accepted = await acceptFriendRequest(u2, req1.requestId);
assert.equal(accepted.status, 'accepted');
assert.equal(accepted.friendUserId, u1);

const u1Friend = await db.collection('users').doc(u1).collection('friends').doc(u2).get();
const u2Friend = await db.collection('users').doc(u2).collection('friends').doc(u1).get();
assert.equal(u1Friend.exists, true);
assert.equal(u2Friend.exists, true);

await expectFriendError(() => sendFriendRequest(u1, u2), 'already_friends');

const removed = await removeFriend(u1, u2);
assert.equal(removed.status, 'canceled');

const u1FriendAfter = await db.collection('users').doc(u1).collection('friends').doc(u2).get();
const u2FriendAfter = await db.collection('users').doc(u2).collection('friends').doc(u1).get();
assert.equal(u1FriendAfter.exists, false);
assert.equal(u2FriendAfter.exists, false);

const req1AfterRemove = await db.collection('friendRequests').doc(req1.requestId).get();
assert.equal(req1AfterRemove.exists, true);
assert.equal(req1AfterRemove.data()?.status, 'canceled');

const req2 = await sendFriendRequest(u3, u1);
const rejected = await rejectFriendRequest(u1, req2.requestId);
assert.equal(rejected.status, 'canceled');
const req2AfterReject = await db.collection('friendRequests').doc(req2.requestId).get();
assert.equal(req2AfterReject.exists, false);

const req3 = await sendFriendRequest(u3, u2);
const canceled = await cancelFriendRequest(u3, req3.requestId);
assert.equal(canceled.status, 'canceled');
const req3AfterCancel = await db.collection('friendRequests').doc(req3.requestId).get();
assert.equal(req3AfterCancel.exists, true);
assert.equal(req3AfterCancel.data()?.status, 'canceled');

await expectFriendError(() => removeFriend(u1, `missing_${now}`), 'not_found');

await Promise.all(getApps().map((app) => app.delete()));
console.log('Friend service integration checks passed');
process.exit(0);
