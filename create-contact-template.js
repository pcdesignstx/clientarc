import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWC3g0Ja453Bn5ZHL4AcLrLEBVCxsDGrQ",
  authDomain: "clientgateway-668db.firebaseapp.com",
  projectId: "clientgateway-668db",
  storageBucket: "clientgateway-668db.firebasestorage.app",
  messagingSenderId: "607985078362",
  appId: "1:607985078362:web:13507f79acce57d4fbc863"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function createThankYouTemplate() {
  try {
    console.log('Creating Thank You / Confirmation Page Content template...');

    const templateData = {
      name: "Thank You / Confirmation Page Content",
      description: "Gather content for a custom confirmation page that thanks the visitor and directs them toward their next step.",
      isTemplate: true,
      steps: [
        {
          title: "Thank You Message",
          description: "What the user sees right after submitting.",
          questions: [
            {
              label: "What headline should appear at the top?",
              type: "short_answer",
              placeholder: "Enter your thank you page headline..."
            },
            {
              label: "Write a short thank you or confirmation message.",
              type: "long_answer",
              placeholder: "Enter your thank you message..."
            }
          ]
        },
        {
          title: "Next Steps / Call to Action",
          description: "Encourage visitors to take action after submitting.",
          questions: [
            {
              label: "Do you want to link to another page or resource?",
              type: "dropdown",
              options: [
                { text: "Yes" },
                { text: "No" }
              ]
            },
            {
              label: "If yes, what is the URL or destination?",
              type: "short_answer",
              placeholder: "Enter the destination URL..."
            },
            {
              label: "What should the button say?",
              type: "short_answer",
              placeholder: "Enter the button text..."
            }
          ]
        },
        {
          title: "Visual Elements (Optional)",
          description: "Add branding or personality.",
          questions: [
            {
              label: "Upload a thank you illustration, photo, or icon.",
              type: "file_upload",
              placeholder: "Upload a visual element..."
            },
            {
              label: "Would you like to embed a video message or animation?",
              type: "short_answer",
              placeholder: "Enter video URL or animation details..."
            }
          ]
        }
      ]
    };

    // Add the template to the root templates collection
    const templatesRef = collection(db, 'templates');
    const docRef = await addDoc(templatesRef, templateData);

    console.log(`Thank You / Confirmation Page Content template created successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createThankYouTemplate(); 