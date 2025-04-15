import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getClient } from '@mailgun/mailgun-js';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const mailgun = getClient({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      clientEmail,
      clientName,
      flowName,
      dueDate,
      workspaceId,
      clientId,
      flowId,
    } = req.body;

    if (!clientEmail || !clientName || !flowName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format the due date if it exists
    const formattedDueDate = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    // Create the email message
    const message = {
      from: `ClientArc <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: clientEmail,
      subject: `Reminder: Complete your ${flowName} flow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Hi ${clientName},</h2>
          <p>This is a friendly reminder about your assigned flow: <strong>${flowName}</strong>.</p>
          ${formattedDueDate ? `<p>The flow is due on: <strong>${formattedDueDate}</strong></p>` : ''}
          <p>You can access and complete your flow by visiting your client portal:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/client-portal/${workspaceId}/${clientId}/${flowId}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Your Flow
            </a>
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to reach out to your account manager.</p>
          <p>Best regards,<br>The ClientArc Team</p>
        </div>
      `,
    };

    // Send the email
    await mailgun.messages.create(process.env.MAILGUN_DOMAIN, message);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending reminder email:', error);
    res.status(500).json({ error: 'Failed to send reminder email' });
  }
} 