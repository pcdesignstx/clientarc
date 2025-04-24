import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Export the regenerateApiKey function
export const regenerateApiKey = functions.https.onCall(async (data: any, context: any) => {
  // Verify that the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  try {
    const { workspaceId, clientId } = data;

    if (!workspaceId || !clientId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }

    // Verify the request is from an admin
    const adminDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can regenerate API keys'
      );
    }

    // Generate new API key
    const newApiKey = crypto.randomBytes(32).toString('hex');

    // Update client document with new API key
    const clientRef = admin.firestore()
      .collection('workspaces')
      .doc(workspaceId)
      .collection('clients')
      .doc(clientId);

    await clientRef.update({
      apiKey: newApiKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      apiKey: newApiKey,
      message: 'API key regenerated successfully'
    };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to regenerate API key'
    );
  }
});

// Mailgun configuration
const API_KEY = process.env.MAILGUN_API_KEY;
const DOMAIN = process.env.MAILGUN_DOMAIN || 'clientarc.pcdesignstx.com';

interface Client {
  email: string;
  name: string;
}

interface Flow {
  questions: Array<{
    id: string;
    text: string;
  }>;
}

// Export the sendReminderEmail function
export const sendReminderEmail = functions.https.onRequest(async (req, res) => {
  try {
    const { clientId, flowId, questionId } = req.body;

    if (!clientId || !flowId || !questionId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Get client and flow data from Firestore
    const clientDoc = await admin.firestore().collection('clients').doc(clientId).get();
    const flowDoc = await admin.firestore().collection('flows').doc(flowId).get();

    if (!clientDoc.exists || !flowDoc.exists) {
      res.status(404).json({ error: 'Client or flow not found' });
      return;
    }

    const client = clientDoc.data() as Client;
    const flow = flowDoc.data() as Flow;

    if (!client || !flow) {
      res.status(404).json({ error: 'Client or flow data not found' });
      return;
    }

    // Find the question in the flow
    const question = flow.questions.find((q) => q.id === questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Send email using Mailgun
    const response = await fetch(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        from: 'ClientArc <noreply@clientarc.pcdesignstx.com>',
        to: client.email,
        subject: `Reminder: ${question.text}`,
        text: 'This is a reminder to complete the question: ' + question.text + '\n\n' +
              'Please log in to your ClientArc dashboard to complete this question.'
      })
    });

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.statusText}`);
    }

    res.status(200).json({ message: 'Reminder email sent successfully' });
  } catch (error) {
    console.error('Error sending reminder email:', error);
    res.status(500).json({ error: 'Failed to send reminder email' });
  }
});

// Export the deleteClient function
export const deleteClient = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { uid } = req.body;

    if (!uid) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(uid);

    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
}); 