import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function checkTemplates() {
  try {
    console.log('Checking root templates collection...');
    const templatesRef = collection(db, 'templates');
    const templatesSnapshot = await getDocs(templatesRef);

    console.log(`Found ${templatesSnapshot.size} templates in root collection`);

    templatesSnapshot.forEach(doc => {
      console.log(`Template: ${doc.id}`);
      console.log(doc.data());
    });

    // Check workspace templates
    console.log('\nChecking workspace templates...');
    const workspacesRef = collection(db, 'workspaces');
    const workspacesSnapshot = await getDocs(workspacesRef);

    for (const workspaceDoc of workspacesSnapshot.docs) {
      const workspaceId = workspaceDoc.id;
      console.log(`\nChecking workspace: ${workspaceId}`);

      const workspaceTemplatesRef = collection(db, 'workspaces', workspaceId, 'templates');
      const workspaceTemplatesSnapshot = await getDocs(workspaceTemplatesRef);

      console.log(`Found ${workspaceTemplatesSnapshot.size} templates in workspace ${workspaceId}`);

      workspaceTemplatesSnapshot.forEach(doc => {
        console.log(`Template: ${doc.id}`);
        console.log(doc.data());
      });
    }
  } catch (error) {
    console.error('Error checking templates:', error);
  }
}

checkTemplates(); 