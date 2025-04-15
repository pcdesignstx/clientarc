const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const FormData = require('form-data');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Placeholder helloWorld function
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from Firebase!');
});

// Create client function with CORS support
exports.createClient = functions.https.onRequest((request, response) => {
  // Enable CORS
  return cors(request, response, async () => {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    let userRecord = null; // Declare userRecord outside try block

    try {
      const { email, password, name, workspaceId } = request.body;

      // Validate required fields
      if (!email || !password || !name || !workspaceId) {
        response.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if user already exists
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        if (existingUser) {
          response.status(400).json({ error: 'Client already exists with this email.' });
          return;
        }
      } catch (error) {
        // If error is not "user not found", rethrow it
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // If user not found, continue with creation
      }

      // Create the user
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });

      // Save client data to Firestore
      const clientRef = admin.firestore()
        .collection('workspaces')
        .doc(workspaceId)
        .collection('clients')
        .doc(userRecord.uid);
      await clientRef.set({
        name,
        email,
        workspaceId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        assignedFlows: [],
        lastLogin: null,
        metadata: {
          createdBy: request.auth?.uid || 'system',
          createdFrom: request.headers['user-agent'] || 'unknown',
          ipAddress: request.ip || 'unknown'
        }
      });

      response.status(200).json({ 
        uid: userRecord.uid,
        message: 'Client created successfully'
      });
    } catch (error) {
      console.error('Error creating client:', error);
      
      // If user was created but Firestore write failed, delete the user
      if (error.code === 'firestore/write-failed' && userRecord) {
        try {
          await admin.auth().deleteUser(userRecord.uid);
        } catch (deleteError) {
          console.error('Error deleting user after Firestore write failed:', deleteError);
        }
      }
      
      response.status(500).json({ 
        error: error.message,
        code: error.code || 'unknown'
      });
    }
  });
});

// Delete client function
exports.deleteClient = functions.https.onRequest((request, response) => {
  // Enable CORS
  return cors(request, response, async () => {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { uid } = request.body;

      if (!uid) {
        response.status(400).json({ error: 'Missing client UID' });
        return;
      }

      // Delete the user from Firebase Auth
      await admin.auth().deleteUser(uid);

      response.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      response.status(500).json({ 
        error: error.message,
        code: error.code || 'unknown'
      });
    }
  });
});

// Email sending function
exports.sendEmail = functions.https.onCall(async (data, context) => {
  // Verify that the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Validate required fields
  if (!data.to || !data.subject || !data.text) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: to, subject, or text'
    );
  }

  try {
    // Get Mailgun API key from Firebase functions config
    const mailgunApiKey = functions.config().mailgun.key;
    if (!mailgunApiKey) {
      throw new functions.https.HttpsError(
        'internal',
        'Mailgun API key is not configured'
      );
    }

    // Create form data for Mailgun API
    const formData = new FormData();
    formData.append('from', 'Your App <no-reply@clientarc.pcdesignstx.com>');
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('text', data.text);
    
    // Add HTML version if provided
    if (data.html) {
      formData.append('html', data.html);
    }

    // Send the email using Mailgun API
    const response = await fetch(
      'https://api.mailgun.net/v3/clientarc.pcdesignstx.com/messages',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`
        },
        body: formData
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      throw new functions.https.HttpsError(
        'internal',
        `Mailgun API error: ${responseData.message || 'Unknown error'}`
      );
    }

    return responseData;

  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to send email'
    );
  }
});

// Update client password function
exports.updateClientPassword = functions.https.onRequest((request, response) => {
  // Enable CORS
  return cors(request, response, async () => {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { uid, password } = request.body;

      if (!uid || !password) {
        response.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Update the user's password in Firebase Auth
      await admin.auth().updateUser(uid, {
        password: password
      });

      response.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      response.status(500).json({ 
        error: error.message,
        code: error.code || 'unknown'
      });
    }
  });
}); 