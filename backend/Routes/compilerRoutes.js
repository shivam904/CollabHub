import express from 'express';
import { compileAndExecute, getSupportedLanguages, checkSupport } from '../Controllers/compilerController.js';

const router = express.Router();

// Compile and execute code
router.post('/execute', compileAndExecute);

// Get supported languages
router.get('/languages', getSupportedLanguages);

// Check if file type is supported
router.get('/support/:fileName', checkSupport);

export default router;
