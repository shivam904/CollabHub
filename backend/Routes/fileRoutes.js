import express from 'express';
import { 
  createFile,
  getFilesByProject,
  getFilesByFolder,
  getFileById,
  updateFile,
  deleteFile,
  getFileContent,
  updateFileContent,
  createFileVersion,
  getFileVersions,
  lockFile,
  unlockFile,
  searchFiles,
  uploadFile,
  downloadFile,
  shareFile,
  getSharedFiles,
  duplicateFile,
  moveFile,
  copyFile,
  assignFileRole
} from '../Controllers/fileController.js';

const router = express.Router();

// Specific routes (must come before parameterized routes)
router.post('/create', createFile);
router.post('/upload', uploadFile);
router.get('/project/:projectId', getFilesByProject);
router.get('/folder/:folderId', getFilesByFolder);
router.get('/shared/:userId', getSharedFiles);
router.get('/search/:projectId', searchFiles);

// Parameterized routes (must come after specific routes)
router.get('/:fileId', getFileById);
router.put('/:fileId', updateFile);
router.delete('/:fileId', deleteFile);

// File content operations
router.get('/:fileId/content', getFileContent);
router.put('/:fileId/content', updateFileContent);

// Version control
router.post('/:fileId/versions', createFileVersion);
router.get('/:fileId/versions', getFileVersions);

// Collaboration features
router.post('/:fileId/lock', lockFile);
router.post('/:fileId/unlock', unlockFile);

// File operations
router.post('/:fileId/duplicate', duplicateFile);
router.put('/:fileId/move', moveFile);
router.post('/:fileId/copy', copyFile);

// File download
router.get('/:fileId/download', downloadFile);

// Sharing and permissions
router.post('/:fileId/share', shareFile);

// File-level role assignment
router.post('/:fileId/assign', assignFileRole);

export default router; 