const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Project API - Enhanced with all new endpoints
const projectAPI = {
  // Create new project
  createProject: async (projectData) => {
    const response = await apiCall('/projects/new', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
    
    return response.project; // Extract project from response
  },

  // Get all projects for user (enhanced with filtering and pagination)
  getProjects: async (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    const url = `/projects/getProjects?${queryParams.toString()}`;
    const response = await apiCall(url);
    return response; // Return full response with projects array
  },

  // Get project by ID
  getProject: (projectId, userId) => 
    apiCall(`/projects/${projectId}?userId=${userId}`),

  // Update project
  updateProject: async (projectId, projectData, userId) => {
    const response = await apiCall(`/projects/${projectId}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
    return response.project; // Extract project from response
  },

  // Delete project
  deleteProject: (projectId, userId, force = false) => 
    apiCall(`/projects/${projectId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, force })
    }),

  // Get project statistics
  getProjectStats: (projectId, userId) => 
    apiCall(`/projects/${projectId}/stats?userId=${userId}`),

  // Add member to project
  addMember: async (projectId, memberData) => {
    const response = await apiCall(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
    return response.project; // Extract project from response
  },

  // Remove member from project
  removeMember: async (projectId, memberData) => {
    const response = await apiCall(`/projects/${projectId}/members`, {
      method: 'DELETE',
      body: JSON.stringify(memberData)
    });
    return response.project; // Extract project from response
  },

  // Search projects
  searchProjects: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    return apiCall(`/projects/search?${queryParams.toString()}`);
  },

  // Get public projects
  getPublicProjects: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    return apiCall(`/projects/public?${queryParams.toString()}`);
  }
};

// Folder API - Enhanced with all backend endpoints
 const folderAPI = {
  // Create new folder
  createFolder: async (folderData) => {
    const response = await apiCall('/folders/create', {
      method: 'POST',
      body: JSON.stringify(folderData)
    });
    return response; // Return full response
  },

  // Get all folders for a project
  getProjectFolders: async (projectId, userId, includeArchived = false) => {
    const response = await apiCall(`/folders/project/${projectId}?userId=${userId}&includeArchived=${includeArchived}`);
    return response; // Return full response
  },

  // Get folder by ID
  getFolder: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}?userId=${userId}`);
    return response; // Return full response
  },

  // Get folder tree
  getFolderTree: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}/tree?userId=${userId}`);
    return response; // Return full response
  },

  // Get folder contents
  getFolderContents: async (folderId, userId, includeArchived = false) => {
    const response = await apiCall(`/folders/${folderId}/contents?userId=${userId}&includeArchived=${includeArchived}`);
    return response; // Return full response
  },

  // Update folder
  updateFolder: async (folderId, folderData, userId) => {
    const response = await apiCall(`/folders/${folderId}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(folderData)
    });
    return response; // Return full response
  },

  // Delete folder
  deleteFolder: (folderId, userId, force = false) => 
    apiCall(`/folders/${folderId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, force })
    }),

  // Move folder
  moveFolder: async (folderId, newParentId, userId) => {
    const response = await apiCall(`/folders/${folderId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ newParentId, userId })
    });
    return response; // Return full response
  },

  // Copy folder
  copyFolder: async (folderId, newParentId, newName, userId) => {
    const response = await apiCall(`/folders/${folderId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ newParentId, newName, userId })
    });
    return response; // Return full response
  },

  // Share folder
  shareFolder: async (folderId, targetUserId, permissions, userId) => {
    const response = await apiCall(`/folders/${folderId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId, permissions })
    });
    return response; // Return full response
  },

  // Get shared folders
  getSharedFolders: async (userId) => {
    const response = await apiCall(`/folders/shared/${userId}`);
    return response; // Return full response
  },

  // Search folders
  searchFolders: async (projectId, query, userId) => {
    const response = await apiCall(`/folders/search/${projectId}?query=${encodeURIComponent(query)}&userId=${userId}`);
    return response; // Return full response
  },

  // Get folder statistics
  getFolderStats: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}/stats?userId=${userId}`);
    return response; // Return full response
  },

  // Archive folder
  archiveFolder: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}/archive`, {
      method: 'PUT',
      body: JSON.stringify({ userId })
    });
    return response; // Return full response
  },

  // Restore folder
  restoreFolder: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}/restore`, {
      method: 'PUT',
      body: JSON.stringify({ userId })
    });
    return response; // Return full response
  },

  // Get folder permissions
  getFolderPermissions: async (folderId, userId) => {
    const response = await apiCall(`/folders/${folderId}/permissions?userId=${userId}`);
    return response; // Return full response
  },

  // Update folder permissions
  updateFolderPermissions: async (folderId, permissions, userId) => {
    const response = await apiCall(`/folders/${folderId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions, userId })
    });
    return response; // Return full response
  }
};

// File API
 const fileAPI = {
  // Create new file
  createFile: async (fileData) => {
    const response = await apiCall('/files/create', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
    return response; // Return full response
  },

  // Get all files for a project
  getProjectFiles: async (projectId, userId, includeArchived = false) => {
    const response = await apiCall(`/files/project/${projectId}?userId=${userId}&includeArchived=${includeArchived}`);
    return response; // Return full response
  },

  // Get files by folder
  getFolderFiles: async (folderId, userId, includeArchived = false) => {
    const response = await apiCall(`/files/folder/${folderId}?userId=${userId}&includeArchived=${includeArchived}`);
    return response; // Return full response
  },

  // Get file by ID
  getFile: async (fileId, userId) => {
    const response = await apiCall(`/files/${fileId}?userId=${userId}`);
    return response.file; // Extract file from response
  },

  // Get file content
  getFileContent: async (fileId, userId) => {
    const response = await apiCall(`/files/${fileId}/content?userId=${userId}`);
    return response.content; // Extract content from response
  },

  // Update file content
  updateFileContent: async (fileId, content, userId, comment = '') => {
    const response = await apiCall(`/files/${fileId}/content`, {
      method: 'PUT',
      body: JSON.stringify({ content, userId, comment })
    });
    return response.file; // Extract file from response
  },

  // Update file metadata
  updateFile: async (fileId, fileData) => {
    const response = await apiCall(`/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(fileData)
    });
    return response.file; // Extract file from response
  },

  // Delete file
  deleteFile: (fileId, userId) => 
    apiCall(`/files/${fileId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId })
    }),

  // Create file version
  createFileVersion: async (fileId, content, userId, comment = '') => {
    const response = await apiCall(`/files/${fileId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ content, userId, comment })
    });
    return response.version; // Extract version from response
  },

  // Get file versions
  getFileVersions: async (fileId, userId) => {
    const response = await apiCall(`/files/${fileId}/versions?userId=${userId}`);
    return response.versions; // Extract versions from response
  },

  // Lock file
  lockFile: async (fileId, userId) => {
    const response = await apiCall(`/files/${fileId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.file; // Extract file from response
  },

  // Unlock file
  unlockFile: async (fileId, userId) => {
    const response = await apiCall(`/files/${fileId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.file; // Extract file from response
  },

  // Duplicate file
  duplicateFile: async (fileId, newName, userId) => {
    const response = await apiCall(`/files/${fileId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ newName, userId })
    });
    return response.file; // Extract file from response
  },

  // Move file
  moveFile: async (fileId, newFolderId, userId) => {
    const response = await apiCall(`/files/${fileId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ newFolderId, userId })
    });
    return response.file; // Extract file from response
  },

  // Copy file
  copyFile: async (fileId, newFolderId, newName, userId) => {
    const response = await apiCall(`/files/${fileId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ newFolderId, newName, userId })
    });
    return response.file; // Extract file from response
  },

  // Share file
  shareFile: async (fileId, targetUserId, permissions, userId) => {
    const response = await apiCall(`/files/${fileId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId, permissions })
    });
    return response.file; // Extract file from response
  },

  // Get shared files
  getSharedFiles: async (userId) => {
    const response = await apiCall(`/files/shared/${userId}`);
    return response.files; // Extract files from response
  },

  // Search files
  searchFiles: async (projectId, query, userId) => {
    const response = await apiCall(`/files/search/${projectId}?query=${encodeURIComponent(query)}&userId=${userId}`);
    return response.files; // Extract files from response
  },

  // Download file
  downloadFile: (fileId, userId) => 
    apiCall(`/files/${fileId}/download?userId=${userId}`)
};

// Error handling utility
const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  if (error.message.includes('401')) {
    return 'Unauthorized. Please log in again.';
  }
  
  if (error.message.includes('403')) {
    return 'Access denied. You don\'t have permission for this action.';
  }
  
  if (error.message.includes('404')) {
    return 'Resource not found.';
  }
  
  if (error.message.includes('409')) {
    return 'Conflict. This resource already exists.';
  }
  
  if (error.message.includes('429')) {
    return 'Too many requests. Please try again later.';
  }
  
  return error.message || 'An unexpected error occurred.';
};

 const userAPI = {
  createUser: async (userData) => {
    const response = await apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.user;
  },
  getUserProfile: async (uid) => {
    const response = await apiCall(`/users/${uid}`);
    return response.user;
  },
  updateUserProfile: async (uid, data) => {
    const response = await apiCall(`/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.user;
  },
};

// Helper function to get token from auth context
const getAuthToken = () => {
  // This will be passed as parameter or retrieved from context
  return null; // Will be set by the component
};

// Create a standard HTTP client for general API calls
const createAPI = (token = null) => ({
  get: async (endpoint, options = {}) => {
    const authToken = token || getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    };
    
    return apiCall(endpoint, {
      method: 'GET',
      headers,
      ...options
    });
  },
  
  post: async (endpoint, data, options = {}) => {
    const authToken = token || getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    };
    
    return apiCall(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options
    });
  },
  
  put: async (endpoint, data, options = {}) => {
    const authToken = token || getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    };
    
    return apiCall(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options
    });
  },
  
  delete: async (endpoint, options = {}) => {
    const authToken = token || getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    };
    
    return apiCall(endpoint, {
      method: 'DELETE',
      headers,
      ...options
    });
  }
});

// Default API instance (for backward compatibility)
const api = createAPI();

export default api;

export {
  api,
  createAPI,
  projectAPI,
  folderAPI,
  fileAPI,
  userAPI,
  handleAPIError
}; 