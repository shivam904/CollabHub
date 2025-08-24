import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import FileExplorer from '../components/editor/FileExplorer';
import CodeEditor from '../components/editor/CodeEditor';
import CloudTerminal from '../components/editor/CloudTerminal';
import TopBar from '../components/editor/TopBar';
import { Toaster, toast } from 'react-hot-toast';
import '../styles/editor.css';

import { useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import CollaborationPanel from '../components/editor/CollaborationPanel';
import { Users, MessageCircle, Phone } from 'lucide-react';
import GroupChat from '../components/chat/GroupChat';
import GroupCall from '../components/call/GroupCall';


export default function Editor() {
  const { projectId } = useParams();
  const userId = localStorage.getItem('userId');
  
  // State management
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [showCollab, setShowCollab] = useState(false);
  const [collabTab, setCollabTab] = useState('collaborators'); // 'collaborators' | 'chat' | 'call'
  const resizingRef = useRef(false);

  // Fetch project data and collaborators
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !userId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch project details
        const projectRes = await fetch(`/api/projects/${projectId}?userId=${userId}`);
        const projectData = await projectRes.json();
        
        if (projectData.success) {
          // Use the populated user information from backend
          const project = projectData.project;
          
          // Combine creator and members with their populated user info
          const allCollaborators = [];
          
          // Add creator with role 'owner'
          if (project.creator) {
            allCollaborators.push({
              userId: project.creator.uid,
              role: 'owner',
              user: project.creator
            });
          }
          
          // Add members with their populated user info
          if (project.members && Array.isArray(project.members)) {
            project.members.forEach(member => {
              if (member.user && member.user.uid !== project.creator?.uid) {
                allCollaborators.push({
                  userId: member.userId,
                  role: member.role,
                  user: member.user
                });
              }
            });
          }
          
          setCollaborators(allCollaborators);
        }
      } catch (err) {
        setError('Failed to load project data');
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, userId]);

  // Handle file operations
  const handleFileOpen = useCallback(async (file) => {
    // Check if file is already open
    const isAlreadyOpen = openFiles.some(f => f._id === file._id);

    // Fetch file content and role from backend
    const res = await fetch(`/api/files/${file._id}/content?userId=${userId}`);
    const data = await res.json();
    if (data.success && data.file) {
      if (!isAlreadyOpen) {
        setOpenFiles(prev => [...prev, data.file]);
      }
      setActiveFile(data.file); // This file will have the role property!
      toast.success(`Opened ${data.file.name}`);
    } else {
      toast.error(data.message || 'Failed to open file');
    }
  }, [openFiles, userId]);

  const handleFileClose = useCallback((fileId) => {
    setOpenFiles(prev => prev.filter(f => f._id !== fileId));
    
    if (activeFile && activeFile._id === fileId) {
      const remainingFiles = openFiles.filter(f => f._id !== fileId);
      setActiveFile(remainingFiles[remainingFiles.length - 1] || null);
    }
  }, [activeFile, openFiles]);

  const handleFileSave = useCallback(async (fileId, content) => {
    try {
      console.log(`🚀 [Editor] Saving file ${fileId} with ${content?.length || 0} characters`);
      
      const res = await fetch(`/api/files/${fileId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, userId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('File saved successfully!');
        console.log(`✅ File ${fileId} saved successfully`);
        return true;
      } else {
        toast.error(data.message || 'Failed to save file');
        console.error(`❌ Save failed: ${data.message}`);
        return false;
      }
    } catch (err) {
      toast.error('Failed to save file');
      console.error(`💥 Save error:`, err);
      return false;
    }
  }, [userId]);

  const handleFileCreate = useCallback(async (name, type, parentFolderId = null) => {
    try {
      let res, data;
      
      if (type === 'folder') {
        // Create folder using the folder API endpoint
        res = await fetch('/api/folders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            projectId,
            parentId: parentFolderId,
            owner: userId,
            description: '',
            tags: []
          })
        });
      } else {
        // Create file using the file API endpoint
        res = await fetch('/api/files/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            folderId: parentFolderId,
            projectId,
            owner: userId,
            content: '',
            type: type || 'text',
            description: '',
            tags: []
          })
        });
      }
      
      data = await res.json();
      
      if (data.success) {
        toast.success(`${type === 'folder' ? 'Folder' : 'File'} created successfully!`);
        return data.file || data.folder;
      } else {
        console.error(`Failed to create ${type}:`, data);
        toast.error(data.message || `Failed to create ${type}`);
        return null;
      }
    } catch (err) {
      console.error(`Error creating ${type}:`, err);
      toast.error(`Failed to create ${type}`);
      return null;
    }
  }, [projectId, userId]);

  // Terminal resize handlers
  const handleTerminalResizeStart = (e) => {
    resizingRef.current = true;
    document.body.style.cursor = 'ns-resize';
  };
    
  const handleTerminalResize = (e) => {
    if (!resizingRef.current) return;
    const editorContent = document.querySelector('.editor-content');
    const rect = editorContent.getBoundingClientRect();
    let y = e.touches ? e.touches[0].clientY : e.clientY;
    let newHeight = rect.bottom - y;
    // Better height constraints: minimum 200px, maximum 60% of viewport height
    const maxHeight = window.innerHeight * 0.6;
    const minHeight = 200;
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    setTerminalHeight(newHeight);
  };
    
  const handleTerminalResizeEnd = () => {
    resizingRef.current = false;
    document.body.style.cursor = '';
  };
    
  useEffect(() => {
    if (!showTerminal) return;
    const move = (e) => handleTerminalResize(e);
    const up = () => handleTerminalResizeEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [showTerminal]);

  // Debug terminal state
  useEffect(() => {
    console.log('Terminal state changed:', showTerminal, 'Height:', terminalHeight);
  }, [showTerminal, terminalHeight]);

  // Find the current user's role
  const currentUserRole = collaborators.find(c => c.userId === userId)?.role || 'viewer';
  
  console.log(`🔍 Checking user role in project:`);
  console.log(`👤 Current user ID: ${userId}`);
  console.log(`👥 All collaborators:`, collaborators.map(c => ({ userId: c.userId, role: c.role })));
  console.log(`🏢 Determined role: ${currentUserRole}`);

  // Find the current user's file-level role for the active file
  const getFileUserRole = (file) => {
    if (!file || !userId) return 'viewer';
    
    console.log(`🔍 Determining user role for file: ${file.name}`);
    console.log(`👤 Current user ID: ${userId}`);
    console.log(`👤 File owner: ${file.owner}`);
    console.log(`🏢 Project role: ${currentUserRole}`);
    console.log(`📋 File permissions:`, file.permissions);
    
    // Check if user is the file owner
    if (file.owner === userId) {
      console.log(`✅ User is file owner - granting editor access`);
      return 'editor';
    }
    
    // Check file-level permissions first
    if (file.permissions && file.permissions.length > 0) {
      const filePerm = file.permissions.find(p => p.userId === userId);
      if (filePerm) {
        console.log(`✅ Found file-level permission: ${filePerm.role}`);
        return filePerm.role;
      }
    }
    
    // Fall back to project-level permissions
    if (currentUserRole && (currentUserRole === 'owner' || currentUserRole === 'editor' || currentUserRole === 'admin')) {
      console.log(`✅ Using project-level permission: ${currentUserRole}`);
      return 'editor'; // Map project roles to editor access
    }
    
    // Default to viewer
    console.log(`⚠️ Defaulting to viewer role`);
    return 'viewer';
  };

  if (isLoading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading editor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="editor-root" style={{ display: 'flex', height: '100vh', width: '100vw', position: 'relative' }}>
      <Toaster position="top-right" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <TopBar
          collaborators={collaborators}
          openFiles={openFiles}
          activeFile={activeFile}
          onFileClose={handleFileClose}
          onFileSelect={handleFileOpen}
          rightExtra={
            <>
              <button
                className={`terminal-toggle-btn${showTerminal ? ' active' : ''}`}
                onClick={() => {
                  console.log('Terminal toggle clicked. Current state:', showTerminal);
                  setShowTerminal(v => !v);
                }}
                title={showTerminal ? 'Hide Terminal' : 'Show Terminal'}
                style={{
                  marginLeft: 8, 
                  marginRight: 4, 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'none', 
                  border: 'none', 
                  color: showTerminal ? '#4FC3F7' : '#ccc', 
                  cursor: 'pointer', 
                  fontSize: 18, 
                  padding: '4px 10px', 
                  borderRadius: 6
                }}
              >
                <TerminalIcon size={20} />
              </button>
              <button
                className="topbar-collab-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4FC3F7',
                  marginLeft: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 15,
                  padding: '4px 10px',
                  borderRadius: 6
                }}
                title="Collaboration Panel"
                onClick={() => setShowCollab(v => !v)}
              >
                <Users size={18} style={{ marginRight: 6 }} /> Collaboration
              </button>
            </>
          }
        />
        <div 
          className="editor-main" 
          style={{
            height: '100%', 
            minHeight: 0,
            paddingBottom: '0px' // Terminal no longer overlaps main editor
          }}
        >
          {/* Left Panel - File Explorer */}
          <div className="editor-sidebar">
            <FileExplorer
              projectId={projectId}
              userId={userId}
              onFileSelect={handleFileOpen}
              onFileCreate={handleFileCreate}
            />
          </div>
          {/* Center Panel - Code Editor */}
          <div className="editor-content" style={{height: '100%', minHeight: 0, position: 'relative'}}>
            {activeFile ? (
              <CodeEditor
                file={activeFile}
                onSave={handleFileSave}
                userRole={getFileUserRole(activeFile)}
              />
            ) : (
              <div className="editor-empty">
                <div className="empty-icon">📄</div>
                <h3>No file selected</h3>
                <p>Select a file from the explorer to start editing</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Cloud Terminal Slide Up - Limited to Editor Area */}
      {showTerminal && (
      <div 
          className="editor-terminal-slide show"
          style={{
            height: `${Math.min(Math.max(terminalHeight, 200), window.innerHeight * 0.6)}px`
          }}
        >
          <div 
            className="terminal-resize-handle"
            onMouseDown={handleTerminalResizeStart}
            onTouchStart={handleTerminalResizeStart}
          />
          <div style={{ flex: 1, height: '100%' }}>
            <CloudTerminal 
              projectId={projectId}
              userId={userId}
              className="editor-terminal"
            />
          </div>
      </div>
      )}

      {/* Collaboration Side Panel */}
      {showCollab && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 420,
          background: '#23272e',
          boxShadow: '-4px 0 32px #0008',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 320,
          maxWidth: '100vw',
          transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #333', padding: '16px 20px 10px 20px', gap: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 18, flex: 1, color: '#fff' }}>Collaboration</span>
            <button
              onClick={() => setShowCollab(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', marginLeft: 8 }}
              title="Close Collaboration Panel"
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#23272e', padding: '0 20px', gap: 8 }}>
            <button
              onClick={() => setCollabTab('collaborators')}
              style={{
                flex: 1,
                background: collabTab === 'collaborators' ? '#181e29' : 'none',
                color: collabTab === 'collaborators' ? '#4FC3F7' : '#fff',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '10px 0',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Users size={16} style={{ marginRight: 6 }} /> Collaborators
            </button>
            <button
              onClick={() => setCollabTab('chat')}
              style={{
                flex: 1,
                background: collabTab === 'chat' ? '#181e29' : 'none',
                color: collabTab === 'chat' ? '#4FC3F7' : '#fff',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '10px 0',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <MessageCircle size={16} style={{ marginRight: 6 }} /> Group Chat
            </button>
            <button
              onClick={() => setCollabTab('call')}
              style={{
                flex: 1,
                background: collabTab === 'call' ? '#181e29' : 'none',
                color: collabTab === 'call' ? '#4FC3F7' : '#fff',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '10px 0',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Phone size={16} style={{ marginRight: 6 }} /> Call
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: '#23272e', display: 'flex', flexDirection: 'column' }}>
            {collabTab === 'collaborators' && (
              <div style={{ padding: 20 }}>
                <CollaborationPanel collaborators={collaborators} projectId={projectId} />
              </div>
            )}
            {collabTab === 'chat' && (
              <GroupChat projectId={projectId} />
            )}
            {collabTab === 'call' && (
              <GroupCall projectId={projectId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
} 