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

async function createAboutTemplate() {
  try {
    console.log('Creating About Page Content template...');
    
    const templateData = {
      name: "About Page Content",
      description: "Gather personal and brand-focused information to craft a strong About page.",
      isTemplate: true,
      steps: [
        {
          title: "Company Story",
          description: "Share your journey and values.",
          questions: [
            { 
              label: "When and why did you start your business?", 
              type: "long_answer",
              placeholder: "Share the story of how your business came to be..."
            },
            { 
              label: "What's your mission or purpose?", 
              type: "long_answer",
              placeholder: "Describe your company's mission and purpose..."
            }
          ]
        },
        {
          title: "The Team",
          description: "Introduce your key people.",
          questions: [
            { 
              label: "Upload team member photos", 
              type: "file_upload",
              placeholder: "Upload photos of your team members"
            },
            { 
              label: "Add names and short bios", 
              type: "long_answer",
              placeholder: "Write brief bios for each team member..."
            }
          ]
        },
        {
          title: "Core Values",
          description: "What do you stand for?",
          questions: [
            { 
              label: "List 3–5 values that represent your brand", 
              type: "long_answer",
              placeholder: "List your core values, one per line..."
            }
          ]
        },
        {
          title: "Why Choose Us",
          description: "Build trust and differentiation.",
          questions: [
            { 
              label: "What makes your company different from others?", 
              type: "long_answer",
              placeholder: "Explain what sets your company apart..."
            }
          ]
        }
      ]
    };
    
    // Add the template to the root templates collection
    const templatesRef = collection(db, 'templates');
    const docRef = await addDoc(templatesRef, templateData);
    
    console.log(`About Page Content template created successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createAboutTemplate(); 