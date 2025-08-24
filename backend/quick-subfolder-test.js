import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import terminalFileWatcher from './services/terminalFileWatcher.js';
import File from './models/file.js';
import Folder from './models/Folder.js';

// Quick test for subfolder file sync
async function quickSubfolderTest() {
  console.log('🚀 Quick subfolder file sync test...\n');
  
  const dockerManager = getDockerWorkspaceManager();
  const projectId = 'your-project-id'; // Replace with your actual project ID
  const userId = 'your-user-id'; // Replace with your actual user ID
  
  try {
    // Start file watcher if not already running
    await terminalFileWatcher.startWatching(projectId, userId);
    console.log('✅ File watcher started');
    
    // Create a test folder and file (simulating your scenario)
    const folderName = 'TestFolder';
    const fileName = 'test.py';
    const filePath = `${folderName}/${fileName}`;
    const fileContent = 'print("Test from subfolder")';
    
    console.log(`📁 Creating folder: ${folderName}`);
    await dockerManager.createFolderInContainer(projectId, folderName);
    
    console.log(`📄 Creating file: ${filePath}`);
    await dockerManager.writeFileToContainer(projectId, filePath, fileContent);
    
    console.log('⏳ Waiting for sync...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    const dbFolder = await Folder.findOne({ 
      project: projectId, 
      name: folderName 
    });
    
    const dbFile = await File.findOne({ 
      project: projectId, 
      name: fileName,
      folder: dbFolder?._id
    });
    
    if (dbFolder && dbFile) {
      console.log('✅ SUCCESS: File created in subfolder and synced correctly!');
      console.log(`   Folder: ${dbFolder.name} (ID: ${dbFolder._id})`);
      console.log(`   File: ${dbFile.name} (ID: ${dbFile._id})`);
      console.log(`   File path: ${dbFile.path}`);
      console.log(`   File content: ${dbFile.content}`);
    } else {
      console.log('❌ FAILED: File not synced correctly');
      console.log(`   Folder found: ${!!dbFolder}`);
      console.log(`   File found: ${!!dbFile}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
quickSubfolderTest();

