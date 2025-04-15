import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

async function checkTemplate() {
  try {
    const templateId = 'Vob38nhtsXPYPv9mFNXq'; // The ID from the creation output
    const templateRef = doc(db, 'templates', templateId);
    const templateDoc = await getDoc(templateRef);

    if (templateDoc.exists()) {
      console.log('Template found:', templateDoc.data());
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error checking template:', error);
  }
}

checkTemplate(); 