import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import File from './models/file.js';
import Folder from './models/Folder.js';
import Project from './models/Project.js';

async function clearWorkspace(projectId = null) {
  try {
    console.log(`🧹 Starting workspace cleanup...`);
    
    const dockerManager = getDockerWorkspaceManager();
    
    if (projectId) {
      // Clear specific project workspace
      await clearProjectWorkspace(projectId, dockerManager);
    } else {
      // Clear all project workspaces
      const projects = await Project.find({});
      console.log(`📋 Found ${projects.length} projects to clear`);
      
      for (const project of projects) {
        try {
          await clearProjectWorkspace(project._id.toString(), dockerManager);
        } catch (error) {
          console.warn(`⚠️ Failed to clear project ${project._id}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Workspace cleanup completed`);
    
  } catch (error) {
    console.error(`❌ Workspace cleanup failed: ${error.message}`);
  }
}

async function clearProjectWorkspace(projectId, dockerManager) {
  try {
    console.log(`🧹 Clearing workspace for project: ${projectId}`);
    
    // Get project container
    const containerInfo = await dockerManager.getProjectContainer(projectId);
    if (!containerInfo || !containerInfo.container) {
      console.warn(`⚠️ No container found for project ${projectId}`);
      return;
    }
    
    // Clear all files from workspace directory
    await dockerManager.executeInContainer(containerInfo.container, [
      'rm', '-rf', '/workspace/*'
    ]);
    
    // Recreate the workspace directory structure
    await dockerManager.executeInContainer(containerInfo.container, [
      'mkdir', '-p', '/workspace'
    ]);
    
    // Set proper permissions
    await dockerManager.executeInContainer(containerInfo.container, [
      'chmod', '777', '/workspace'
    ]);
    
    // Clear database files for this project
    const deletedFiles = await File.deleteMany({ project: projectId });
    console.log(`🗑️ Deleted ${deletedFiles.deletedCount} files from database`);
    
    // Clear database folders for this project (except root)
    const deletedFolders = await Folder.deleteMany({ 
      project: projectId,
      isRoot: { $ne: true }
    });
    console.log(`🗑️ Deleted ${deletedFolders.deletedCount} folders from database`);
    
    // Reset root folder
    const project = await Project.findById(projectId);
    if (project) {
      const projectOwnerId = project.owner || project.creatorId;
      
      // Remove existing root folder
      await Folder.deleteMany({ 
        project: projectId,
        isRoot: true
      });
      
      // Create fresh root folder
      await Folder.create({
        name: 'Root',
        path: 'Root',
        project: projectId,
        owner: projectOwnerId,
        isRoot: true,
        level: 0
      });
      
      console.log(`📁 Recreated root folder for project: ${projectId}`);
    }
    
    console.log(`✅ Cleared workspace for project: ${projectId}`);
    
  } catch (error) {
    console.error(`❌ Failed to clear workspace for project ${projectId}: ${error.message}`);
    throw error;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectId = process.argv[2]; // Optional project ID
  
  clearWorkspace(projectId).then(() => {
    console.log('Workspace clearing completed');
    process.exit(0);
  }).catch(error => {
    console.error('Workspace clearing failed:', error);
    process.exit(1);
  });
}

export default clearWorkspace;
