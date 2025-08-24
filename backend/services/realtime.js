import File from '../models/file.js';
import Project from '../models/Project.js';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account file first
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const serviceAccountPath = path.join(__dirname, '../config/serviceAccountKey.json');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized with service account file');
    } catch (fileError) {
      // Fallback to environment variables
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin initialized with environment variables');
      } else {
        throw new Error('Neither service account file nor environment variables are properly configured');
      }
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.warn('⚠️ Real-time features may not work properly without Firebase Admin');
    console.warn('💡 Either place serviceAccountKey.json in config/ or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables');
  }
}

// Store active users and their sessions
const activeUsers = new Map(); // userId -> { socketId, projectId, fileId, userInfo }
const fileSessions = new Map(); // fileId -> Set of userIds
const projectSessions = new Map();
const callSessions = new Map(); // projectId -> Set of {userId, userName, isMuted}

// Verify JWT token from socket handshake
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
};

// Get user info from socket using Firebase JWT
const getUserFromSocket = async (socket) => {
  const token = socket.handshake.auth.token;
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
};

export const setupSocketHandlers = (io) => {
  // Broadcast to all users in a file session
  const broadcastToFile = (fileId, event, data, excludeUserId = null) => {
    const session = fileSessions.get(fileId);
    if (!session) return;
    session.forEach(userId => {
      if (userId !== excludeUserId) {
        const userSession = activeUsers.get(userId);
        if (userSession) {
          io.to(userSession.socketId).emit(event, data);
        }
      }
    });
  };

  // Broadcast to all users in a project session
  const broadcastToProject = (projectId, event, data, excludeUserId = null) => {
    const session = projectSessions.get(projectId);
    if (!session) return;
    session.forEach(userId => {
      if (userId !== excludeUserId) {
        const userSession = activeUsers.get(userId);
        if (userSession) {
          io.to(userSession.socketId).emit(event, data);
        }
      }
    });
  };

  // Update user presence in a file
  const updateUserPresence = (fileId, userId, userInfo, isActive = true) => {
    const session = fileSessions.get(fileId) || new Set();
    if (isActive) {
      session.add(userId);
    } else {
      session.delete(userId);
    }
    fileSessions.set(fileId, session);
    // Broadcast presence update (send userInfo, not sockets)
    const activeUserIds = Array.from(session);
    const activeUsersInfo = activeUserIds.map(uid => activeUsers.get(uid)?.userInfo).filter(Boolean);
    broadcastToFile(fileId, 'user-presence-update', {
      fileId,
      userId,
      userInfo,
      isActive,
      activeUsers: activeUsersInfo
    });
  };

  // Add robust authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required: No token'));
    }
    try {
      const user = await admin.auth().verifyIdToken(token);
    socket.user = user;
    next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    
    // Store user session
    activeUsers.set(socket.user.uid, {
      socketId: socket.id,
      userInfo: {
        userId: socket.user.uid,
        email: socket.user.email,
        name: socket.user.displayName || socket.user.email
      }
    });

    // Join project room
    socket.on('join-project', async (data) => {
      try {
        const { projectId } = data;
        
        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project || !project.hasPermission(socket.user.uid, 'read')) {
          socket.emit('error', { message: 'Access denied to project' });
          return;
        }

        // Join project room
        socket.join(`project:${projectId}`);
        
        // Update user session
        const userSession = activeUsers.get(socket.user.uid);
        if (userSession) {
          userSession.projectId = projectId;
        }

        // Add to project session (store userId)
        if (!projectSessions.has(projectId)) {
          projectSessions.set(projectId, new Set());
        }
        projectSessions.get(projectId).add(socket.user.uid);

        // Notify others in project
        socket.to(`project:${projectId}`).emit('user-joined-project', {
          userId: socket.user.uid,
          userInfo: userSession?.userInfo
        });

      } catch (error) {
        console.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Join file editing session
    socket.on('join-file', async (data) => {
      try {
        const { fileId } = data;
        
        // Verify file exists and user has access
        const file = await File.findById(fileId).populate('project');
        if (!file) {
          socket.emit('error', { message: 'File not found' });
          return;
        }
        // Check project permissions
        const isOwner = file.owner === socket.user.uid;
        if (!isOwner && !file.project.hasPermission(socket.user.uid, 'read')) {
          socket.emit('error', { message: 'Access denied to file' });
          return;
        }
        // Join file room
        socket.join(`file:${fileId}`);
        // Update user session
        const userSession = activeUsers.get(socket.user.uid);
        if (userSession) {
          userSession.fileId = fileId;
        }
        // Add to file session (store userId)
        if (!fileSessions.has(fileId)) {
          fileSessions.set(fileId, new Set());
        }
        fileSessions.get(fileId).add(socket.user.uid);
        // Update presence
        updateUserPresence(fileId, socket.user.uid, userSession?.userInfo, true);
        // Send current file content and active users (send userInfo, not sockets)
        const activeUserIds = Array.from(fileSessions.get(fileId));
        const activeUsersInfo = activeUserIds.map(uid => activeUsers.get(uid)?.userInfo).filter(Boolean);
        socket.emit('file-joined', {
          fileId,
          content: file.content,
          activeUsers: activeUsersInfo
        });
      } catch (error) {
        console.error('Error joining file:', error);
        socket.emit('error', { message: 'Failed to join file' });
      }
    });

    // Handle real-time code changes
    socket.on('code-change', async (data) => {
      try {
        const { fileId, changes, version } = data;
        
        // Verify user is in file session
        const session = fileSessions.get(fileId);
        if (!session || !session.has(socket.user.uid)) {
          socket.emit('error', { message: 'Not in file session' });
          return;
        }

        // Broadcast changes to other users in the file
        socket.to(`file:${fileId}`).emit('code-change', {
          fileId,
          changes,
          version,
          userId: socket.user.uid,
          userInfo: activeUsers.get(socket.user.uid)?.userInfo
        });

        console.log(`✏️ Code change in file ${fileId} by user ${socket.user.uid}`);
      } catch (error) {
        console.error('Error handling code change:', error);
        socket.emit('error', { message: 'Failed to process code change' });
      }
    });

    // Handle cursor position updates
    socket.on('cursor-update', (data) => {
      try {
        const { fileId, position, selection } = data;
        
        // Broadcast cursor position to other users
        socket.to(`file:${fileId}`).emit('cursor-update', {
          fileId,
          position,
          selection,
          userId: socket.user.uid,
          userInfo: activeUsers.get(socket.user.uid)?.userInfo
        });
      } catch (error) {
        console.error('Error handling cursor update:', error);
      }
    });

    // Handle file save
    socket.on('file-save', async (data) => {
      try {
        const { fileId, content, version } = data;
        
        // Verify user has write permission
        const file = await File.findById(fileId).populate('project');
        const isOwner = file && file.owner === socket.user.uid;
        if (!file || (!isOwner && !file.project.hasPermission(socket.user.uid, 'write'))) {
          socket.emit('error', { message: 'No write permission for this file' });
          return;
        }

        // Update file content in database
        await File.findByIdAndUpdate(fileId, {
          content,
          lastModified: new Date(),
          lastModifiedBy: socket.user.uid,
          version: version || file.version + 1
        });

        // Broadcast save confirmation
        broadcastToFile(fileId, 'file-saved', {
          fileId,
          version: version || file.version + 1,
          savedBy: socket.user.uid,
          timestamp: new Date()
        }, socket.user.uid);

        console.log(`💾 File ${fileId} saved by user ${socket.user.uid}`);
      } catch (error) {
        console.error('Error saving file:', error);
        socket.emit('error', { message: 'Failed to save file' });
      }
    });

    // Handle user typing indicator
    socket.on('typing-start', (data) => {
      const { fileId } = data;
      socket.to(`file:${fileId}`).emit('user-typing', {
        fileId,
        userId: socket.user.uid,
        userInfo: activeUsers.get(socket.user.uid)?.userInfo,
        isTyping: true
      });
    });

    socket.on('typing-stop', (data) => {
      const { fileId } = data;
      socket.to(`file:${fileId}`).emit('user-typing', {
        fileId,
        userId: socket.user.uid,
        userInfo: activeUsers.get(socket.user.uid)?.userInfo,
        isTyping: false
      });
    });

    // Handle file lock/unlock
    socket.on('lock-file', async (data) => {
      try {
        const { fileId } = data;
        
        // Check if file is already locked
        const file = await File.findById(fileId);
        if (file.lockedBy && file.lockedBy !== socket.user.uid) {
          socket.emit('error', { message: 'File is already locked by another user' });
          return;
        }

        // Lock the file
        await File.findByIdAndUpdate(fileId, {
          lockedBy: socket.user.uid,
          lockedAt: new Date()
        });

        // Broadcast lock
        broadcastToFile(fileId, 'file-locked', {
          fileId,
          lockedBy: socket.user.uid,
          userInfo: activeUsers.get(socket.user.uid)?.userInfo
        }, socket.user.uid);

        console.log(`🔒 File ${fileId} locked by user ${socket.user.uid}`);
      } catch (error) {
        console.error('Error locking file:', error);
        socket.emit('error', { message: 'Failed to lock file' });
      }
    });

    socket.on('unlock-file', async (data) => {
      try {
        const { fileId } = data;
        
        // Unlock the file
        await File.findByIdAndUpdate(fileId, {
          $unset: { lockedBy: 1, lockedAt: 1 }
        });

        // Broadcast unlock
        broadcastToFile(fileId, 'file-unlocked', {
          fileId,
          unlockedBy: socket.user.uid
        }, socket.user.uid);

        console.log(`🔓 File ${fileId} unlocked by user ${socket.user.uid}`);
      } catch (error) {
        console.error('Error unlocking file:', error);
        socket.emit('error', { message: 'Failed to unlock file' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.uid} (${socket.id})`);
      
      // Remove from active users
      const userSession = activeUsers.get(socket.user.uid);
      if (userSession) {
        // Update presence in file
        if (userSession.fileId) {
          updateUserPresence(userSession.fileId, socket.user.uid, userSession.userInfo, false);
          
          // Remove from file session
          const fileSession = fileSessions.get(userSession.fileId);
          if (fileSession) {
            fileSession.delete(socket.user.uid);
            if (fileSession.size === 0) {
              fileSessions.delete(userSession.fileId);
            }
          }
        }

        // Remove from project session
        if (userSession.projectId) {
          const projectSession = projectSessions.get(userSession.projectId);
          if (projectSession) {
            projectSession.delete(socket.user.uid);
            if (projectSession.size === 0) {
              projectSessions.delete(userSession.projectId);
            }
          }
          
          // Remove from call session if in a call
          if (callSessions.has(userSession.projectId)) {
            const callSession = callSessions.get(userSession.projectId);
            callSession.forEach(p => {
              if (p.userId === socket.user.uid) {
                callSession.delete(p);
                // Notify others that user left call
                socket.to(`call:${userSession.projectId}`).emit('user-left-call', { 
                  userId: socket.user.uid 
                });
              }
            });
            
            // Clean up empty call sessions
            if (callSession.size === 0) {
              callSessions.delete(userSession.projectId);
            }
          }
        }

        activeUsers.delete(socket.user.uid);
      }

      // Notify others about user leaving
      if (userSession?.fileId) {
        socket.to(`file:${userSession.fileId}`).emit('user-left-file', {
          userId: socket.user.uid,
          userInfo: userSession.userInfo
        });
      }

      if (userSession?.projectId) {
        socket.to(`project:${userSession.projectId}`).emit('user-left-project', {
          userId: socket.user.uid,
          userInfo: userSession.userInfo
        });
      }
    });

    // =================== SIMPLE CHAT HANDLERS ===================
    
    // Join project chat
    socket.on('join-project-chat', async (data) => {
      try {
        const { projectId } = data;
        
        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project || !project.hasPermission(socket.user.uid, 'read')) {
          socket.emit('error', { message: 'Access denied to project' });
          return;
        }

        // Join chat room
        socket.join(`chat:${projectId}`);
        console.log(`💬 User ${socket.user.uid} joined chat for project ${projectId}`);
      } catch (error) {
        console.error('Error joining project chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave project chat
    socket.on('leave-project-chat', (data) => {
      const { projectId } = data;
      socket.leave(`chat:${projectId}`);
      console.log(`💬 User ${socket.user.uid} left chat for project ${projectId}`);
    });

    // Broadcast new message to project chat
    socket.on('new-message', (data) => {
      const { projectId, message } = data;
      // Broadcast to all users in the project chat room
      io.to(`chat:${projectId}`).emit('message-received', message);
      console.log(`💬 Message broadcasted to project ${projectId} chat`);
    });

    // =================== END SIMPLE CHAT HANDLERS ===================

    // =================== SIMPLE AUDIO CALL HANDLERS ===================
    
    // Join project call
    socket.on('join-call', async (data) => {
      try {
        const { projectId, userId, userName } = data;
        
        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project || !project.hasPermission(socket.user.uid, 'read')) {
          socket.emit('error', { message: 'Access denied to project call' });
          return;
        }

        // Get or create call session for this project
        if (!callSessions.has(projectId)) {
          callSessions.set(projectId, new Set());
        }
        const callSession = callSessions.get(projectId);
        
        // Get current participants list before adding new user
        const currentParticipants = Array.from(callSession);
        
        // Add new participant to call session
        const newParticipant = { userId, userName, isMuted: false };
        
        // Remove any existing entry for this user and add new one
        callSession.forEach(p => {
          if (p.userId === userId) {
            callSession.delete(p);
          }
        });
        callSession.add(newParticipant);

        // Join call room
        socket.join(`call:${projectId}`);
        
        // Send current participants list to the new joiner
        socket.emit('call-participants-list', {
          participants: currentParticipants
        });
        
        // Notify others about new participant
        socket.to(`call:${projectId}`).emit('user-joined-call', {
          userId,
          userName
        });
        
        console.log(`📞 User ${userId} joined call for project ${projectId}. Current participants: ${callSession.size}`);
      } catch (error) {
        console.error('Error joining call:', error);
        socket.emit('error', { message: 'Failed to join call' });
      }
    });

    // Leave project call
    socket.on('leave-call', (data) => {
      const { projectId, userId } = data;
      
      // Remove participant from call session
      if (callSessions.has(projectId)) {
        const callSession = callSessions.get(projectId);
        callSession.forEach(p => {
          if (p.userId === userId) {
            callSession.delete(p);
          }
        });
        
        // Clean up empty call sessions
        if (callSession.size === 0) {
          callSessions.delete(projectId);
        }
      }
      
      // Notify others about participant leaving
      socket.to(`call:${projectId}`).emit('user-left-call', { userId });
      
      // Leave call room
      socket.leave(`call:${projectId}`);
      console.log(`📞 User ${userId} left call for project ${projectId}`);
    });

    // WebRTC signaling - Call offer
    socket.on('call-offer', (data) => {
      const { projectId, to, offer } = data;
      socket.to(`call:${projectId}`).emit('call-offer', {
        from: socket.user.uid,
        offer
      });
    });

    // WebRTC signaling - Call answer
    socket.on('call-answer', (data) => {
      const { projectId, to, answer } = data;
      socket.to(`call:${projectId}`).emit('call-answer', {
        from: socket.user.uid,
        answer
      });
    });

    // WebRTC signaling - ICE candidate
    socket.on('call-ice-candidate', (data) => {
      const { projectId, to, candidate } = data;
      socket.to(`call:${projectId}`).emit('call-ice-candidate', {
        from: socket.user.uid,
        candidate
      });
    });

    // Mute status toggle
    socket.on('call-mute-toggle', (data) => {
      const { projectId, userId, isMuted } = data;
      socket.to(`call:${projectId}`).emit('call-mute-update', {
        userId,
        isMuted
      });
    });

    // =================== END SIMPLE AUDIO CALL HANDLERS ===================
  });

  console.log('🔌 Socket.IO handlers configured with chat and audio calls');
}; 