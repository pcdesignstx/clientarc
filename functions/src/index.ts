import * as functions from '@google-cloud/functions-framework';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin
admin.initializeApp();

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

// Register the function with Functions Framework
functions.http('sendReminderEmail', async (req: functions.Request, res: functions.Response) => {
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
        text: `This is a reminder to complete the question: ${question.text}\n\nPlease log in to your ClientArc dashboard to complete this question.`
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