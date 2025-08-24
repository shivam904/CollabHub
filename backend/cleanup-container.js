import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import File from './models/file.js';
import Folder from './models/Folder.js';

async function cleanupContainer(projectId) {
  try {
    console.log(`🧹 Starting container cleanup for project: ${projectId}`);
    
    const dockerManager = getDockerWorkspaceManager();
    
    // Get all files in database for this project
    const dbFiles = await File.find({ project: projectId }).populate('folder', 'name path');
    console.log(`📄 Found ${dbFiles.length} files in database`);
    
    // Get all files in container
    const containerFiles = await dockerManager.listFilesInContainer(projectId);
    console.log(`📄 Found ${containerFiles.length} files in container`);
    
    // Create a map of expected file locations
    const expectedFiles = new Map();
    for (const file of dbFiles) {
      const fullPath = file.path || file.name;
      expectedFiles.set(fullPath, file);
    }
    
    // Find files that exist in container but not in database (orphaned files)
    const orphanedFiles = containerFiles.filter(filePath => !expectedFiles.has(filePath));
    
    console.log(`🗑️ Found ${orphanedFiles.length} orphaned files in container`);
    
    // Remove orphaned files from container
    for (const filePath of orphanedFiles) {
      try {
        await dockerManager.deleteFileFromContainer(projectId, filePath);
        console.log(`✅ Removed orphaned file: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove orphaned file ${filePath}: ${error.message}`);
      }
    }
    
    // Check for duplicate files in database (same name, different folders)
    const fileGroups = new Map();
    for (const file of dbFiles) {
      const key = file.name;
      if (!fileGroups.has(key)) {
        fileGroups.set(key, []);
      }
      fileGroups.get(key).push(file);
    }
    
    // Find and remove duplicate files
    for (const [fileName, files] of fileGroups) {
      if (files.length > 1) {
        console.log(`⚠️ Found ${files.length} files with name: ${fileName}`);
        
        // Keep the file with the most specific path (longest path)
        files.sort((a, b) => {
          const pathA = a.path || a.name;
          const pathB = b.path || b.name;
          return pathB.length - pathA.length; // Keep the one with longer path
        });
        
        // Remove duplicates (keep the first one)
        const filesToRemove = files.slice(1);
        for (const file of filesToRemove) {
          try {
            await File.findByIdAndDelete(file._id);
            console.log(`🗑️ Removed duplicate file from database: ${file.path || file.name}`);
          } catch (error) {
            console.warn(`⚠️ Failed to remove duplicate file ${file.path || file.name}: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Container cleanup completed for project: ${projectId}`);
    
  } catch (error) {
    console.error(`❌ Container cleanup failed: ${error.message}`);
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error('Usage: node cleanup-container.js <projectId>');
    process.exit(1);
  }
  
  cleanupContainer(projectId).then(() => {
    console.log('Cleanup completed');
    process.exit(0);
  }).catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

export default cleanupContainer;
