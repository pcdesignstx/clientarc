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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReminderEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
const API_KEY = ((_a = functions.config().mailgun) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.MAILGUN_API_KEY;
const DOMAIN = ((_b = functions.config().mailgun) === null || _b === void 0 ? void 0 : _b.domain) || process.env.MAILGUN_DOMAIN || 'clientarc.pcdesignstx.com';
app.post('/', async (req, res) => {
    try {
        const { clientEmail, clientName, flowName, dueDate, workspaceId, clientId, flowId, } = req.body;
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
        const response = await (0, node_fetch_1.default)(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
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
    }
    catch (error) {
        const err = error;
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
// Only start the server when running locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
}
// Export the Express app for Cloud Functions
exports.sendReminderEmail = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map