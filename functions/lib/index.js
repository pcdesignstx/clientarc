"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReminderEmail = exports.regenerateApiKey = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin
admin.initializeApp();
// Export the regenerateApiKey function
exports.regenerateApiKey = functions.https.onCall(async (data, context) => {
    // Verify that the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    try {
        const { workspaceId, clientId } = data;
        if (!workspaceId || !clientId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }
        // Verify the request is from an admin
        const adminDoc = await admin.firestore()
            .collection('users')
            .doc(context.auth.uid)
            .get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can regenerate API keys');
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
    }
    catch (error) {
        console.error('Error regenerating API key:', error);
        throw new functions.https.HttpsError('internal', 'Failed to regenerate API key');
    }
});
// Mailgun configuration
const API_KEY = process.env.MAILGUN_API_KEY;
const DOMAIN = process.env.MAILGUN_DOMAIN || 'clientarc.pcdesignstx.com';
// Export the sendReminderEmail function
exports.sendReminderEmail = functions.https.onRequest(async (req, res) => {
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
        const client = clientDoc.data();
        const flow = flowDoc.data();
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
        const response = await (0, node_fetch_1.default)(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
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
    }
    catch (error) {
        console.error('Error sending reminder email:', error);
        res.status(500).json({ error: 'Failed to send reminder email' });
    }
});
//# sourceMappingURL=index.js.map