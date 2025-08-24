import express from 'express';
import { 
  getOptimizedProject,
  getOptimizedUserProjects,
  getOptimizedProjectFiles,
  getOptimizedFolderTree,
  getOptimizedProjectAnalytics,
  bulkUpdateFiles,
  getPerformanceDashboard,
  globalSearch,
  getTrendingProjects
} from '../Controllers/optimizedController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/trending', getTrendingProjects);

// Protected routes (authentication required)
router.use(authenticateUser);

// Project routes with optimization
router.get('/projects/:projectId', getOptimizedProject);
router.get('/projects/:projectId/files', getOptimizedProjectFiles);
router.get('/projects/:projectId/folder-tree', getOptimizedFolderTree);
router.get('/projects/:projectId/analytics', getOptimizedProjectAnalytics);

// User projects
router.get('/user/projects', getOptimizedUserProjects);

// Bulk operations
router.put('/projects/:projectId/files/bulk', bulkUpdateFiles);

// Search
router.get('/search', globalSearch);

// Performance monitoring (admin only)
router.get('/admin/performance', getPerformanceDashboard);

export default router;
