import mongoose from 'mongoose';
import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import terminalFileWatcher from './services/terminalFileWatcher.js';
import duplicatePreventionService from './services/duplicatePrevention.js';
import File from './models/file.js';
import Folder from './models/Folder.js';
import Project from './models/Project.js';

// Test configuration
const TEST_PROJECT_ID = 'test-project-123';
const TEST_USER_ID = 'test-user-123';

class SyncTestSuite {
  constructor() {
    this.dockerManager = getDockerWorkspaceManager();
    this.testResults = [];
  }

  /**
   * Initialize test environment
   */
  async initialize() {
    console.log('🧪 Initializing sync test suite...');
    
    try {
      // Create test project if it doesn't exist
      let project = await Project.findById(TEST_PROJECT_ID);
      if (!project) {
        project = await Project.create({
          _id: TEST_PROJECT_ID,
          name: 'Sync Test Project',
          description: 'Test project for file/folder sync validation',
          owner: TEST_USER_ID,
          creatorId: TEST_USER_ID,
          isPublic: false
        });
        console.log('✅ Created test project');
      }

      // Ensure Docker container exists
      try {
        await this.dockerManager.getProjectContainer(TEST_PROJECT_ID);
        console.log('✅ Docker container ready');
      } catch (error) {
        console.log('⚠️ Docker container not ready, creating...');
        await this.dockerManager.createProjectWorkspace(TEST_PROJECT_ID, 'Sync Test Project');
      }

      // Start file watcher
      const watcherStarted = await terminalFileWatcher.startWatching(TEST_PROJECT_ID, TEST_USER_ID);
      if (watcherStarted) {
        console.log('✅ File watcher started');
      } else {
        console.log('⚠️ File watcher failed to start');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error.message);
      return false;
    }
  }

  /**
   * Test 1: File creation via terminal
   */
  async testFileCreation() {
    console.log('\n📄 Test 1: File creation via terminal');
    
    try {
      const testFileName = `test-file-${Date.now()}.txt`;
      const testContent = 'This is a test file created via terminal';
      
      // Create file in container
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, testFileName, testContent);
      console.log(`✅ Created file in container: ${testFileName}`);
      
      // Wait for watcher to detect and sync
      await this.sleep(3000);
      
      // Check if file exists in database
      const dbFile = await File.findOne({ 
        project: TEST_PROJECT_ID, 
        name: testFileName 
      });
      
      if (dbFile) {
        console.log(`✅ File synced to database: ${dbFile.name}`);
        this.testResults.push({ test: 'File Creation', status: 'PASS' });
        return true;
      } else {
        console.log('❌ File not found in database');
        this.testResults.push({ test: 'File Creation', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ File creation test failed:', error.message);
      this.testResults.push({ test: 'File Creation', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 2: Folder creation via terminal
   */
  async testFolderCreation() {
    console.log('\n📁 Test 2: Folder creation via terminal');
    
    try {
      const testFolderName = `test-folder-${Date.now()}`;
      
      // Create folder in container
      await this.dockerManager.createFolderInContainer(TEST_PROJECT_ID, testFolderName);
      console.log(`✅ Created folder in container: ${testFolderName}`);
      
      // Wait for watcher to detect and sync
      await this.sleep(3000);
      
      // Check if folder exists in database
      const dbFolder = await Folder.findOne({ 
        project: TEST_PROJECT_ID, 
        name: testFolderName 
      });
      
      if (dbFolder) {
        console.log(`✅ Folder synced to database: ${dbFolder.name}`);
        this.testResults.push({ test: 'Folder Creation', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Folder not found in database');
        this.testResults.push({ test: 'Folder Creation', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ Folder creation test failed:', error.message);
      this.testResults.push({ test: 'Folder Creation', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 3: Nested folder creation
   */
  async testNestedFolderCreation() {
    console.log('\n📁 Test 3: Nested folder creation');
    
    try {
      const parentFolder = `parent-${Date.now()}`;
      const childFolder = `${parentFolder}/child-${Date.now()}`;
      
      // Create nested folders in container
      await this.dockerManager.createFolderInContainer(TEST_PROJECT_ID, childFolder);
      console.log(`✅ Created nested folders in container: ${childFolder}`);
      
      // Wait for watcher to detect and sync
      await this.sleep(3000);
      
      // Check if both folders exist in database
      const parentDbFolder = await Folder.findOne({ 
        project: TEST_PROJECT_ID, 
        name: parentFolder.split('/')[0] 
      });
      
      const childDbFolder = await Folder.findOne({ 
        project: TEST_PROJECT_ID, 
        name: childFolder.split('/')[1] 
      });
      
      if (parentDbFolder && childDbFolder) {
        console.log(`✅ Nested folders synced to database: ${parentFolder}, ${childFolder}`);
        this.testResults.push({ test: 'Nested Folder Creation', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Nested folders not found in database');
        this.testResults.push({ test: 'Nested Folder Creation', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ Nested folder creation test failed:', error.message);
      this.testResults.push({ test: 'Nested Folder Creation', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 4: File in folder creation
   */
  async testFileInFolderCreation() {
    console.log('\n📄 Test 4: File in folder creation');
    
    try {
      const folderName = `file-test-${Date.now()}`;
      const fileName = `${folderName}/test-file.txt`;
      const fileContent = 'This is a test file in a folder';
      
      // Create folder and file in container
      await this.dockerManager.createFolderInContainer(TEST_PROJECT_ID, folderName);
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, fileName, fileContent);
      console.log(`✅ Created file in folder: ${fileName}`);
      
      // Wait for watcher to detect and sync
      await this.sleep(3000);
      
      // Check if both folder and file exist in database
      const dbFolder = await Folder.findOne({ 
        project: TEST_PROJECT_ID, 
        name: folderName 
      });
      
      const dbFile = await File.findOne({ 
        project: TEST_PROJECT_ID, 
        name: 'test-file.txt',
        folder: dbFolder?._id 
      });
      
      if (dbFolder && dbFile) {
        console.log(`✅ File in folder synced to database: ${fileName}`);
        this.testResults.push({ test: 'File in Folder Creation', status: 'PASS' });
        return true;
      } else {
        console.log('❌ File in folder not found in database');
        this.testResults.push({ test: 'File in Folder Creation', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ File in folder creation test failed:', error.message);
      this.testResults.push({ test: 'File in Folder Creation', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 5: Duplicate prevention
   */
  async testDuplicatePrevention() {
    console.log('\n🛡️ Test 5: Duplicate prevention');
    
    try {
      const testFileName = `duplicate-test-${Date.now()}.txt`;
      const testContent = 'Duplicate test content';
      
      // Create file in container
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, testFileName, testContent);
      console.log(`✅ Created first file: ${testFileName}`);
      
      // Wait for sync
      await this.sleep(2000);
      
      // Try to create the same file again
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, testFileName, testContent);
      console.log(`✅ Attempted to create duplicate file: ${testFileName}`);
      
      // Wait for sync
      await this.sleep(2000);
      
      // Check for duplicates in database
      const duplicateFiles = await File.find({ 
        project: TEST_PROJECT_ID, 
        name: testFileName 
      });
      
      if (duplicateFiles.length === 1) {
        console.log(`✅ Duplicate prevention working: ${duplicateFiles.length} file(s) found`);
        this.testResults.push({ test: 'Duplicate Prevention', status: 'PASS' });
        return true;
      } else {
        console.log(`❌ Duplicate prevention failed: ${duplicateFiles.length} files found`);
        this.testResults.push({ test: 'Duplicate Prevention', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ Duplicate prevention test failed:', error.message);
      this.testResults.push({ test: 'Duplicate Prevention', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 6: Cleanup and sync operations
   */
  async testCleanupAndSync() {
    console.log('\n🧹 Test 6: Cleanup and sync operations');
    
    try {
      // Create some test files and folders
      const testFiles = [
        'cleanup-test1.txt',
        'cleanup-test2.txt',
        'cleanup-test3.txt'
      ];
      
      const testFolders = [
        'cleanup-folder1',
        'cleanup-folder2'
      ];
      
      // Create files in container
      for (const fileName of testFiles) {
        await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, fileName, `Content for ${fileName}`);
      }
      
      // Create folders in container
      for (const folderName of testFolders) {
        await this.dockerManager.createFolderInContainer(TEST_PROJECT_ID, folderName);
      }
      
      console.log('✅ Created test files and folders');
      
      // Wait for sync
      await this.sleep(3000);
      
      // Test cleanup operation
      const cleanupResult = await duplicatePreventionService.fullCleanup(TEST_PROJECT_ID);
      console.log('✅ Cleanup completed:', cleanupResult);
      
      // Test sync operation
      const syncResult = await duplicatePreventionService.fullSync(TEST_PROJECT_ID, TEST_USER_ID);
      console.log('✅ Sync completed:', syncResult);
      
      this.testResults.push({ test: 'Cleanup and Sync', status: 'PASS' });
      return true;
    } catch (error) {
      console.error('❌ Cleanup and sync test failed:', error.message);
      this.testResults.push({ test: 'Cleanup and Sync', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 7: File modification
   */
  async testFileModification() {
    console.log('\n📝 Test 7: File modification');
    
    try {
      const testFileName = `modify-test-${Date.now()}.txt`;
      const originalContent = 'Original content';
      const modifiedContent = 'Modified content';
      
      // Create file in container
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, testFileName, originalContent);
      console.log(`✅ Created file: ${testFileName}`);
      
      // Wait for sync
      await this.sleep(2000);
      
      // Modify file in container
      await this.dockerManager.writeFileToContainer(TEST_PROJECT_ID, testFileName, modifiedContent);
      console.log(`✅ Modified file: ${testFileName}`);
      
      // Wait for sync
      await this.sleep(2000);
      
      // Check if modification was synced
      const dbFile = await File.findOne({ 
        project: TEST_PROJECT_ID, 
        name: testFileName 
      });
      
      if (dbFile && dbFile.content === modifiedContent) {
        console.log(`✅ File modification synced: ${testFileName}`);
        this.testResults.push({ test: 'File Modification', status: 'PASS' });
        return true;
      } else {
        console.log('❌ File modification not synced');
        this.testResults.push({ test: 'File Modification', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.error('❌ File modification test failed:', error.message);
      this.testResults.push({ test: 'File Modification', status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive sync test suite...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Test initialization failed');
      return;
    }
    
    const tests = [
      this.testFileCreation.bind(this),
      this.testFolderCreation.bind(this),
      this.testNestedFolderCreation.bind(this),
      this.testFileInFolderCreation.bind(this),
      this.testDuplicatePrevention.bind(this),
      this.testCleanupAndSync.bind(this),
      this.testFileModification.bind(this)
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
      try {
        const result = await test();
        if (result) passedTests++;
      } catch (error) {
        console.error('❌ Test execution error:', error.message);
      }
    }
    
    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! File and folder sync is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.');
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Stop file watcher
      await terminalFileWatcher.stopWatching(TEST_PROJECT_ID);
      console.log('✅ File watcher stopped');
      
      // Clean up test files and folders
      const cleanupResult = await duplicatePreventionService.fullCleanup(TEST_PROJECT_ID);
      console.log('✅ Test cleanup completed:', cleanupResult);
      
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new SyncTestSuite();
  
  testSuite.runAllTests()
    .then(() => testSuite.cleanup())
    .then(() => {
      console.log('\n🏁 Test suite completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export default SyncTestSuite;
