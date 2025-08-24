import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import terminalFileWatcher from './services/terminalFileWatcher.js';

const TEST_PROJECT_ID = '507f1f77bcf86cd799439011'; // Replace with your actual project ID
const TEST_USER_ID = '507f1f77bcf86cd799439012'; // Replace with your actual user ID

async function testFolderPathFix() {
  console.log('🧪 Testing folder path fix...\n');
  
  try {
    const dockerManager = getDockerWorkspaceManager();
    
    // 1. Start file watcher
    console.log('1️⃣ Starting file watcher...');
    const fileWatcherStarted = await terminalFileWatcher.startWatching(TEST_PROJECT_ID, TEST_USER_ID);
    console.log(`File watcher started: ${fileWatcherStarted}\n`);
    
    // 2. Create a test folder
    console.log('2️⃣ Creating test folder "Hello"...');
    const folderName = 'Hello';
    await dockerManager.createFolderInContainer(TEST_PROJECT_ID, folderName);
    console.log(`✅ Created folder: ${folderName}\n`);
    
    // 3. Wait a moment for folder sync
    console.log('3️⃣ Waiting for folder sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Create a test file inside the folder
    console.log('4️⃣ Creating test file "hello.py" inside Hello folder...');
    const testContent = 'print("Hello from Python!")\n# This is a test file created by terminal';
    await dockerManager.writeFileToContainer(TEST_PROJECT_ID, `${folderName}/hello.py`, testContent);
    console.log(`✅ Created file: ${folderName}/hello.py\n`);
    
    // 5. Wait for file sync
    console.log('5️⃣ Waiting for file sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. Force sync to ensure everything is synced
    console.log('6️⃣ Force syncing files...');
    const fileSyncResult = await terminalFileWatcher.forcSync(TEST_PROJECT_ID, TEST_USER_ID);
    console.log('File sync result:', fileSyncResult);
    console.log('');
    
    // 7. Check watcher status
    console.log('7️⃣ Checking watcher status...');
    const fileStatus = terminalFileWatcher.getWatcherStatus(TEST_PROJECT_ID);
    console.log('File watcher status:', fileStatus);
    console.log('');
    
    // 8. Verify the file exists in the container
    console.log('8️⃣ Verifying file exists in container...');
    const fileContent = await dockerManager.readFileFromContainer(TEST_PROJECT_ID, `${folderName}/hello.py`);
    if (fileContent) {
      console.log(`✅ File content verified: ${fileContent.substring(0, 50)}...`);
    } else {
      console.log('❌ File not found in container');
    }
    console.log('');
    
    // 9. List all files in container
    console.log('9️⃣ Listing all files in container...');
    const allFiles = await dockerManager.listFilesInContainer(TEST_PROJECT_ID);
    console.log('All files in container:', allFiles);
    console.log('');
    
    // 10. Check database directly
    console.log('🔟 Checking database directly...');
    const { default: File } = await import('./models/file.js');
    const { default: Folder } = await import('./models/Folder.js');
    
    // Check if Hello folder exists
    const helloFolder = await Folder.findOne({ 
      project: TEST_PROJECT_ID, 
      name: 'Hello' 
    });
    
    if (helloFolder) {
      console.log(`✅ Found Hello folder in database:`, {
        id: helloFolder._id,
        name: helloFolder.name,
        path: helloFolder.path,
        isRoot: helloFolder.isRoot
      });
      
      // Check if hello.py file exists and is associated with the folder
      const helloFile = await File.findOne({ 
        project: TEST_PROJECT_ID, 
        name: 'hello.py',
        folder: helloFolder._id
      });
      
      if (helloFile) {
        console.log(`✅ Found hello.py file in database associated with Hello folder:`, {
          id: helloFile._id,
          name: helloFile.name,
          path: helloFile.path,
          folder: helloFile.folder
        });
      } else {
        console.log('❌ hello.py file not found in database or not associated with Hello folder');
        
        // Check if file exists at all
        const anyHelloFile = await File.findOne({ 
          project: TEST_PROJECT_ID, 
          name: 'hello.py'
        });
        
        if (anyHelloFile) {
          console.log('⚠️ Found hello.py file but it\'s not associated with Hello folder:', {
            id: anyHelloFile._id,
            name: anyHelloFile.name,
            path: anyHelloFile.path,
            folder: anyHelloFile.folder
          });
        }
      }
    } else {
      console.log('❌ Hello folder not found in database');
    }
    console.log('');
    
    console.log('✅ Test completed!');
    console.log('\n📋 Analysis:');
    console.log('- If you see "Found hello.py file in database associated with Hello folder", the fix worked!');
    console.log('- If you see "Found hello.py file but it\'s not associated with Hello folder", there\'s still an issue');
    console.log('- Check the console logs above for detailed debugging information');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await terminalFileWatcher.stopWatching(TEST_PROJECT_ID);
    console.log('✅ Cleanup completed');
  }
}

// Run the test
testFolderPathFix().catch(console.error);

