import { applicationDefault, initializeApp, getApps } from "firebase-admin/app";
import {
  BulkWriter,
  FieldValue,
  Firestore,
  Timestamp,
  getFirestore
} from "firebase-admin/firestore";

import type {
  IngestMetadata,
  ListenSnapshot,
  UserIngestTarget
} from "../types.js";
import { logger } from "../lib/logging.js";

let firestore: Firestore;
let writer: BulkWriter;

const USERS_COLLECTION = "users";
const LISTENS_SUBCOLLECTION = "listens";
const META_COLLECTION = "meta";
const META_DOC_ID = "ingest";

const ensureInitialized = () => {
  if (!firestore && !getApps().length) {
    initializeApp({
      credential: applicationDefault()
    });
    firestore = getFirestore();
    writer = firestore.bulkWriter({ throttling: true });
    logger.info("Initialized Firestore Admin SDK");
  } else if (!firestore) {
    firestore = getFirestore();
    writer = firestore.bulkWriter({ throttling: true });
    logger.info("Retrieved existing Firestore Admin SDK instance");
  }

  return { firestore, writer };
};

export const getUsersForIngestion = async (): Promise<UserIngestTarget[]> => {
  const { firestore: db } = ensureInitialized();
  const allDocs = await db.collection(USERS_COLLECTION).listDocuments();
  logger.info("Users for ingestion", { count: allDocs.length });
  return allDocs.map(doc => ({ uid: doc.id }));
};

export const getIngestMetadata = async (
  uid: string
): Promise<IngestMetadata> => {
  const { firestore: db } = ensureInitialized();
  const docRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(META_COLLECTION)
    .doc(META_DOC_ID);

  const snap = await docRef.get();
  return (snap.data() as IngestMetadata) ?? {};
};

export const updateIngestMetadata = async (
  uid: string,
  metadata: IngestMetadata
) => {
  const { firestore: db } = ensureInitialized();
  const docRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(META_COLLECTION)
    .doc(META_DOC_ID);

  await docRef.set(
    {
      ...metadata,
      lastRunAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
};

export const upsertListens = async (uid: string, listens: ListenSnapshot[]) => {
  if (!listens.length) return;

  const { firestore: db, writer } = ensureInitialized();
  const baseRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(LISTENS_SUBCOLLECTION);

  listens.forEach((listen) => {
    const docRef = baseRef.doc(listen.docId);
    writer.set(
      docRef,
      {
        userId: listen.userId,
        trackId: listen.trackId,
        trackName: listen.trackName,
        artistNames: listen.artistNames,
        albumName: listen.albumName,
        durationMs: listen.durationMs,
        playedAt: Timestamp.fromMillis(listen.playedAtEpochMs),
        playedAtEpochMs: listen.playedAtEpochMs,
        expireAt: Timestamp.fromDate(listen.expireAt)
      },
      { merge: true }
    );
  });
};

export const flushWrites = async () => {
  const { writer } = ensureInitialized();
  await writer.flush();
};
