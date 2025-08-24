import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFileManager } from '../../hooks/useFileManager';
import { 
  Folder, 
  FolderOpen,
  FolderPlus,
  Edit3,
  Trash2,
  Copy,
  Move,
  Share2,
  Archive,
  RotateCcw,
  Lock,
  Unlock,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
  Download,
  Upload,
  Settings,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const FolderManager = ({ projectId, onFolderSelect }) => {
  const { user } = useAuth();
  const {
    folders,
    sharedFolders,
    folderStats,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    shareFolder,
    archiveFolder,
    restoreFolder,
    getFolderPermissions,
    updateFolderPermissions,
    loadFolderStats
  } = useFileManager(projectId, user?.uid);

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'shared', 'archived'
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create', 'edit', 'share', 'permissions'
  const [modalData, setModalData] = useState({});
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, folder: null });

  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [parentFolder, setParentFolder] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermissions, setSharePermissions] = useState('read');
  const [permissions, setPermissions] = useState({});

  // Load folder stats when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFolderStats(selectedFolder._id);
    }
  }, [selectedFolder, loadFolderStats]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      let path = '';
      if (parentFolder) {
        const parent = folders.find(f => f._id === parentFolder);
        if (parent) {
          // If parent.path is empty, fallback to 'Root' or project name
          const basePath = parent.path && parent.path.trim() !== ''
            ? parent.path
            : (folders[0]?.project?.name && typeof folders[0].project.name === 'string' && folders[0].project.name.trim() !== ''
                ? folders[0].project.name
                : 'Root');
          path = basePath + (parent.name ? '/' + parent.name : '');
        }
      } else {
        // Use project name for root folder path, fallback to 'Root'
        path = (folders[0]?.project?.name && typeof folders[0].project.name === 'string' && folders[0].project.name.trim() !== '')
          ? folders[0].project.name
          : 'Root';
      }
      await createFolder({
        name: folderName.trim(),
        description: folderDescription.trim(),
        parentId: parentFolder || null,
        path
      });
      
      setShowModal(false);
      setFolderName('');
      setFolderDescription('');
      setParentFolder('');
      toast.success('Folder created successfully');
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleUpdateFolder = async () => {
    if (!selectedFolder || !folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      await updateFolder(selectedFolder._id, {
        name: folderName.trim(),
        description: folderDescription.trim(),
        parentId: parentFolder || null
      });
      
      setShowModal(false);
      setFolderName('');
      setFolderDescription('');
      setParentFolder('');
      setSelectedFolder(null);
      toast.success('Folder updated successfully');
    } catch (error) {
      toast.error('Failed to update folder');
    }
  };

  const handleShareFolder = async () => {
    if (!selectedFolder || !shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      await shareFolder(selectedFolder._id, shareEmail, sharePermissions);
      setShowModal(false);
      setShareEmail('');
      setSharePermissions('read');
      toast.success('Folder shared successfully');
    } catch (error) {
      toast.error('Failed to share folder');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedFolder) return;

    try {
      await updateFolderPermissions(selectedFolder._id, permissions);
      setShowModal(false);
      setPermissions({});
      toast.success('Permissions updated successfully');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleDeleteFolder = async (folder, force = false) => {
    if (!folder) return;

    const confirmMessage = force 
      ? `Are you sure you want to permanently delete "${folder.name}" and all its contents?`
      : `Are you sure you want to delete "${folder.name}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteFolder(folder._id, force);
      if (selectedFolder?._id === folder._id) {
        setSelectedFolder(null);
      }
      toast.success('Folder deleted successfully');
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  const handleArchiveFolder = async (folder) => {
    if (!folder) return;

    try {
      if (folder.isArchived) {
        await restoreFolder(folder._id);
      } else {
        await archiveFolder(folder._id);
      }
      toast.success(folder.isArchived ? 'Folder restored successfully' : 'Folder archived successfully');
    } catch (error) {
      toast.error('Failed to archive/restore folder');
    }
  };

  const handleCopyFolder = async (folder) => {
    if (!folder) return;

    try {
      await copyFolder(folder._id, null, `${folder.name} (Copy)`);
      toast.success('Folder copied successfully');
    } catch (error) {
      toast.error('Failed to copy folder');
    }
  };

  const handleMoveFolder = async (folder, newParentId) => {
    if (!folder) return;

    try {
      await moveFolder(folder._id, newParentId);
      toast.success('Folder moved successfully');
    } catch (error) {
      toast.error('Failed to move folder');
    }
  };

  const openModal = (type, folder = null) => {
    setModalType(type);
    setModalData(folder || {});
    
    if (folder) {
      setFolderName(folder.name);
      setFolderDescription(folder.description || '');
      setParentFolder(folder.parent || '');
    } else {
      setFolderName('');
      setFolderDescription('');
      setParentFolder('');
    }
    
    setShowModal(true);
  };

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  const filteredFolders = folders.filter(folder => {
    // Filter by archived status
    if (!showArchived && folder.isArchived) return false;
    
    // Filter by type
    if (filterType === 'shared' && !folder.isShared) return false;
    if (filterType === 'archived' && !folder.isArchived) return false;
    
    // Filter by search query
    if (searchQuery && !folder.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const renderFolderItem = (folder) => {
    const isSelected = selectedFolder?._id === folder._id;
    const stats = folderStats[folder._id];

    return (
      <div
        key={folder._id}
        className={`p-3 rounded-lg border cursor-pointer transition-all ${
          isSelected 
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700' 
            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        onClick={() => {
          setSelectedFolder(folder);
          onFolderSelect?.(folder);
        }}
        onContextMenu={(e) => handleContextMenu(e, folder)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {folder.isArchived ? (
              <Archive className="h-5 w-5 text-gray-400" />
            ) : (
              <Folder className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <h3 className={`font-medium ${folder.isArchived ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                {folder.name}
              </h3>
              {folder.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {folder.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {folder.isShared && (
              <Share2 className="h-4 w-4 text-green-500" title="Shared" />
            )}
            {folder.isArchived && (
              <Archive className="h-4 w-4 text-gray-400" title="Archived" />
            )}
            {stats && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {stats.fileCount} files
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            {modalType === 'create' && 'Create Folder'}
            {modalType === 'edit' && 'Edit Folder'}
            {modalType === 'share' && 'Share Folder'}
            {modalType === 'permissions' && 'Folder Permissions'}
          </h2>

          {modalType === 'create' || modalType === 'edit' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter folder name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter folder description"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Folder
                </label>
                <select
                  value={parentFolder}
                  onChange={(e) => setParentFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Root Level</option>
                  {folders.map(folder => (
                    <option key={folder._id} value={folder._id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : modalType === 'share' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Permissions
                </label>
                <select
                  value={sharePermissions}
                  onChange={(e) => setSharePermissions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="read">Read Only</option>
                  <option value="write">Read & Write</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          ) : modalType === 'permissions' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.read || false}
                    onChange={(e) => setPermissions(prev => ({ ...prev, read: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Read</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.write || false}
                    onChange={(e) => setPermissions(prev => ({ ...prev, write: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Write</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.admin || false}
                    onChange={(e) => setPermissions(prev => ({ ...prev, admin: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Admin</span>
                </label>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (modalType === 'create') handleCreateFolder();
                else if (modalType === 'edit') handleUpdateFolder();
                else if (modalType === 'share') handleShareFolder();
                else if (modalType === 'permissions') handleUpdatePermissions();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {modalType === 'create' && 'Create'}
              {modalType === 'edit' && 'Update'}
              {modalType === 'share' && 'Share'}
              {modalType === 'permissions' && 'Update'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Folder Manager
          </h2>
          <button
            onClick={() => openModal('create')}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Folders</option>
            <option value="shared">Shared</option>
            <option value="archived">Archived</option>
          </select>
          
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`p-2 rounded-md ${
              showArchived 
                ? 'bg-gray-200 dark:bg-gray-700' 
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
            title="Show/Hide Archived"
          >
            <Archive className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Toggle View"
          >
            {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {filteredFolders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No folders found</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            {filteredFolders.map(renderFolderItem)}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              openModal('edit', contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </button>
          
          <button
            onClick={() => {
              openModal('share', contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>
          
          <button
            onClick={() => {
              openModal('permissions', contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Permissions
          </button>
          
          <button
            onClick={() => {
              handleCopyFolder(contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </button>
          
          <button
            onClick={() => {
              handleArchiveFolder(contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {contextMenu.folder?.isArchived ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              handleDeleteFolder(contextMenu.folder);
              setContextMenu({ show: false, x: 0, y: 0, folder: null });
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      )}

      {/* Modal */}
      {renderModal()}

      {/* Click outside to close context menu */}
      {contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu({ show: false, x: 0, y: 0, folder: null })}
        />
      )}
    </div>
  );
};

export default FolderManager; 