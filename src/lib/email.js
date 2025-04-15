import { getFunctions, httpsCallable } from 'firebase/functions';

export const sendEmail = async ({ to, subject, text }) => {
  const functions = getFunctions();
  const sendEmailFunction = httpsCallable(functions, 'sendEmail');
  
  try {
    const result = await sendEmailFunction({
      to,
      subject,
      text
    });
    return result.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}; 