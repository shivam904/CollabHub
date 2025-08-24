import express from 'express';
import {
  createReactProject,
  runReactProject,
  startReactDevServer,
  buildReactProject,
  getProjectStatus,
  stopReactDevServer,
  installDependencies
} from '../Controllers/reactProjectController.js';

const router = express.Router();

// Create a new React project
router.post('/create', createReactProject);

// Run a React project (create + install + start)
router.post('/run', runReactProject);

// Start React development server
router.post('/start', startReactDevServer);

// Build React project for production
router.post('/build', buildReactProject);

// Get React project status
router.post('/status', getProjectStatus);

// Stop React development server
router.post('/stop', stopReactDevServer);

// Install dependencies for React project
router.post('/install', installDependencies);

export default router;
