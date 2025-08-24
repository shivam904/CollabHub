import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js';
import toast from 'react-hot-toast';

const RealtimeContext = createContext();

export { RealtimeContext }; // Export the context itself

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [fileUsers, setFileUsers] = useState(new Map());
  const [projectUsers, setProjectUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [fileLocks, setFileLocks] = useState(new Map());

  // Initialize socket connection
  useEffect(() => {
    console.log('[RealtimeContext] useEffect running. user:', user, 'token available:', !!token);
    
    if (!token || !user) {
      console.log('[RealtimeContext] No token/user present, skipping socket connection.');
      setIsConnected(false);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Don't create new socket if we already have one and it's connected
    if (socket && socket.connected) {
      console.log('[RealtimeContext] Socket already connected, skipping creation');
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    console.log('[RealtimeContext] Creating socket with backendUrl:', backendUrl);
    
    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('[RealtimeContext] Socket connected');
    });
    
    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[RealtimeContext] Socket disconnected:', reason);
      
      // Don't auto-reconnect for certain reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        console.log('[RealtimeContext] Manual disconnect, not reconnecting');
      }
    });
    
    newSocket.on('error', (err) => {
      setIsConnected(false);
      console.error('[RealtimeContext] Socket error:', err);
      if (err && (err.message?.toLowerCase().includes('auth') || err.message?.toLowerCase().includes('token'))) {
        console.error('Authentication error, logging out');
        logout && logout();
      }
    });
    
    console.log('[RealtimeContext] Socket created and event handlers attached.');
    
    return () => {
      console.log('[RealtimeContext] Socket cleanup: disconnecting');
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user?.uid]); // Only depend on user ID, not the full token

  // Join project
  const joinProject = useCallback((projectId) => {
    if (!socket || !isConnected) return;

    socket.emit('join-project', { projectId });
    setActiveProject(projectId);
  }, [socket, isConnected]);

  // Leave project
  const leaveProject = useCallback(() => {
    if (!socket) return;

    if (activeProject) {
      socket.emit('leave-project', { projectId: activeProject });
      setActiveProject(null);
      setProjectUsers(new Map());
    }
  }, [socket, activeProject]);

  // Join file
  const joinFile = useCallback((fileId) => {
    if (!socket || !isConnected) return;

    socket.emit('join-file', { fileId });
    setActiveFile(fileId);
  }, [socket, isConnected]);

  // Leave file
  const leaveFile = useCallback(() => {
    if (!socket) return;

    if (activeFile) {
      socket.emit('leave-file', { fileId: activeFile });
      setActiveFile(null);
      setFileUsers(new Map());
      setTypingUsers(new Set());
    }
  }, [socket, activeFile]);

  // Send code changes
  const sendCodeChange = useCallback((fileId, changes, version) => {
    if (!socket || !isConnected) return;

    socket.emit('code-change', {
      fileId,
      changes,
      version
    });
  }, [socket, isConnected]);

  // Send cursor updates
  const sendCursorUpdate = useCallback((fileId, position, selection) => {
    if (!socket || !isConnected) return;

    socket.emit('cursor-update', {
      fileId,
      position,
      selection
    });
  }, [socket, isConnected]);

  // Save file
  const saveFile = useCallback((fileId, content, version) => {
    if (!socket || !isConnected) return;

    socket.emit('file-save', {
      fileId,
      content,
      version
    });
  }, [socket, isConnected]);

  // Lock file
  const lockFile = useCallback((fileId) => {
    if (!socket || !isConnected) return;

    socket.emit('lock-file', { fileId });
  }, [socket, isConnected]);

  // Unlock file
  const unlockFile = useCallback((fileId) => {
    if (!socket || !isConnected) return;

    socket.emit('unlock-file', { fileId });
  }, [socket, isConnected]);

  // Start typing indicator
  const startTyping = useCallback((fileId) => {
    if (!socket || !isConnected) return;

    socket.emit('typing-start', { fileId });
  }, [socket, isConnected]);

  // Stop typing indicator
  const stopTyping = useCallback((fileId) => {
    if (!socket || !isConnected) return;

    socket.emit('typing-stop', { fileId });
  }, [socket, isConnected]);



  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // File joined
    socket.on('file-joined', (data) => {
      console.log('📄 Joined file:', data.fileId);
      setActiveFile(data.fileId);
      setFileUsers(new Map(data.activeUsers.map(user => [user.userId, user])));
    });

    // Code changes from other users
    socket.on('code-change', (data) => {
      // This will be handled by the editor component
      console.log('✏️ Code change received:', data);
    });

    // Cursor updates from other users
    socket.on('cursor-update', (data) => {
      // This will be handled by the editor component
      console.log('👆 Cursor update received:', data);
    });

    // File saved
    socket.on('file-saved', (data) => {
      toast.success('File saved successfully');
      console.log('💾 File saved:', data);
    });

    // User presence updates
    socket.on('user-presence-update', (data) => {
      setFileUsers(new Map(data.activeUsers.map(user => [user.userId, user])));
    });

    // User joined file
    socket.on('user-joined-file', (data) => {
      setFileUsers(prev => new Map(prev).set(data.userId, data.userInfo));
      toast(`${data.userInfo.name} joined the file`);
    });

    // User left file
    socket.on('user-left-file', (data) => {
      setFileUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
      toast(`${data.userInfo.name} left the file`);
    });

    // User typing
    socket.on('user-typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });

    // File locked
    socket.on('file-locked', (data) => {
      setFileLocks(prev => new Map(prev).set(data.fileId, {
        lockedBy: data.lockedBy,
        userInfo: data.userInfo
      }));
      toast(`${data.userInfo.name} locked the file`);
    });

    // File unlocked
    socket.on('file-unlocked', (data) => {
      setFileLocks(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.fileId);
        return newMap;
      });
      toast('File unlocked');
    });

    // Project events
    socket.on('user-joined-project', (data) => {
      setProjectUsers(prev => new Map(prev).set(data.userId, data.userInfo));
      toast(`${data.userInfo.name} joined the project`);
    });

    socket.on('user-left-project', (data) => {
      setProjectUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
      toast(`${data.userInfo.name} left the project`);
    });

    return () => {
      socket.off('file-joined');
      socket.off('code-change');
      socket.off('cursor-update');
      socket.off('file-saved');
      socket.off('user-presence-update');
      socket.off('user-joined-file');
      socket.off('user-left-file');
      socket.off('user-typing');
      socket.off('file-locked');
      socket.off('file-unlocked');
      socket.off('user-joined-project');
      socket.off('user-left-project');
    };
  }, [socket]);

  const value = {
    // Connection state
    isConnected,
    socket,
    
    // Active sessions
    activeFile,
    activeProject,
    
    // Users
    fileUsers,
    projectUsers,
    typingUsers,
    fileLocks,
    
    // Actions
    joinProject,
    leaveProject,
    joinFile,
    leaveFile,
    sendCodeChange,
    sendCursorUpdate,
    saveFile,
    lockFile,
    unlockFile,
    startTyping,
    stopTyping
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}; 