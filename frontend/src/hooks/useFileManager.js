import { useState, useEffect, useCallback } from 'react';
import { folderAPI, fileAPI, handleAPIError } from '../services/api';
import toast from 'react-hot-toast';

export const useFileManager = (projectId, userId) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [folderTree, setFolderTree] = useState([]);
  const [searchResults, setSearchResults] = useState({ files: [], folders: [] });
  const [folderStats, setFolderStats] = useState({});
  const [sharedFolders, setSharedFolders] = useState([]);

  // Load project folders
  const loadFolders = useCallback(async () => {
    if (!projectId || !userId) return;
    
    try {
      setLoading(true);
      const response = await folderAPI.getProjectFolders(projectId, userId);
      console.log('Loaded folders:', response.folders);
      setFolders(response.folders || []);
      setError(null);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  // Load project files
  const loadFiles = useCallback(async () => {
    if (!projectId || !userId) return;
    
    try {
      const response = await fileAPI.getProjectFiles(projectId, userId);
      console.log('Loaded files:', response.files);
      setFiles(response.files || []);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
    }
  }, [projectId, userId]);

  // Load folder tree
  const loadFolderTree = useCallback(async (rootFolderId = null) => {
    if (!userId) return;
    
    try {
      const response = await folderAPI.getFolderTree(rootFolderId, userId);
      setFolderTree(response.tree || []);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
    }
  }, [userId]);

  // Load folder contents
  const loadFolderContents = useCallback(async (folderId) => {
    if (!folderId || !userId) return;
    
    try {
      const response = await folderAPI.getFolderContents(folderId, userId);
      return response.contents;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Load shared folders
  const loadSharedFolders = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await folderAPI.getSharedFolders(userId);
      setSharedFolders(response.folders || []);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
    }
  }, [userId]);

  // Load folder statistics
  const loadFolderStats = useCallback(async (folderId) => {
    if (!folderId || !userId) return;
    
    try {
      const response = await folderAPI.getFolderStats(folderId, userId);
      setFolderStats(prev => ({ ...prev, [folderId]: response.stats }));
      return response.stats;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Create folder
  const createFolder = useCallback(async (folderData) => {
    if (!projectId || !userId) return null;
    
    try {
      const response = await folderAPI.createFolder({
        ...folderData,
        projectId,
        owner: userId
      });
      
      // Add new folder to state
      setFolders(prev => [...prev, response.folder]);
      toast.success('Folder created successfully');
      return response.folder;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [projectId, userId]);

  // Update folder
  const updateFolder = useCallback(async (folderId, folderData) => {
    if (!folderId || !userId) return null;
    
    try {
      const response = await folderAPI.updateFolder(folderId, folderData, userId);
      
      // Update folder in state
      setFolders(prev => prev.map(folder => 
        folder._id === folderId ? response.folder : folder
      ));
      
      toast.success('Folder updated successfully');
      return response.folder;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId, force = false) => {
    if (!folderId || !userId) return false;
    
    try {
      await folderAPI.deleteFolder(folderId, userId, force);
      setFolders(prev => prev.filter(folder => folder._id !== folderId));
      toast.success('Folder deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Move folder
  const moveFolder = useCallback(async (folderId, newParentId) => {
    if (!folderId || !userId) return false;
    
    try {
      const response = await folderAPI.moveFolder(folderId, newParentId, userId);
      
      // Update folder in state
      setFolders(prev => prev.map(folder => 
        folder._id === folderId ? response.folder : folder
      ));
      
      toast.success('Folder moved successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Copy folder
  const copyFolder = useCallback(async (folderId, newParentId, newName) => {
    if (!folderId || !userId) return null;
    
    try {
      const response = await folderAPI.copyFolder(folderId, newParentId, newName, userId);
      
      // Add copied folder to state
      setFolders(prev => [...prev, response.folder]);
      toast.success('Folder copied successfully');
      return response.folder;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Share folder
  const shareFolder = useCallback(async (folderId, targetUserId, permissions) => {
    if (!folderId || !userId) return false;
    
    try {
      await folderAPI.shareFolder(folderId, targetUserId, permissions, userId);
      toast.success('Folder shared successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Archive folder
  const archiveFolder = useCallback(async (folderId) => {
    if (!folderId || !userId) return false;
    
    try {
      await folderAPI.archiveFolder(folderId, userId);
      
      // Update folder in state
      setFolders(prev => prev.map(folder => 
        folder._id === folderId ? { ...folder, isArchived: true } : folder
      ));
      
      toast.success('Folder archived successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Restore folder
  const restoreFolder = useCallback(async (folderId) => {
    if (!folderId || !userId) return false;
    
    try {
      await folderAPI.restoreFolder(folderId, userId);
      
      // Update folder in state
      setFolders(prev => prev.map(folder => 
        folder._id === folderId ? { ...folder, isArchived: false } : folder
      ));
      
      toast.success('Folder restored successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Search folders
  const searchFolders = useCallback(async (query) => {
    if (!projectId || !userId || !query.trim()) return { folders: [] };
    
    try {
      const response = await folderAPI.searchFolders(projectId, query, userId);
      return response;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return { folders: [] };
    }
  }, [projectId, userId]);

  // Get folder permissions
  const getFolderPermissions = useCallback(async (folderId) => {
    if (!folderId || !userId) return null;
    
    try {
      const response = await folderAPI.getFolderPermissions(folderId, userId);
      return response.permissions;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Update folder permissions
  const updateFolderPermissions = useCallback(async (folderId, permissions) => {
    if (!folderId || !userId) return false;
    
    try {
      await folderAPI.updateFolderPermissions(folderId, permissions, userId);
      toast.success('Folder permissions updated successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Create file
  const createFile = useCallback(async (fileData) => {
    if (!projectId || !userId) return null;
    
    try {
      const response = await fileAPI.createFile({
        ...fileData,
        projectId,
        owner: userId
      });
      
      // Add new file to state
      setFiles(prev => [...prev, response.file]);
      
      // Automatically select the newly created file
      setSelectedFile(response.file._id);
      setFileContent(response.file.content || '');
      
      toast.success('File created successfully');
      return response.file;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [projectId, userId]);

  // Load file content
  const loadFileContent = useCallback(async (fileId) => {
    if (!fileId || !userId) return;
    
    try {
      const response = await fileAPI.getFileContent(fileId, userId);
      setFileContent(response.content || '');
      setSelectedFile(fileId);
      return response.content;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Update file content
  const updateFileContent = useCallback(async (fileId, content, comment = '') => {
    if (!fileId || !userId) return false;
    
    try {
      const response = await fileAPI.updateFileContent(fileId, content, userId, comment);
      setFileContent(content);
      toast.success('File updated successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Delete file
  const deleteFile = useCallback(async (fileId) => {
    if (!fileId || !userId) return false;
    
    try {
      await fileAPI.deleteFile(fileId, userId);
      setFiles(prev => prev.filter(file => file._id !== fileId));
      
      // Clear selected file if it was deleted
      if (selectedFile === fileId) {
        setSelectedFile(null);
        setFileContent('');
      }
      
      toast.success('File deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId, selectedFile]);

  // Move file
  const moveFile = useCallback(async (fileId, newFolderId) => {
    if (!fileId || !userId) return false;
    
    try {
      const response = await fileAPI.moveFile(fileId, newFolderId, userId);
      
      // Update file in state
      setFiles(prev => prev.map(file => 
        file._id === fileId ? response.file : file
      ));
      
      toast.success('File moved successfully');
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return false;
    }
  }, [userId]);

  // Duplicate file
  const duplicateFile = useCallback(async (fileId, newName) => {
    if (!fileId || !userId) return null;
    
    try {
      const response = await fileAPI.duplicateFile(fileId, newName, userId);
      
      // Add duplicated file to state
      setFiles(prev => [...prev, response.file]);
      toast.success('File duplicated successfully');
      return response.file;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return null;
    }
  }, [userId]);

  // Toggle folder expansion
  const toggleFolderExpansion = useCallback((folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Build file tree
  const buildFileTree = useCallback(() => {
    console.log('Building file tree with:', { folders: folders.length, files: files.length });
    
    const folderMap = new Map();
    const fileMap = new Map();
    
    // Create maps for quick lookup
    folders.forEach(folder => {
      folderMap.set(folder._id, { ...folder, type: 'folder', children: [] });
    });
    
    files.forEach(file => {
      fileMap.set(file._id, { ...file, type: 'file' });
      console.log('File:', file.name, 'Folder:', file.folder);
    });
    
    // Build tree structure
    const tree = [];
    
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder._id);
      // Handle parent reference - could be an object (populated) or string (ID)
      const parentId = folder.parent?._id || folder.parent;
      if (parentId) {
        const parentFolder = folderMap.get(parentId);
        if (parentFolder) {
          parentFolder.children.push(folderNode);
        } else {
          // Parent not found in current list, add to root
          tree.push(folderNode);
        }
      } else {
        tree.push(folderNode);
      }
    });
    
    // Add files to their folders
    files.forEach(file => {
      const fileNode = fileMap.get(file._id);
      // Handle folder reference - could be an object (populated) or string (ID)
      const folderId = file.folder?._id || file.folder;
      console.log('Processing file:', file.name, 'Folder ID:', folderId);
      if (folderId) {
        const parentFolder = folderMap.get(folderId);
        if (parentFolder) {
          parentFolder.children.push(fileNode);
          console.log('Added file to folder:', parentFolder.name);
        } else {
          // Parent folder not found, add to root
          console.log('Folder not found, adding to root');
          tree.push(fileNode);
        }
      } else {
        console.log('No folder reference, adding to root');
        tree.push(fileNode);
      }
    });
    
    console.log('Final tree:', tree);
    return tree;
  }, [folders, files]);

  // Search items
  const searchItems = useCallback(async (query) => {
    if (!query.trim()) return { files: [], folders: [] };
    
    try {
      const [fileResults, folderResults] = await Promise.all([
        fileAPI.searchFiles(projectId, query, userId),
        searchFolders(query)
      ]);
      
      return {
        files: fileResults.files || [],
        folders: folderResults.folders || []
      };
    } catch (err) {
      const errorMessage = handleAPIError(err);
      toast.error(errorMessage);
      return { files: [], folders: [] };
    }
  }, [projectId, userId, searchFolders]);

  // Load initial data
  useEffect(() => {
    if (projectId && userId) {
      Promise.all([
        loadFolders(),
        loadFiles(),
        loadSharedFolders()
      ]);
    }
  }, [projectId, userId, loadFolders, loadFiles, loadSharedFolders]);

  return {
    // State
    folders,
    files,
    loading,
    error,
    selectedFile,
    setSelectedFile,
    fileContent,
    expandedFolders,
    folderTree,
    searchResults,
    folderStats,
    sharedFolders,
    
    // Folder operations
    loadFolders,
    loadFolderTree,
    loadFolderContents,
    loadSharedFolders,
    loadFolderStats,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    shareFolder,
    archiveFolder,
    restoreFolder,
    searchFolders,
    getFolderPermissions,
    updateFolderPermissions,
    
    // File operations
    loadFiles,
    createFile,
    loadFileContent,
    updateFileContent,
    deleteFile,
    moveFile,
    duplicateFile,
    
    // Utility functions
    toggleFolderExpansion,
    buildFileTree,
    searchItems
  };
}; 