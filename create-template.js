import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Your web app's Firebase configuration
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

async function createTemplate() {
  try {
    console.log('Creating a sample template...');

    // Sample template data
    const templateData = {
      name: "Client Onboarding",
      description: "A comprehensive onboarding flow for new clients",
      isTemplate: true,
      steps: [
        {
          title: "Personal Information",
          description: "Basic client details",
          questions: [
            {
              label: "Full Name",
              type: "short_answer",
              placeholder: "Enter your full name"
            },
            {
              label: "Email Address",
              type: "short_answer",
              placeholder: "Enter your email address"
            },
            {
              label: "Phone Number",
              type: "short_answer",
              placeholder: "Enter your phone number"
            }
          ]
        },
        {
          title: "Business Information",
          description: "Details about the client's business",
          questions: [
            {
              label: "Company Name",
              type: "short_answer",
              placeholder: "Enter your company name"
            },
            {
              label: "Industry",
              type: "dropdown",
              options: [
                { text: "Technology" },
                { text: "Healthcare" },
                { text: "Finance" },
                { text: "Retail" },
                { text: "Other" }
              ]
            },
            {
              label: "Company Size",
              type: "multiple_choice",
              options: [
                { text: "1-10 employees" },
                { text: "11-50 employees" },
                { text: "51-200 employees" },
                { text: "201-500 employees" },
                { text: "500+ employees" }
              ]
            }
          ]
        },
        {
          title: "Project Requirements",
          description: "Understanding the client's needs",
          questions: [
            {
              label: "What are your main goals?",
              type: "long_answer",
              placeholder: "Describe your primary objectives"
            },
            {
              label: "Do you have a specific budget?",
              type: "yes_no"
            },
            {
              label: "When do you need this completed?",
              type: "short_answer",
              placeholder: "Enter your timeline"
            },
            {
              label: "Upload any relevant documents",
              type: "file_upload"
            }
          ]
        }
      ]
    };

    // Add the template to the root templates collection
    const templatesRef = collection(db, 'templates');
    const docRef = await addDoc(templatesRef, templateData);

    console.log(`Template created successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createTemplate(); 