import path from 'path';
import File from '../models/file.js';
import Folder from '../models/Folder.js';

/**
 * Virtual Workspace Manager
 * Provides workspace functionality without requiring Docker
 * Files are stored in database and served through virtual filesystem
 */
class VirtualWorkspaceManager {
  constructor() {
    this.projectWorkspaces = new Map(); // projectId -> workspace info
  }

  /**
   * Initialize workspace for a project
   */
  async initializeProjectWorkspace(projectId) {
    try {
      console.log(`📁 Initializing virtual workspace for project: ${projectId}`);
      
      // Load all files and folders for the project
      const [files, folders] = await Promise.all([
        File.find({ project: projectId }).populate('folder', 'name path'),
        Folder.find({ project: projectId }).populate('parent', 'name path')
      ]);

      const workspace = {
        projectId,
        files: new Map(), // path -> file content
        folders: new Set(), // folder paths
        lastSync: new Date()
      };

      // Add folders to workspace
      folders.forEach(folder => {
        const folderPath = this.getFolderPath(folder);
        workspace.folders.add(folderPath);
        console.log(`📂 Added folder: ${folderPath}`);
      });

      // Add files to workspace
      files.forEach(file => {
        const filePath = this.getFilePath(file);
        workspace.files.set(filePath, {
          content: file.content || '',
          size: file.size || 0,
          lastModified: file.lastModified || file.createdAt,
          id: file._id.toString()
        });
        console.log(`📄 Added file: ${filePath}`);
      });

      this.projectWorkspaces.set(projectId, workspace);
      console.log(`✅ Virtual workspace initialized with ${files.length} files and ${folders.length} folders`);
      
      return workspace;
    } catch (error) {
      console.error(`❌ Failed to initialize virtual workspace:`, error);
      throw error;
    }
  }

  /**
   * Write file to virtual workspace
   */
  async writeFile(projectId, filePath, content) {
    try {
      let workspace = this.projectWorkspaces.get(projectId);
      
      if (!workspace) {
        workspace = await this.initializeProjectWorkspace(projectId);
      }

      // Update file in virtual workspace
      workspace.files.set(filePath, {
        content,
        size: Buffer.byteLength(content, 'utf8'),
        lastModified: new Date(),
        synced: true
      });

      workspace.lastSync = new Date();

      console.log(`✅ File written to virtual workspace: ${filePath} (${content.length} chars)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to write file to virtual workspace:`, error);
      return false;
    }
  }

  /**
   * Read file from virtual workspace
   */
  async readFile(projectId, filePath) {
    try {
      let workspace = this.projectWorkspaces.get(projectId);
      
      if (!workspace) {
        workspace = await this.initializeProjectWorkspace(projectId);
      }

      const fileInfo = workspace.files.get(filePath);
      if (!fileInfo) {
        console.log(`📄 File not found in virtual workspace: ${filePath}`);
        return null;
      }

      return fileInfo.content;
    } catch (error) {
      console.error(`❌ Failed to read file from virtual workspace:`, error);
      return null;
    }
  }

  /**
   * List files in virtual workspace
   */
  async listFiles(projectId, directoryPath = '') {
    try {
      let workspace = this.projectWorkspaces.get(projectId);
      
      if (!workspace) {
        workspace = await this.initializeProjectWorkspace(projectId);
      }

      const files = Array.from(workspace.files.keys()).filter(filePath => {
        if (!directoryPath) return true;
        return filePath.startsWith(directoryPath + '/') || filePath === directoryPath;
      });

      return files;
    } catch (error) {
      console.error(`❌ Failed to list files in virtual workspace:`, error);
      return [];
    }
  }

  /**
   * Delete file from virtual workspace
   */
  async deleteFile(projectId, filePath) {
    try {
      const workspace = this.projectWorkspaces.get(projectId);
      
      if (workspace && workspace.files.has(filePath)) {
        workspace.files.delete(filePath);
        workspace.lastSync = new Date();
        console.log(`✅ File deleted from virtual workspace: ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Failed to delete file from virtual workspace:`, error);
      return false;
    }
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(projectId) {
    try {
      let workspace = this.projectWorkspaces.get(projectId);
      
      if (!workspace) {
        workspace = await this.initializeProjectWorkspace(projectId);
      }

      const totalSize = Array.from(workspace.files.values())
        .reduce((sum, file) => sum + (file.size || 0), 0);

      return {
        fileCount: workspace.files.size,
        folderCount: workspace.folders.size,
        totalSize: totalSize,
        sizeFormatted: this.formatBytes(totalSize),
        lastSync: workspace.lastSync,
        type: 'virtual'
      };
    } catch (error) {
      console.error(`❌ Failed to get workspace stats:`, error);
      return {
        fileCount: 0,
        folderCount: 0,
        totalSize: 0,
        sizeFormatted: '0 B',
        lastSync: null,
        type: 'error'
      };
    }
  }

  /**
   * Sync workspace with database
   */
  async syncWithDatabase(projectId) {
    try {
      console.log(`🔄 Syncing virtual workspace with database for project: ${projectId}`);
      
      // Simply reinitialize the workspace to get latest data
      const workspace = await this.initializeProjectWorkspace(projectId);
      
      console.log(`✅ Virtual workspace synced successfully`);
      return workspace;
    } catch (error) {
      console.error(`❌ Failed to sync virtual workspace:`, error);
      throw error;
    }
  }

  /**
   * Get file path from file object
   */
  getFilePath(file) {
    if (file.folder && file.folder.path) {
      return path.join(file.folder.path, file.name).replace(/\\/g, '/');
    }
    return file.name;
  }

  /**
   * Get folder path from folder object
   */
  getFolderPath(folder) {
    if (folder.path) {
      return folder.path;
    }
    if (folder.parent && folder.parent.path) {
      return path.join(folder.parent.path, folder.name).replace(/\\/g, '/');
    }
    return folder.name || '';
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clean up workspace
   */
  async cleanupWorkspace(projectId) {
    try {
      this.projectWorkspaces.delete(projectId);
      console.log(`✅ Virtual workspace cleaned up for project: ${projectId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup virtual workspace:`, error);
    }
  }
}

// Singleton instance
let virtualWorkspaceInstance = null;

export const getVirtualWorkspaceManager = () => {
  if (!virtualWorkspaceInstance) {
    virtualWorkspaceInstance = new VirtualWorkspaceManager();
  }
  return virtualWorkspaceInstance;
};

export default VirtualWorkspaceManager;
