import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch'; // Must be v2: `npm install node-fetch@2`
import cors from 'cors';

admin.initializeApp();

const corsHandler = cors({ origin: true });

const API_KEY = process.env.MAILGUN_API_KEY;
const DOMAIN = process.env.MAILGUN_DOMAIN || 'clientarc.pcdesignstx.com';

export const sendReminderEmail = onRequest({ cors: true }, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
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

      if (!clientEmail || !clientName || !flowName || !workspaceId || !clientId || !flowId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const formattedDueDate = dueDate
        ? new Date(dueDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : null;

      const portalUrl = `https://clientarc.pcdesignstx.com/client-portal/${workspaceId}/${clientId}/${flowId}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Hi ${clientName},</h2>
          <p>This is a friendly reminder about your assigned flow: <strong>${flowName}</strong>.</p>
          ${formattedDueDate ? `<p>The flow is due on: <strong>${formattedDueDate}</strong></p>` : ''}
          <p>You can access and complete your flow by visiting your client portal:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
               text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Your Flow
            </a>
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
          <p>Best regards,<br>The ClientArc Team</p>
        </div>
      `;

      const auth = Buffer.from(`api:${API_KEY}`).toString('base64');

      console.log('Attempting to send email with Mailgun...');
      console.log('Using domain:', DOMAIN);
      console.log('API Endpoint:', `https://api.mailgun.net/v3/${DOMAIN}/messages`);
      console.log('From:', `ClientArc <noreply@${DOMAIN}>`);
      console.log('To:', clientEmail);
      console.log('Subject:', `Reminder: Complete your ${flowName} flow`);

      const response = await fetch(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: `ClientArc <noreply@${DOMAIN}>`,
          to: clientEmail,
          subject: `Reminder: Complete your ${flowName} flow`,
          html: htmlContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Mailgun API Error:', data);
        return res.status(500).json({
          error: 'Mailgun API Error',
          details: data,
        });
      }

      console.log('Mailgun Success:', data);
      return res.status(200).json({ success: true, message: 'Reminder sent!' });

    } catch (err: any) {
      console.error('Function Error:', {
        message: err.message,
        stack: err.stack
      });
      return res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    }
  });
}); 