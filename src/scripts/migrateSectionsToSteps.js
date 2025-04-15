import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateSectionsToSteps(workspaceId) {
  try {
    // Get all flows in the workspace
    const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
    const snapshot = await getDocs(flowsRef);

    // Process each flow
    for (const flowDoc of snapshot.docs) {
      const data = flowDoc.data();
      
      // Only update if the flow has sections but no steps
      if (data.sections && !data.steps) {
        console.log(`Migrating flow ${flowDoc.id}...`);
        
        // Create the update object
        const updateData = {
          steps: data.sections,
          updatedAt: new Date()
        };

        // Update the document
        await updateDoc(doc(db, 'workspaces', workspaceId, 'flows', flowDoc.id), updateData);
        console.log(`Successfully migrated flow ${flowDoc.id}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Example usage:
// migrateSectionsToSteps('your-workspace-id'); 