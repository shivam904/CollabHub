import express from 'express';
import { getProjectMessages, sendMessage } from '../Controllers/messageController.js';
import { authenticateFirebaseToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateFirebaseToken);

// Get messages for a project
router.get('/project/:projectId', getProjectMessages);

// Send a message to a project
router.post('/project/:projectId', sendMessage);

export default router;
