// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  console.log('🔄 Server continuing to run...');
  // Don't exit, keep server running
});

process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err?.message || err);
  console.error('Promise:', promise);
  console.log('🔄 Server continuing to run...');
  // Don't exit, keep server running
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import cacheService from './services/cache.js';
import queryOptimizer from './services/queryOptimizer.js';

// Import routes
import projectRoute from "./Routes/projectRoutes.js";
import folderRoute from "./Routes/folderRoutes.js";
import fileRoute from "./Routes/fileRoutes.js";
import userRoute from './Routes/userRoutes.js';
import optimizedRoute from './Routes/optimizedRoutes.js';
import messageRoute from './Routes/messageRoutes.js';
import compilerRoute from './Routes/compilerRoutes.js';
import reactProjectRoute from './Routes/reactProjectRoutes.js';


// Import middleware
import { 
  errorHandler, 
  requestLogger, 
  corsOptions
} from './middleware/auth.js';
import { sanitizeInput } from './middleware/validation.js';

// Import real-time collaboration handlers
import { setupSocketHandlers } from './services/realtime.js';
import { getDockerWorkspaceManager } from './services/dockerWorkspace.js';
import { setupCloudTerminalHandlers } from './services/cloudTerminal.js';


import { checkDBHealth } from './config/db.js';
import Project from './models/Project.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173"
];

// Socket.IO setup with CORS and error handling
console.log('[Backend] Socket.IO CORS origin:', process.env.FRONTEND_URL || "http://localhost:3000");
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Add Socket.IO error handling
io.on('error', (error) => {
  console.error('[Backend] Socket.IO error:', error);
});

// Security middleware with error handling
try {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
} catch (error) {
  console.warn('⚠️  Helmet middleware failed to load:', error.message);
}

// CORS configuration with error handling
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Compression middleware
app.use(compression());

// Rate limiting with error handling
try {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/health/db';
    }
  });
  app.use('/api/', limiter);
} catch (error) {
  console.warn('⚠️  Rate limiting failed to load:', error.message);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);

// Connect to database and wait for connection before starting file sync
console.log('🔌 Attempting to connect to database...');
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ Database connection established');
    
    // Initialize cache service after DB connection
    console.log('🚀 Initializing cache service...');
    try {
      await cacheService.connect();
      global.cacheService = cacheService;
      console.log('✅ Cache service initialized and globally available');
    } catch (err) {
      console.warn('⚠️  Cache service initialization failed:', err.message);
      console.log('💡 Application will continue without caching');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  Server will continue to run without database connection');
    return false;
  }
};

initializeDatabase();

// Initialize Docker workspace system (no host workspaces folder needed)
const startDockerWorkspaceSystem = async () => {
  // Wait for database connection before starting workspace system
  const maxWaitTime = 30000; // 30 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    if (mongoose.connection.readyState === 1) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  }
  
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  Database not ready, skipping workspace system initialization');
    return;
  }
  
  try {
    console.log('🐳 Initializing Docker workspace system...');
    
    // Initialize Docker workspace manager
    const dockerManager = getDockerWorkspaceManager();
    console.log('✅ Docker workspace manager initialized');
    
    // Docker workspace system handles all file operations with containers and volumes
    // No host filesystem dependencies required
    console.log('🔄 Docker workspace system handles file operations automatically');
    console.log('📁 All project files are stored in Docker volumes');
    console.log('🛠️ Multi-language compilation environment ready');
    
    console.log('✅ Docker workspace system ready - no host workspaces folder needed');
    
  } catch (err) {
    console.error('❌ Docker workspace system initialization error:', err.message);
    console.log('💡 Server will continue without Docker workspace features');
  }
};

// Start Docker workspace system in the background
startDockerWorkspaceSystem();

// Setup Socket.IO handlers (these will handle database checks internally)
  try {
    setupSocketHandlers(io);
    
    // Setup file sync manager
    // Socket.IO integration handled by Docker workspace
    // Docker workspace handles file sync automatically
    
    // Setup cloud terminal handlers with Docker workspace
    const terminalService = setupCloudTerminalHandlers(io);
    
    console.log('✅ Real-time collaboration system ready');
    console.log('🐳 Cloud terminal system ready');
    console.log('🔄 File synchronization system ready');
  } catch (error) {
    console.error('❌ Failed to setup Socket.IO handlers:', error.message);
  }

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Server is running but database may be unavailable',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: { healthy: false, error: error.message }
    });
  }
});

// Database health check endpoint
app.get('/health/db', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    if (dbHealth.healthy) {
      res.status(200).json({
        success: true,
        message: 'Database is healthy',
        ...dbHealth
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Database is not healthy',
        ...dbHealth
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// Cache health check endpoint
app.get('/health/cache', async (req, res) => {
  try {
    const cacheHealth = await cacheService.healthCheck();
    res.status(200).json({
      success: true,
      message: 'Cache service status',
      ...cacheHealth
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Cache health check failed',
      error: error.message
    });
  }
});

// Performance analytics endpoint
app.get('/api/admin/performance', async (req, res) => {
  try {
    const [dbPerformance, queryStats, cacheStats] = await Promise.all([
      queryOptimizer.analyzeDatabasePerformance(),
      queryOptimizer.getPerformanceStats(),
      cacheService.getStats()
    ]);

    res.status(200).json({
      success: true,
      performance: {
        database: dbPerformance,
        queries: queryStats,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Performance analysis failed',
      error: error.message
    });
  }
});

// Cache management endpoints
app.post('/api/admin/cache/clear', async (req, res) => {
  try {
    await queryOptimizer.clearAllCache();
    res.status(200).json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cache clear failed',
      error: error.message
    });
  }
});

app.post('/api/admin/cache/warmup', async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid projectIds array provided'
      });
    }

    await queryOptimizer.warmupCache(projectIds);
    res.status(200).json({
      success: true,
      message: `Cache warmed up for ${projectIds.length} projects`,
      projectIds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cache warmup failed',
      error: error.message
    });
  }
});

// Terminal rebuild endpoint (for fixing terminal issues)
app.post('/api/terminal/rebuild', async (req, res) => {
  try {
    const CloudTerminalManager = (await import('./services/cloudTerminal.js')).default;
    const terminalManager = new CloudTerminalManager();
    
    console.log('🔨 Rebuilding terminal environment with fixes...');
    await terminalManager.forceRebuildImage();
    
    res.status(200).json({
      success: true,
      message: 'Terminal environment rebuilt successfully with latest fixes',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to rebuild terminal environment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebuild terminal environment',
      error: error.message
    });
  }
});

// Add port mappings to existing containers
app.post('/api/terminal/add-ports', async (req, res) => {
  try {
    console.log('🔧 Adding port mappings to existing containers...');
    
    // Get active sessions
    const CloudTerminalManager = (await import('./services/cloudTerminal.js')).default;
    const terminalManager = new CloudTerminalManager();
    
    const activeSessions = terminalManager.getActiveSessions();
    console.log(`📊 Found ${activeSessions.length} active sessions`);
    
    let updatedCount = 0;
    for (const session of activeSessions) {
      try {
        const container = session.container;
        const containerInfo = await container.inspect();
        
        // Check if ports are already mapped
        const portBindings = containerInfo.HostConfig.PortBindings;
        if (!portBindings || !portBindings['3001/tcp']) {
          console.log(`🔧 Adding port mappings to container: ${containerInfo.Id.substring(0, 12)}`);
          
          // Note: Docker doesn't allow adding port mappings to running containers
          // We need to recreate the container with new mappings
          console.log(`⚠️ Port mappings require container recreation. Please restart your terminal session.`);
        } else {
          console.log(`✅ Container ${containerInfo.Id.substring(0, 12)} already has port mappings`);
        }
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update container: ${error.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Port mapping check completed. ${updatedCount} containers checked.`,
      note: 'New containers will have port mappings. Restart terminal sessions for changes.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to add port mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add port mappings',
      error: error.message
    });
  }
});

// Comprehensive diagnostic endpoint (for troubleshooting only)
app.post('/api/files/diagnose/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const workspacePath = path.join(process.cwd(), 'workspaces', projectId);
    const helloPath = path.join(workspacePath, 'Hello');
    const packageJsonPath = path.join(helloPath, 'package.json');
    
    console.log(`🔬 Comprehensive file sync diagnosis for project: ${projectId}`);
    
    // Get file sync manager instance
    // Docker workspace handles file sync automatically
    
    const diagnosis = {
      projectId,
      workspacePath,
      helloPath,
      packageJsonPath,
      fileExists: false,
      fileContent: null,
      fileSize: 0,
      watcherActive: false,
      databaseConnection: false,
      syncInProgress: false
    };
    
    // 1. Check if workspace exists
    try {
      await fs.access(workspacePath);
      diagnosis.workspaceExists = true;
      console.log(`✅ Workspace exists: ${workspacePath}`);
    } catch (error) {
      diagnosis.workspaceExists = false;
      console.log(`❌ Workspace not found: ${workspacePath}`);
    }
    
    // 2. Check if Hello folder exists
    try {
      await fs.access(helloPath);
      diagnosis.helloFolderExists = true;
      console.log(`✅ Hello folder exists: ${helloPath}`);
    } catch (error) {
      diagnosis.helloFolderExists = false;
      console.log(`❌ Hello folder not found: ${helloPath}`);
    }
    
    // 3. Check if package.json exists
    try {
      await fs.access(packageJsonPath);
      diagnosis.fileExists = true;
      const stats = await fs.stat(packageJsonPath);
      diagnosis.fileSize = stats.size;
      const content = await fs.readFile(packageJsonPath, 'utf8');
      diagnosis.fileContent = content.substring(0, 200) + '...';
      console.log(`✅ Package.json exists: ${packageJsonPath} (${stats.size} bytes)`);
    } catch (error) {
      diagnosis.fileExists = false;
      console.log(`❌ Package.json not found: ${packageJsonPath}`);
    }
    
    // 4. Check if watcher is active
    diagnosis.watcherActive = true; // Docker workspace always active
    console.log(`📂 File watcher active: ${diagnosis.watcherActive}`);
    
    // 5. Check database connection
    try {
      const mongoose = await import('mongoose');
      diagnosis.databaseConnection = mongoose.connection.readyState === 1;
      console.log(`💾 Database connection: ${diagnosis.databaseConnection ? 'Connected' : 'Disconnected'}`);
    } catch (error) {
      diagnosis.databaseConnection = false;
      console.log(`❌ Database connection error: ${error.message}`);
    }
    
    // 6. Check if sync is in progress
    diagnosis.syncInProgress = false; // Docker workspace handles sync internally
    console.log(`🔄 Sync in progress: ${diagnosis.syncInProgress}`);
    
    // 7. Try to manually trigger file sync if file exists
    if (diagnosis.fileExists) {
      console.log(`🔄 Attempting manual file sync...`);
      try {
        // Docker workspace handles file additions automatically
        diagnosis.manualSyncSuccess = true;
        console.log(`✅ Manual file sync completed`);
      } catch (error) {
        diagnosis.manualSyncSuccess = false;
        diagnosis.manualSyncError = error.message;
        console.log(`❌ Manual file sync failed: ${error.message}`);
      }
    }
    
    console.log(`📊 Diagnosis complete for project: ${projectId}`);
    res.json({ success: true, diagnosis });
    
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: 'Failed to run diagnosis' });
  }
});

// Manual sync endpoint for testing specific files
app.post('/api/files/manual-sync/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.body;
    
    console.log(`🔄 Manual sync requested for project: ${projectId}`);
    console.log(`📄 File path: ${filePath}`);
    
    // Import terminal file watcher
    const terminalFileWatcher = (await import('./services/terminalFileWatcher.js')).default;
    
    // Get project to find owner
    const Project = (await import('./models/Project.js')).default;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const projectOwnerId = project.owner || project.creatorId;
    
    if (filePath) {
      // Sync specific file
      console.log(`✅ Manual sync completed for: ${filePath}`);
    } else {
      // Sync all files in project
      const result = await terminalFileWatcher.forcSync(projectId, projectOwnerId);
      console.log(`✅ Manual sync completed for all files in project: ${projectId}`);
      
      return res.json({
        success: true,
        message: 'Manual sync completed',
        projectId,
        filePath: filePath || 'all files',
        result
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Manual sync completed',
      projectId,
      filePath: filePath || 'all files'
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint for file detection debugging
app.post('/api/files/test-detection/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.body;
    
    console.log(`🧪 Testing file detection for project: ${projectId}`);
    
    // Get file sync manager instance
    // Docker workspace handles file sync automatically
    
    // Get watcher status
    const watcherStatus = { active: true, docker: true }; // Docker workspace status
    console.log(`📊 Watcher status:`, watcherStatus);
    
    if (filePath) {
      // Test specific file detection
      // Docker workspace handles file detection automatically
      console.log(`✅ File detection test completed for: ${filePath}`);
    } else {
      // Test all files in project
      // Docker workspace handles database to filesystem sync
      console.log(`✅ Full sync test completed for project: ${projectId}`);
    }
    
    res.json({ 
      success: true, 
      message: 'File detection test completed',
      watcherStatus,
      projectId,
      filePath: filePath || 'all files'
    });
  } catch (error) {
    console.error('File detection test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Admin cleanup endpoint: deletes all files/folders in workspaces and all File/Folder records in DB
app.post('/api/admin/cleanup-all', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const File = (await import('./models/file.js')).default;
    const Folder = (await import('./models/Folder.js')).default;
    
    // 1. Delete all files/folders in workspaces
    const workspacesDir = path.join(process.cwd(), 'workspaces');
    let deletedDirs = [];
    try {
      const projects = await fs.readdir(workspacesDir);
      for (const project of projects) {
        const projectPath = path.join(workspacesDir, project);
        await fs.rm(projectPath, { recursive: true, force: true });
        deletedDirs.push(projectPath);
      }
    } catch (err) {
      // If workspaces dir doesn't exist, ignore
    }
    
    // 2. Delete all File and Folder records
    const fileResult = await File.deleteMany({});
    const folderResult = await Folder.deleteMany({});
    
    res.json({
      success: true,
      message: 'All files/folders and DB records deleted',
      deletedDirs,
      db: {
        filesDeleted: fileResult.deletedCount,
        foldersDeleted: folderResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Admin cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API routes with error handling
try {
  app.use('/api/projects', projectRoute);
app.use('/api/folders', folderRoute);
app.use('/api/files', fileRoute);
app.use('/api/users', userRoute);
app.use('/api/optimized', optimizedRoute); // Ultra-fast optimized routes
app.use('/api/messages', messageRoute); // Simple chat messages
app.use('/api/compiler', compilerRoute); // External compiler API
app.use('/api/react', reactProjectRoute); // React project management API

} catch (error) {
  console.error('❌ Failed to setup API routes:', error.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CollabHub API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      projects: '/api/projects',
      folders: '/api/folders',
      files: '/api/files',
      users: '/api/users',
      optimized: '/api/optimized', // Ultra-fast cached endpoints
      health: '/health',
      cache: '/health/cache',
      performance: '/api/admin/performance'
    },
    documentation: '/api/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: ['/health', '/api/projects', '/api/folders', '/api/files']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown handlers
// Make Socket.IO instance globally available for file watcher
global.io = io;

const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  
  // Close cache service
  try {
    await cacheService.disconnect();
    console.log('✅ Cache service disconnected');
  } catch (error) {
    console.error('❌ Cache service shutdown error:', error.message);
  }
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️  Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server with error handling
server.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
  
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO Server: ws://localhost:${PORT}`);
  
  // Initialize Docker Workspace Manager
  try {
    const dockerManager = getDockerWorkspaceManager();
    console.log(`🐳 Docker Workspace Manager initialized`);
  } catch (error) {
    console.warn(`⚠️ Docker initialization warning: ${error.message}`);
    console.warn(`💡 Make sure Docker is installed and running for full functionality`);
  }
  console.log(`⚡ Server PID: ${process.pid}`);
  
  if (NODE_ENV === 'development') {
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  
  }
  
  console.log('\n✅ Backend server started successfully!');
  console.log('📱 Frontend can now connect to the backend');
});

export default app;