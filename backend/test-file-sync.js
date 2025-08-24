import terminalFileWatcher from './services/terminalFileWatcher.js';
import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import Project from './models/Project.js';

/**
 * Test script to verify file synchronization
 * Run with: node test-file-sync.js
 */

async function testFileSync() {
  try {
    console.log('🧪 Testing file synchronization...');
    
    // Get the first available project
    const project = await Project.findOne();
    if (!project) {
      console.log('❌ No projects found. Please create a project first.');
      return;
    }
    
    const projectId = project._id.toString();
    const projectOwnerId = project.owner || project.creatorId;
    
    console.log(`📁 Testing with project: ${project.name} (${projectId})`);
    
    // Start file watcher
    console.log('🔍 Starting file watcher...');
    const watcherStarted = await terminalFileWatcher.startWatching(projectId, projectOwnerId);
    
    if (!watcherStarted) {
      console.log('❌ Failed to start file watcher');
      return;
    }
    
    console.log('✅ File watcher started');
    
    // Get Docker workspace manager
    const dockerManager = getDockerWorkspaceManager();
    
    // Create a test file in the container
    console.log('📄 Creating test file in container...');
    const testFileName = `test-${Date.now()}.js`;
    const testContent = `// Test file created at ${new Date().toISOString()}
console.log('Hello from test file!');`;
    
    const container = await dockerManager.getProjectContainer(projectId);
    await dockerManager.executeInContainer(container.container, [
      'sh', '-c', `echo '${testContent}' > /workspace/${testFileName}`
    ]);
    
    console.log(`✅ Test file created: ${testFileName}`);
    
    // Wait for file sync
    console.log('⏳ Waiting for file synchronization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if file was synced to database
    const { default: File } = await import('./models/file.js');
    const syncedFile = await File.findOne({ 
      project: projectId, 
      name: testFileName 
    });
    
    if (syncedFile) {
      console.log('✅ File successfully synced to database!');
      console.log(`📄 File details: ${syncedFile.name} (${syncedFile.size} bytes)`);
    } else {
      console.log('❌ File not found in database');
      
      // Check watcher status
      const status = terminalFileWatcher.getWatcherStatus(projectId);
      console.log('📊 Watcher status:', status);
      
      // Try manual sync
      console.log('🔄 Attempting manual sync...');
      await terminalFileWatcher.forcSync(projectId, projectOwnerId);
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryFile = await File.findOne({ 
        project: projectId, 
        name: testFileName 
      });
      
      if (retryFile) {
        console.log('✅ File synced after manual sync!');
      } else {
        console.log('❌ File still not synced after manual sync');
      }
    }
    
    // Clean up
    console.log('🧹 Cleaning up...');
    await terminalFileWatcher.stopWatching(projectId);
    
    // Remove test file from container
    await dockerManager.executeInContainer(container.container, [
      'rm', '-f', `/workspace/${testFileName}`
    ]);
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFileSync();
