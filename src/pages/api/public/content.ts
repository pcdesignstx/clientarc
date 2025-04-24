import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { workspaceId, clientId } = req.query;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Validate token
    const tokenDoc = await db
      .collection('clientarc_api_tokens')
      .doc(`${workspaceId}_${clientId}`)
      .get();

    if (!tokenDoc.exists || tokenDoc.data()?.token !== token) {
      return res.status(403).json({ error: 'Invalid API token' });
    }

    // Fetch flow data (simplified - adjust path structure to match your DB)
    const sectionsSnapshot = await db
      .collection('clients')
      .doc(clientId as string)
      .collection('flows')
      .get();

    const sections: any[] = [];

    sectionsSnapshot.forEach(doc => {
      const data = doc.data();
      sections.push({
        id: doc.id,
        title: data.title || doc.id,
        type: data.type || 'html',
        content: data.content || '',
        images: data.images || [],
      });
    });

    res.status(200).json({ sections });
  } catch (error) {
    console.error('Error fetching client content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 