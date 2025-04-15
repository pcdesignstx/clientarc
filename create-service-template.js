import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

async function createServiceTemplate() {
  try {
    console.log('Creating Service Page Content template...');
    
    const templateData = {
      name: "Service Page Content",
      description: "Collect content to describe one specific service in detail.",
      isTemplate: true,
      steps: [
        {
          title: "Service Overview",
          description: "Introduce the service and who it helps.",
          questions: [
            { 
              label: "What is the name of the service?", 
              type: "short_answer",
              placeholder: "Enter the name of your service..."
            },
            { 
              label: "What does this service help people do?", 
              type: "long_answer",
              placeholder: "Describe how your service helps clients..."
            }
          ]
        },
        {
          title: "How It Works",
          description: "Explain your process.",
          questions: [
            { 
              label: "Describe the steps or workflow", 
              type: "long_answer",
              placeholder: "Explain your service process step by step..."
            },
            { 
              label: "Do you have visuals or diagrams?", 
              type: "file_upload",
              placeholder: "Upload any process diagrams or visuals..."
            }
          ]
        },
        {
          title: "Pricing or Packages",
          description: "Show options (if applicable).",
          questions: [
            { 
              label: "Describe your pricing model or packages", 
              type: "long_answer",
              placeholder: "Explain your pricing structure and options..."
            },
            { 
              label: "Upload a pricing table or flyer", 
              type: "file_upload",
              placeholder: "Upload your pricing documentation..."
            }
          ]
        },
        {
          title: "FAQs",
          description: "Answer common client questions.",
          questions: [
            { 
              label: "Add 3–5 frequently asked questions and answers", 
              type: "long_answer",
              placeholder: "List common questions and their answers, one per line..."
            }
          ]
        }
      ]
    };
    
    // Add the template to the root templates collection
    const templatesRef = collection(db, 'templates');
    const docRef = await addDoc(templatesRef, templateData);
    
    console.log(`Service Page Content template created successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createServiceTemplate(); 