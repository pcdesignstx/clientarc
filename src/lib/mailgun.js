import Mailgun from 'mailgun.js';
import FormData from 'form-data';

const mg = new Mailgun(FormData).client({
  username: 'api',
  key: import.meta.env.VITE_MAILGUN_API_KEY,
  url: 'https://api.mailgun.net/v3',
});

export async function sendReminderEmail({
  clientEmail,
  clientName,
  flowName,
  dueDate,
  workspaceId,
  clientId,
  flowId,
}) {
  // Format the due date if it exists
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const messageData = {
    from: `ClientArc <noreply@${import.meta.env.VITE_MAILGUN_DOMAIN}>`,
    to: clientEmail,
    subject: `Reminder: Complete your ${flowName} flow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Hi ${clientName},</h2>
        <p>This is a friendly reminder about your assigned flow: <strong>${flowName}</strong>.</p>
        ${formattedDueDate ? `<p>The flow is due on: <strong>${formattedDueDate}</strong></p>` : ''}
        <p>You can access and complete your flow by visiting your client portal:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${import.meta.env.VITE_APP_URL}/client-portal/${workspaceId}/${clientId}/${flowId}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Access Your Flow
          </a>
        </div>
        <p>If you have any questions or need assistance, please don't hesitate to reach out to your account manager.</p>
        <p>Best regards,<br>The ClientArc Team</p>
      </div>
    `,
  };

  try {
    await mg.messages.create(import.meta.env.VITE_MAILGUN_DOMAIN, messageData);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
} 