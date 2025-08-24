import express from 'express';
import { 
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  addMember,
  removeMember,
  searchProjects,
  getPublicProjects,
  createProjectInvite,
  acceptProjectInvite,
} from '../Controllers/projectController.js';
import terminalFileWatcher from '../services/terminalFileWatcher.js';

const router = express.Router();

// Project CRUD operations
router.post('/new', createProject);
router.get('/getProjects', getProjects);

// Invite links
router.post('/:projectId/invite', createProjectInvite);
router.post('/accept-invite', acceptProjectInvite);

// Search and discovery (must come before parameterized routes)
router.get('/search', searchProjects);
router.get('/public', getPublicProjects);

// Parameterized routes (must come after specific routes)
router.get('/:projectId', getProject);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

// Project statistics
router.get('/:projectId/stats', getProjectStats);

// Member management
router.post('/:projectId/members', addMember);
router.delete('/:projectId/members', removeMember);

// Workspace synchronization
router.post('/:projectId/sync', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Import Docker workspace manager
    const { getDockerWorkspaceManager } = await import('../services/dockerWorkspace.js');
    const dockerManager = getDockerWorkspaceManager();
    
    // Trigger sync
    const syncResult = await dockerManager.triggerSync(projectId);
    
    if (syncResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Sync failed',
        error: syncResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'Workspace synchronized successfully',
      result: syncResult
    });
    
  } catch (error) {
    console.error('Sync endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync workspace',
      error: error.message
    });
  }
});

// Cleanup workspace containers and remove duplicates
router.post('/:projectId/cleanup', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Import cleanup script
    const cleanupContainer = (await import('../cleanup-container.js')).default;
    
    // Run cleanup to remove duplicates and orphaned files
    await cleanupContainer(projectId);
    
    // Also cleanup old containers
    const { getDockerWorkspaceManager } = await import('../services/dockerWorkspace.js');
    const dockerManager = getDockerWorkspaceManager();
    await dockerManager.cleanupProjectWorkspace(projectId);
    
    res.json({
      success: true,
      message: 'Workspace cleaned up successfully - duplicates removed'
    });
    
  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup workspace',
      error: error.message
    });
  }
});

// Clear workspace completely (remove all files and folders)
router.post('/:projectId/clear-workspace', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Import clear workspace script
    const clearWorkspace = (await import('../clear-workspace.js')).default;
    
    // Clear the workspace completely
    await clearWorkspace(projectId);
    
    res.json({
      success: true,
      message: 'Workspace cleared completely - all files and folders removed'
    });
    
  } catch (error) {
    console.error('Clear workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear workspace',
      error: error.message
    });
  }
});

// Clear all workspaces (admin function)
router.post('/clear-all-workspaces', async (req, res) => {
  try {
    // Import clear workspace script
    const clearWorkspace = (await import('../clear-workspace.js')).default;
    
    // Clear all workspaces
    await clearWorkspace();
    
    res.json({
      success: true,
      message: 'All workspaces cleared completely'
    });
    
  } catch (error) {
    console.error('Clear all workspaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all workspaces',
      error: error.message
    });
  }
});

// Duplicate prevention and cleanup
router.post('/:projectId/prevent-duplicates', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Import duplicate prevention service
    const duplicatePreventionService = (await import('../services/duplicatePrevention.js')).default;
    
    // Run full cleanup to prevent duplicates
    const result = await duplicatePreventionService.fullCleanup(projectId);
    
    res.json({
      success: true,
      message: 'Duplicate prevention completed',
      result
    });
    
  } catch (error) {
    console.error('Duplicate prevention error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prevent duplicates',
      error: error.message
    });
  }
});

// Terminal file watcher management
router.get('/:projectId/watcher/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    const status = terminalFileWatcher.getWatcherStatus(projectId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Watcher status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get watcher status',
      error: error.message
    });
  }
});

router.post('/:projectId/watcher/start', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    
    // Get project to find owner
    const { default: Project } = await import('../models/Project.js');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const projectOwnerId = project.owner || project.creatorId;
    const started = await terminalFileWatcher.startWatching(projectId, projectOwnerId);
    
    res.json({
      success: started,
      message: started ? 'File watcher started' : 'Failed to start file watcher'
    });
  } catch (error) {
    console.error('Watcher start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start watcher',
      error: error.message
    });
  }
});

router.post('/:projectId/watcher/stop', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    await terminalFileWatcher.stopWatching(projectId);
    
    res.json({
      success: true,
      message: 'File watcher stopped'
    });
  } catch (error) {
    console.error('Watcher stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop watcher',
      error: error.message
    });
  }
});

router.post('/:projectId/force-sync', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project to find owner
    const { default: Project } = await import('../models/Project.js');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const projectOwnerId = project.owner || project.creatorId;
    const result = await terminalFileWatcher.forcSync(projectId, projectOwnerId);
    
    res.json(result);
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Force sync failed',
      error: error.message
    });
  }
});

// Emergency stop all watchers
router.post('/emergency-stop', async (req, res) => {
  try {
    terminalFileWatcher.emergencyStop();
    
    res.json({
      success: true,
      message: 'All file watchers emergency stopped'
    });
  } catch (error) {
    console.error('Emergency stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Emergency stop failed',
      error: error.message
    });
  }
});

// Stop all watchers gracefully
router.post('/stop-all', async (req, res) => {
  try {
    await terminalFileWatcher.stopAll();
    
    res.json({
      success: true,
      message: 'All file watchers stopped gracefully'
    });
  } catch (error) {
    console.error('Stop all error:', error);
    res.status(500).json({
      success: false,
      message: 'Stop all failed',
      error: error.message
    });
  }
});

export default router;