// Reset lastFetchedAt for a specific user
const admin = require('firebase-admin');

admin.initializeApp();

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node reset-ingest.js <uid>');
  process.exit(1);
}

const db = admin.firestore();

async function resetIngest() {
  const docRef = db.collection('users').doc(uid).collection('meta').doc('ingest');
  
  // Delete the entire ingest metadata document to reset
  await docRef.delete();
  
  console.log(`Reset ingest metadata for user: ${uid}`);
}

resetIngest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
