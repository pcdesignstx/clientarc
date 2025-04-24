import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Initialize Firebase Admin SDK
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

async function generateApiToken(workspaceId: string, clientId: string) {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store the token in Firestore
  await db
    .collection('clientarc_api_tokens')
    .doc(`${workspaceId}_${clientId}`)
    .set({
      token,
      createdAt: new Date(),
      workspaceId,
      clientId,
    });

  console.log('API Token generated successfully!');
  console.log('Token:', token);
  console.log('Store this token securely. It will not be shown again.');
}

// Get command line arguments
const workspaceId = process.argv[2];
const clientId = process.argv[3];

if (!workspaceId || !clientId) {
  console.error('Usage: ts-node generate-api-token.ts <workspaceId> <clientId>');
  process.exit(1);
}

generateApiToken(workspaceId, clientId).catch(console.error); 