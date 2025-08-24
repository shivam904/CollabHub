import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown,
  Plus,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import './FileExplorer.css';
import { fileAPI, folderAPI } from '../../services/api';
import { io } from 'socket.io-client';

function CreateItemModal({ open, type, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  
  if (!open) return null;
  
  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const itemData = {
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      await onConfirm(itemData);
      setName('');
      setDescription('');
      setTags('');
      setShowDescription(false);
    } catch (error) {
      console.error('Modal submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#23272e', color: '#fff', borderRadius: 12, padding: 32, minWidth: 400, boxShadow: '0 8px 32px #0008', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Create New {type === 'file' ? 'File' : 'Folder'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${type} name`}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #3c3c3c',
              background: '#1e1e1e',
              color: '#fff',
              fontSize: 14
            }}
            onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSubmit()}
            autoFocus
            disabled={isSubmitting}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!showDescription ? (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4FC3F7',
                textAlign: 'left',
                padding: 0,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 0
              }}
              disabled={isSubmitting}
            >
              + Add Description
            </button>
          ) : (
            <>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #3c3c3c',
                  background: '#1e1e1e',
                  color: '#fff',
                  fontSize: 14,
                  resize: 'vertical'
                }}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowDescription(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F76C6C',
                  textAlign: 'left',
                  padding: 0,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginTop: 2
                }}
                disabled={isSubmitting}
              >
                Remove Description
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2, tag3"
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #3c3c3c',
              background: '#1e1e1e',
              color: '#fff',
              fontSize: 14
            }}
            disabled={isSubmitting}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #3c3c3c',
              background: 'transparent',
              color: '#fff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: (name.trim() && !isSubmitting) ? '#007acc' : '#3c3c3c',
              color: '#fff',
              cursor: (name.trim() && !isSubmitting) ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 500,
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FileExplorer({ projectId, userId, onFileSelect, onFileCreate }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createMenuPosition, setCreateMenuPosition] = useState({ x: 0, y: 0 });
  const [createMenuParent, setCreateMenuParent] = useState(null);
  const [createModal, setCreateModal] = useState({ open: false, type: '', parent: null });
  // Add state for delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', item: null });
  // Terminal file sync state
  const [watcherStatus, setWatcherStatus] = useState({ active: false, lastScan: null });
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const contextMenuRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchFileTree();
    setupSocketConnection();
    checkWatcherStatus();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [projectId, userId]);

  // Setup Socket.IO connection for real-time updates
  const setupSocketConnection = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    socketRef.current = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    
    // Join project room for file updates
    socketRef.current.emit('join-project', { projectId, userId });
    
    // Listen for file system updates from terminal
    socketRef.current.on('file_system_update', (updateData) => {
      console.log('📡 Received file system update:', updateData);
      handleFileSystemUpdate(updateData);
    });
    
    // Connection status
    socketRef.current.on('connect', () => {
      console.log('📡 Socket connected for file updates');
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('📡 Socket disconnected');
    });
  };

  // Handle real-time file system updates
  const handleFileSystemUpdate = (updateData) => {
    try {
      setLastSyncTime(new Date());
      
      if (updateData.type === 'file_created') {
        console.log('📄 New file detected from terminal:', updateData.file.name);
        // Refresh file tree to show new file
        fetchFileTree();
        
        // Show notification
        if (autoSync) {
          showNotification(`New file created: ${updateData.file.name}`, 'success');
        }
      } else if (updateData.type === 'file_modified') {
        console.log('📝 File modified in terminal:', updateData.file.name);
        // Refresh file tree to show changes
        fetchFileTree();
        
        if (autoSync) {
          showNotification(`File updated: ${updateData.file.name}`, 'info');
        }
      } else if (updateData.type === 'folder_created') {
        console.log('📁 New folder detected from terminal:', updateData.folder.name);
        fetchFileTree();
        
        if (autoSync) {
          showNotification(`New folder created: ${updateData.folder.name}`, 'success');
        }
      }
    } catch (error) {
      console.error('Error handling file system update:', error);
    }
  };

  // Check terminal file watcher status
  const checkWatcherStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/watcher/status`);
      const result = await response.json();
      
      if (result.success) {
        setWatcherStatus(result.status);
      }
    } catch (error) {
      console.error('Error checking watcher status:', error);
    }
  };

  // Start/stop terminal file watcher
  const toggleWatcher = async () => {
    try {
      const endpoint = watcherStatus.active ? 'stop' : 'start';
      const response = await fetch(`/api/projects/${projectId}/watcher/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await checkWatcherStatus();
        showNotification(
          `Terminal file watcher ${watcherStatus.active ? 'stopped' : 'started'}`, 
          'success'
        );
      } else {
        showNotification(`Failed to ${endpoint} watcher: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error toggling watcher:', error);
      showNotification('Error toggling watcher', 'error');
    }
  };

  // Force sync terminal files
  const forceSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/force-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchFileTree();
        setLastSyncTime(new Date());
        showNotification('Terminal files synced successfully', 'success');
      } else {
        showNotification(`Sync failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Force sync error:', error);
      showNotification('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Show notification (you can replace this with your notification system)
  const showNotification = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You can implement toast notifications here
  };

  // Real-time file sync from automatic system
  useEffect(() => {
    if (!projectId) return;

    const socket = io('http://localhost:5000');
    
    // Join project room for real-time updates
    socket.emit('join', `project-${projectId}`);

    // Listen for file/folder changes from automatic system
    socket.on('file:created', (data) => {
      if (data.source === 'automatic') {
        console.log('📄 File created automatically:', data.file.name);
        fetchFileTree(); // Refresh the tree
      }
    });

    socket.on('file:updated', (data) => {
      if (data.source === 'automatic') {
        console.log('📝 File updated automatically:', data.file.name);
        fetchFileTree(); // Refresh the tree
      }
    });

    socket.on('file:deleted', (data) => {
      if (data.source === 'automatic') {
        console.log('🗑️ File deleted automatically');
        fetchFileTree(); // Refresh the tree
      }
    });

    socket.on('folder:created', (data) => {
      if (data.source === 'automatic') {
        console.log('📁 Folder created automatically:', data.folder.name);
        fetchFileTree(); // Refresh the tree
      }
    });

    socket.on('folder:deleted', (data) => {
      if (data.source === 'automatic') {
        console.log('🗂️ Folder deleted automatically');
        fetchFileTree(); // Refresh the tree
      }
    });

    return () => {
      socket.emit('leave', `project-${projectId}`);
      socket.disconnect();
    };
  }, [projectId]);

  const fetchFileTree = async () => {
    if (!projectId || !userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [folderRes, fileRes] = await Promise.all([
        fetch(`/api/folders/project/${projectId}?userId=${userId}`),
        fetch(`/api/files/project/${projectId}?userId=${userId}`)
      ]);
      
      const folderData = await folderRes.json();
      const fileData = await fileRes.json();
      
      const folders = folderData.folders || [];
      const files = fileData.files || [];
      
      // Organize files by folder
      const filesByFolder = {};
      files.forEach(f => {
        const folderId = f.folder?._id || f.folder || null;
        if (!filesByFolder[folderId]) filesByFolder[folderId] = [];
        filesByFolder[folderId].push(f);
      });
      
      // Build tree structure
      function buildTree(folders, parentId = null) {
        return folders
          .filter(f => (f.parent?._id || null) === parentId)
          .map(f => ({
            ...f,
            type: 'folder',
            files: filesByFolder[f._id] || [],
            subfolders: buildTree(folders, f._id)
          }));
      }
      
      const rootFolders = buildTree(folders, null);
      const rootFiles = filesByFolder[null] || [];
      
      const treeData = [{ 
        _id: null, 
        name: 'Root', 
        type: 'folder',
        files: rootFiles, 
        subfolders: rootFolders 
      }];
      
      setTree(treeData);
    } catch (err) {
      setError('Failed to load file tree');
      console.error('File tree load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple refresh function
  const handleRefresh = async () => {
    await fetchFileTree();
  };

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Sync completed:', result.result);
        // Refresh file tree to show synced files
        await fetchFileTree();
        
        // Show success message
        if (result.result.newFiles > 0 || result.result.updatedFiles > 0) {
          alert(`Sync completed! Found ${result.result.newFiles} new files and updated ${result.result.updatedFiles} files.`);
        } else {
          alert('Sync completed! No changes detected.');
        }
      } else {
        console.error('Sync failed:', result.error);
        alert(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item._id);
    if (item.type === 'file') {
      onFileSelect(item);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setCreateMenuParent(item);
    setCreateMenuPosition({ x: e.clientX, y: e.clientY });
    setShowCreateMenu(true);
  };

  const handleCreateItem = async (type) => {
    if (!createMenuParent) return;
    setShowCreateMenu(false); // Hide the context menu immediately
    setCreateModal({ open: true, type, parent: createMenuParent });
  };

  const handleModalConfirm = async (itemData) => {
    try {
      const parentId = createModal.parent.type === 'folder' ? createModal.parent._id : createModal.parent.folder?._id;
      let newItem = null;
      
      if (createModal.type === 'file') {
        // For files, we need a valid folderId
        let folderId = parentId;
        
        // If no parent folder (root file), we need to create or find a root folder
        if (!folderId) {
          // Try to find an existing root folder for this project
          try {
            const foldersResponse = await folderAPI.getProjectFolders(projectId, userId);
            const rootFolders = foldersResponse.folders.filter(f => !f.parent);
            
            if (rootFolders.length > 0) {
              folderId = rootFolders[0]._id;
            } else {
              // Create a root folder if none exists
              const rootFolderResponse = await folderAPI.createFolder({
                name: 'Root',
                projectId,
                parentId: null,
                owner: userId,
                description: 'Root folder for project files',
                tags: []
              });
              
              if (rootFolderResponse.success) {
                folderId = rootFolderResponse.folder._id;
              } else {
                throw new Error('Failed to create root folder');
              }
            }
          } catch (error) {
            console.error(`Error setting up root folder: ${error.message}`);
            return;
          }
        }
        
        newItem = await fileAPI.createFile({
          name: itemData.name,
          type: 'text',
          projectId,
          folderId: folderId,
          owner: userId,
          content: '',
          description: itemData.description,
          tags: itemData.tags
        });
      } else {
        newItem = await folderAPI.createFolder({
          name: itemData.name,
          projectId,
          parentId: parentId || null,
          owner: userId,
          description: itemData.description,
          tags: itemData.tags
        });
      }
      
      if (newItem.success) {
        console.log(`${createModal.type} created successfully: ${itemData.name}`);
        await fetchFileTree(); // Refresh the tree
      } else {
        console.error(`Failed to create ${createModal.type}: ${newItem.message}`);
      }
    } catch (error) {
      console.error(`Error creating ${createModal.type}: ${error.message}`);
    }
    setCreateModal({ open: false, type: null, parent: null });
  };

  const handleModalCancel = () => {
    setCreateModal({ open: false, type: null, parent: null });
  };

  // Add delete handlers
  const handleDelete = (type, item) => {
    setDeleteModal({ open: true, type, item });
    setShowCreateMenu(false);
  };

  const confirmDelete = async () => {
    const { type, item } = deleteModal;
    try {
      if (type === 'file') {
        const res = await fileAPI.deleteFile(item._id, userId);
        if (res.success) {
          console.log(`File deleted: ${item.name}`);
        } else {
          console.error(`Failed to delete file: ${res.message}`);
        }
      } else if (type === 'folder') {
        const res = await folderAPI.deleteFolder(item._id, userId, false);
        if (res.success) {
          console.log(`Folder deleted: ${item.name}`);
        } else {
          console.error(`Failed to delete folder: ${res.message}`);
        }
      }
      await fetchFileTree();
    } catch (err) {
      console.error(`Error deleting ${type}: ${err.message}`);
    }
    setDeleteModal({ open: false, type: '', item: null });
  };

  const cancelDelete = () => {
    setDeleteModal({ open: false, type: '', item: null });
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!showCreateMenu) return;
    const handleClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCreateMenu]);

  const renderTreeItem = (item, level = 0) => {
    const isExpanded = expandedFolders.has(item._id);
    const isSelected = selectedItem === item._id;
    const hasChildren = (item.files && item.files.length > 0) || (item.subfolders && item.subfolders.length > 0);
    
    return (
      <div key={item._id}>
        <div
          className={`tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: 12 + level * 16 }}
          onClick={() => handleItemClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <div className="tree-item-content">
            {item.type === 'folder' && (
              <button
                className="expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item._id);
                }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            
            <div className="item-icon">
              {item.type === 'folder' ? (
                isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
              ) : (
                <File size={16} />
              )}
            </div>
            
            <span className="item-name">{item.name}</span>
          </div>
        </div>
        
        {item.type === 'folder' && isExpanded && (
          <>
            {item.files.map(file => renderTreeItem({ ...file, type: 'file' }, level + 1))}
            {item.subfolders && item.subfolders.map(subfolder => renderTreeItem(subfolder, level + 1))}
            {item.files.length === 0 && (!item.subfolders || item.subfolders.length === 0) && (
              <div className="empty-folder" style={{ paddingLeft: 12 + (level + 1) * 16 }}>
                Empty folder
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Context menu rendering
  const renderContextMenu = () => (
    showCreateMenu && createMenuParent && (
      <div
        ref={contextMenuRef}
        className="context-menu"
        style={{
          position: 'fixed',
          top: createMenuPosition.y,
          left: createMenuPosition.x,
          background: '#23272e',
          color: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 24px #0008',
          zIndex: 1500,
          minWidth: 160,
          padding: '8px 0'
        }}
        onClick={() => setShowCreateMenu(false)}
      >
        <button
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateItem('file');
          }}
          style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer' }}
        >
          <FilePlus size={16} style={{ marginRight: 8 }} /> Create File
        </button>
        <button
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateItem('folder');
          }}
          style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer' }}
        >
          <FolderPlus size={16} style={{ marginRight: 8 }} /> Create Folder
        </button>
        <button
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(createMenuParent.type, createMenuParent);
          }}
          style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: '#F76C6C', padding: '8px 16px', cursor: 'pointer' }}
        >
          🗑 Delete {createMenuParent.type === 'file' ? 'File' : 'Folder'}
        </button>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="file-explorer">
        <div className="explorer-header">
          <h3>Explorer</h3>
          <button className="refresh-button" onClick={handleRefresh}>
            <Plus size={16} />
          </button>
        </div>
        <div className="explorer-content">
          <div className="loading-message">Loading files...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-explorer">
        <div className="explorer-header">
          <h3>Explorer</h3>
        </div>
        <div className="explorer-content">
          <div className="error-message">{error}</div>
          <button onClick={fetchFileTree}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Create Item Modal */}
      <CreateItemModal
        open={createModal.open}
        type={createModal.type}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal open={deleteModal.open} type={deleteModal.type} item={deleteModal.item} onConfirm={confirmDelete} onCancel={cancelDelete} />
      <div className="file-explorer">
        <div className="explorer-header">
          <h3>Explorer</h3>
          <div className="header-actions">
            {/* Terminal Sync Controls */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '4px 6px', 
              background: '#2a2a2a', 
              borderRadius: '4px', 
              border: '1px solid #404040',
              marginRight: '8px'
            }}>
              <button
                onClick={toggleWatcher}
                style={{
                  background: 'none',
                  color: watcherStatus.active ? '#10b981' : '#6b7280',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={`Terminal file watcher: ${watcherStatus.active ? 'ON' : 'OFF'}`}
              >
                {watcherStatus.active ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                onClick={forceSync}
                disabled={isSyncing}
                style={{
                  background: 'none',
                  color: isSyncing ? '#6b7280' : '#3b82f6',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '2px',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Force sync terminal files"
              >
                <Zap size={12} />
              </button>
              {lastSyncTime && (
                <span style={{ 
                  color: '#6b7280', 
                  fontSize: '9px',
                  marginLeft: '2px'
                }}>
                  {new Date(lastSyncTime).toLocaleTimeString('en', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
            
            <button 
              className="action-button" 
              onClick={handleRefresh}
              title="Refresh Files"
            >
              <Plus size={16} />
            </button>
            <button 
              className="action-button" 
              onClick={handleSync}
              disabled={isSyncing}
              title="Sync workspace changes to database"
            >
              <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
            </button>
            <button 
              className="action-button" 
              onClick={() => {
                setCreateMenuParent({ _id: null, type: 'folder' });
                handleCreateItem('file');
              }}
              title="Create File"
            >
              <FilePlus size={16} />
            </button>
            <button 
              className="action-button" 
              onClick={() => {
                setCreateMenuParent({ _id: null, type: 'folder' });
                handleCreateItem('folder');
              }}
              title="Create Folder"
            >
              <FolderPlus size={16} />
            </button>
          </div>
        </div>
        
        <div className="explorer-content">
          {tree.map(item => renderTreeItem(item))}
        </div>
        
        {renderContextMenu()}
      </div>
    </>
  );
} 

// Add DeleteConfirmationModal component
function DeleteConfirmationModal({ open, type, item, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#23272e', color: '#fff', borderRadius: 12, padding: 32, minWidth: 340, boxShadow: '0 8px 32px #0008', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Delete {type === 'file' ? 'File' : 'Folder'}?</h3>
        <div>Are you sure you want to delete <b>{item?.name}</b>? This action cannot be undone.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #3c3c3c', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#F76C6C', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Delete</button>
        </div>
      </div>
    </div>
  );
} 