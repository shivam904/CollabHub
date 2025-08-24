import express from 'express';
import { 
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  getFolderTree,
  getFolderContents,
  moveFolder,
  copyFolder,
  shareFolder,
  getSharedFolders,
  searchFolders,
  cleanupProject,
  syncProject,
  getProjectStats
} from '../Controllers/folderController.js';

const router = express.Router();

// Specific routes (must come before parameterized routes)
router.post('/create', createFolder);
router.get('/project/:projectId', getFolders);
router.get('/shared/:userId', getSharedFolders);
router.get('/search/:projectId', searchFolders);

// Project management routes
router.post('/project/:projectId/cleanup', cleanupProject);
router.post('/project/:projectId/sync', syncProject);
router.get('/project/:projectId/stats', getProjectStats);

// Parameterized routes (must come after specific routes)
router.get('/:folderId', getFolderById);
router.put('/:folderId', updateFolder);
router.delete('/:folderId', deleteFolder);

// Advanced folder operations
router.get('/:folderId/tree', getFolderTree);
router.get('/:folderId/contents', getFolderContents);
router.put('/:folderId/move', moveFolder);
router.post('/:folderId/copy', copyFolder);

// Sharing and permissions
router.post('/:folderId/share', shareFolder);

export default router; 