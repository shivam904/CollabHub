import express from 'express';
const router = express.Router();
import { createUser, getUserProfile, updateUserProfile } from '../Controllers/userController.js';

// Create new user (for first login)
router.post('/', createUser);

// Get user profile by Firebase UID
router.get('/:uid', getUserProfile);

// Update user profile by Firebase UID
router.put('/:uid', updateUserProfile);

export default router;