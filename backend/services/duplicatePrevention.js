import File from '../models/file.js';
import Folder from '../models/Folder.js';
import { getDockerWorkspaceManager } from './dockerWorkspace.js';
import mongoose from 'mongoose';

class DuplicatePreventionService {
  constructor() {
    this.dockerManager = getDockerWorkspaceManager();
  }

  /**
   * Check if file already exists in database with multiple criteria
   */
  async checkFileDuplicate(projectId, fileName, filePath, folderId = null) {
    try {
      const checks = [
        // Check by exact path
        File.findOne({ project: projectId, path: filePath }),
        // Check by name in same folder
        File.findOne({ project: projectId, name: fileName, folder: folderId }),
        // Check by name and path combination
        File.findOne({ project: projectId, name: fileName, path: filePath })
      ];

      const results = await Promise.all(checks);
      const existingFile = results.find(result => result !== null);

      if (existingFile) {
        console.log(`📄 Duplicate file detected: ${fileName} (ID: ${existingFile._id})`);
        return {
          isDuplicate: true,
          existingFile,
          reason: 'File already exists in database'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking file duplicate:', error);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Check if folder already exists in database
   */
  async checkFolderDuplicate(projectId, folderName, folderPath) {
    try {
      const checks = [
        // Check by exact path
        Folder.findOne({ project: projectId, path: folderPath }),
        // Check by name and path combination
        Folder.findOne({ project: projectId, name: folderName, path: folderPath })
      ];

      const results = await Promise.all(checks);
      const existingFolder = results.find(result => result !== null);

      if (existingFolder) {
        console.log(`📁 Duplicate folder detected: ${folderName} (ID: ${existingFolder._id})`);
        return {
          isDuplicate: true,
          existingFolder,
          reason: 'Folder already exists in database'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking folder duplicate:', error);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Check if file exists in Docker container
   */
  async checkContainerFileExists(projectId, filePath) {
    try {
      const containerInfo = await this.dockerManager.getProjectContainer(projectId);
      if (!containerInfo || !containerInfo.container) {
        return { exists: false, error: 'Container not found' };
      }

      const result = await this.dockerManager.executeInContainer(containerInfo.container, [
        'test', '-f', `/workspace/${filePath}`
      ]);

      return { exists: !result.error };
    } catch (error) {
      console.error('Error checking container file:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Check if folder exists in Docker container
   */
  async checkContainerFolderExists(projectId, folderPath) {
    try {
      const containerInfo = await this.dockerManager.getProjectContainer(projectId);
      if (!containerInfo || !containerInfo.container) {
        return { exists: false, error: 'Container not found' };
      }

      const result = await this.dockerManager.executeInContainer(containerInfo.container, [
        'test', '-d', `/workspace/${folderPath}`
      ]);

      return { exists: !result.error };
    } catch (error) {
      console.error('Error checking container folder:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Comprehensive duplicate check for files
   */
  async comprehensiveFileCheck(projectId, fileName, filePath, folderId = null) {
    try {
      // Check database duplicates
      const dbCheck = await this.checkFileDuplicate(projectId, fileName, filePath, folderId);
      if (dbCheck.isDuplicate) {
        return dbCheck;
      }

      // Check container duplicates
      const containerCheck = await this.checkContainerFileExists(projectId, filePath);
      if (containerCheck.exists) {
        console.log(`📄 File exists in container but not in database: ${filePath}`);
        return {
          isDuplicate: true,
          reason: 'File exists in container but not in database',
          location: 'container'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error in comprehensive file check:', error);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Comprehensive duplicate check for folders
   */
  async comprehensiveFolderCheck(projectId, folderName, folderPath) {
    try {
      // Check database duplicates
      const dbCheck = await this.checkFolderDuplicate(projectId, folderName, folderPath);
      if (dbCheck.isDuplicate) {
        return dbCheck;
      }

      // Check container duplicates
      const containerCheck = await this.checkContainerFolderExists(projectId, folderPath);
      if (containerCheck.exists) {
        console.log(`📁 Folder exists in container but not in database: ${folderPath}`);
        return {
          isDuplicate: true,
          reason: 'Folder exists in container but not in database',
          location: 'container'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error in comprehensive folder check:', error);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Find and remove duplicate files in database
   */
  async removeDuplicateFiles(projectId) {
    try {
      console.log(`🧹 Removing duplicate files for project: ${projectId}`);
      
      // Find files with same path but different IDs
      const duplicateFiles = await File.aggregate([
        {
          $match: { project: new mongoose.Types.ObjectId(projectId) }
        },
        {
          $group: {
            _id: '$path',
            count: { $sum: 1 },
            files: { $push: '$$ROOT' }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      let removedCount = 0;
      
      for (const group of duplicateFiles) {
        // Keep the first file, remove the rest
        const filesToRemove = group.files.slice(1);
        
        for (const file of filesToRemove) {
          try {
            await File.findByIdAndDelete(file._id);
            console.log(`🗑️ Removed duplicate file: ${file.name} (ID: ${file._id})`);
            removedCount++;
          } catch (error) {
            console.warn(`⚠️ Failed to remove duplicate file ${file.name}: ${error.message}`);
          }
        }
      }
      
      console.log(`✅ Removed ${removedCount} duplicate files`);
      return { removed: removedCount };
    } catch (error) {
      console.error('Error removing duplicate files:', error);
      return { error: error.message };
    }
  }

  /**
   * Find and remove duplicate folders in database
   */
  async removeDuplicateFolders(projectId) {
    try {
      console.log(`🧹 Removing duplicate folders for project: ${projectId}`);
      
      // Find folders with same path but different IDs
      const duplicateFolders = await Folder.aggregate([
        {
          $match: { project: new mongoose.Types.ObjectId(projectId) }
        },
        {
          $group: {
            _id: '$path',
            count: { $sum: 1 },
            folders: { $push: '$$ROOT' }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      let removedCount = 0;
      
      for (const group of duplicateFolders) {
        // Keep the first folder, remove the rest
        const foldersToRemove = group.folders.slice(1);
        
        for (const folder of foldersToRemove) {
          try {
            await Folder.findByIdAndDelete(folder._id);
            console.log(`🗑️ Removed duplicate folder: ${folder.name} (ID: ${folder._id})`);
            removedCount++;
          } catch (error) {
            console.warn(`⚠️ Failed to remove duplicate folder ${folder.name}: ${error.message}`);
          }
        }
      }
      
      console.log(`✅ Removed ${removedCount} duplicate folders`);
      return { removed: removedCount };
    } catch (error) {
      console.error('Error removing duplicate folders:', error);
      return { error: error.message };
    }
  }

  /**
   * Clean up orphaned files (in container but not in database)
   */
  async cleanupOrphanedFiles(projectId) {
    try {
      console.log(`🧹 Cleaning up orphaned files for project: ${projectId}`);
      
      // Get all files in database
      const dbFiles = await File.find({ project: projectId });
      const dbFilePaths = new Set(dbFiles.map(f => f.path || f.name));
      
      // Get all files in container
      const containerFiles = await this.dockerManager.listFilesInContainer(projectId);
      
      // Find orphaned files
      const orphanedFiles = containerFiles.filter(filePath => !dbFilePaths.has(filePath));
      
      console.log(`📄 Found ${orphanedFiles.length} orphaned files in container`);
      
      // Remove orphaned files
      for (const filePath of orphanedFiles) {
        try {
          await this.dockerManager.deleteFileFromContainer(projectId, filePath);
          console.log(`🗑️ Removed orphaned file: ${filePath}`);
        } catch (error) {
          console.warn(`⚠️ Failed to remove orphaned file ${filePath}: ${error.message}`);
        }
      }
      
      return { removed: orphanedFiles.length };
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      return { error: error.message };
    }
  }

  /**
   * Clean up orphaned folders (in container but not in database)
   */
  async cleanupOrphanedFolders(projectId) {
    try {
      console.log(`🧹 Cleaning up orphaned folders for project: ${projectId}`);
      
      // Get all folders in database
      const dbFolders = await Folder.find({ project: projectId });
      const dbFolderPaths = new Set(dbFolders.map(f => f.path));
      
      // Get all directories in container
      const containerInfo = await this.dockerManager.getProjectContainer(projectId);
      if (!containerInfo || !containerInfo.container) {
        return { error: 'Container not found' };
      }
      
      const result = await this.dockerManager.executeInContainer(containerInfo.container, [
        'find', '/workspace', '-type', 'd', '-not', '-path', '/workspace', '-printf', '%P\n'
      ]);
      
      const containerFolders = result.output.split('\n').filter(f => f.trim());
      
      // Find orphaned folders
      const orphanedFolders = containerFolders.filter(folderPath => !dbFolderPaths.has(folderPath));
      
      console.log(`📁 Found ${orphanedFolders.length} orphaned folders in container`);
      
      // Remove orphaned folders
      for (const folderPath of orphanedFolders) {
        try {
          await this.dockerManager.deleteFolderFromContainer(projectId, folderPath);
          console.log(`🗑️ Removed orphaned folder: ${folderPath}`);
        } catch (error) {
          console.warn(`⚠️ Failed to remove orphaned folder ${folderPath}: ${error.message}`);
        }
      }
      
      return { removed: orphanedFolders.length };
    } catch (error) {
      console.error('Error cleaning up orphaned folders:', error);
      return { error: error.message };
    }
  }

  /**
   * Sync missing files from container to database
   */
  async syncMissingFiles(projectId, projectOwnerId) {
    try {
      console.log(`🔄 Syncing missing files for project: ${projectId}`);
      
      // Get all files in database
      const dbFiles = await File.find({ project: projectId });
      const dbFilePaths = new Set(dbFiles.map(f => f.path || f.name));
      
      // Get all files in container
      const containerFiles = await this.dockerManager.listFilesInContainer(projectId);
      
      // Find missing files (in container but not in database)
      const missingFiles = containerFiles.filter(filePath => !dbFilePaths.has(filePath));
      
      console.log(`📄 Found ${missingFiles.length} missing files to sync`);
      
      let syncedCount = 0;
      
      for (const filePath of missingFiles) {
        try {
          // Read file content from container
          const content = await this.dockerManager.readFileFromContainer(projectId, filePath);
          if (content === null) continue;
          
          // Parse file path to get folder structure
          const pathParts = filePath.split('/');
          const fileName = pathParts.pop();
          const folderPath = pathParts.join('/');
          
          // Find or create folder
          let folder = null;
          if (folderPath) {
            folder = await Folder.findOne({ project: projectId, path: folderPath });
            if (!folder) {
              // Create folder hierarchy
              const folderParts = folderPath.split('/');
              let currentPath = '';
              let parentFolder = null;
              
              for (let i = 0; i < folderParts.length; i++) {
                const folderName = folderParts[i];
                currentPath = folderParts.slice(0, i + 1).join('/');
                
                folder = await Folder.findOne({ project: projectId, path: currentPath });
                if (!folder) {
                  folder = await Folder.create({
                    name: folderName,
                    path: currentPath,
                    project: projectId,
                    owner: projectOwnerId,
                    parent: parentFolder?._id || null,
                    level: i,
                    isRoot: i === 0
                  });
                }
                parentFolder = folder;
              }
            }
          } else {
            // File is in root
            folder = await Folder.findOne({ project: projectId, isRoot: true });
            if (!folder) {
              folder = await Folder.create({
                name: 'Root',
                path: 'Root',
                project: projectId,
                owner: projectOwnerId,
                isRoot: true,
                level: 0
              });
            }
          }
          
          // Create file in database
          const fileData = {
            name: fileName,
            path: filePath,
            content,
            project: projectId,
            owner: projectOwnerId,
            folder: folder._id,
            size: Buffer.byteLength(content, 'utf8'),
            type: this.getFileType(fileName),
            extension: this.getFileExtension(fileName)
          };
          
          await File.create(fileData);
          
          // Add file to folder's files array
          await Folder.findByIdAndUpdate(folder._id, {
            $addToSet: { files: fileData._id }
          });
          
          console.log(`✅ Synced missing file: ${filePath}`);
          syncedCount++;
          
        } catch (error) {
          console.warn(`⚠️ Failed to sync missing file ${filePath}: ${error.message}`);
        }
      }
      
      console.log(`✅ Synced ${syncedCount} missing files`);
      return { synced: syncedCount };
    } catch (error) {
      console.error('Error syncing missing files:', error);
      return { error: error.message };
    }
  }

  /**
   * Sync missing folders from container to database
   */
  async syncMissingFolders(projectId, projectOwnerId) {
    try {
      console.log(`🔄 Syncing missing folders for project: ${projectId}`);
      
      // Get all folders in database
      const dbFolders = await Folder.find({ project: projectId });
      const dbFolderPaths = new Set(dbFolders.map(f => f.path));
      
      // Get all directories in container
      const containerInfo = await this.dockerManager.getProjectContainer(projectId);
      if (!containerInfo || !containerInfo.container) {
        return { error: 'Container not found' };
      }
      
      const result = await this.dockerManager.executeInContainer(containerInfo.container, [
        'find', '/workspace', '-type', 'd', '-not', '-path', '/workspace', '-printf', '%P\n'
      ]);
      
      const containerFolders = result.output.split('\n').filter(f => f.trim());
      
      // Find missing folders (in container but not in database)
      const missingFolders = containerFolders.filter(folderPath => !dbFolderPaths.has(folderPath));
      
      console.log(`📁 Found ${missingFolders.length} missing folders to sync`);
      
      let syncedCount = 0;
      
      for (const folderPath of missingFolders) {
        try {
          // Create folder hierarchy
          const folderParts = folderPath.split('/');
          let currentPath = '';
          let parentFolder = null;
          
          for (let i = 0; i < folderParts.length; i++) {
            const folderName = folderParts[i];
            currentPath = folderParts.slice(0, i + 1).join('/');
            
            let folder = await Folder.findOne({ project: projectId, path: currentPath });
            if (!folder) {
              folder = await Folder.create({
                name: folderName,
                path: currentPath,
                project: projectId,
                owner: projectOwnerId,
                parent: parentFolder?._id || null,
                level: i,
                isRoot: i === 0
              });
              
              // Add to parent's subfolders if not root
              if (parentFolder) {
                await Folder.findByIdAndUpdate(parentFolder._id, {
                  $addToSet: { subfolders: folder._id }
                });
              }
              
              console.log(`✅ Created missing folder: ${currentPath}`);
              syncedCount++;
            }
            parentFolder = folder;
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to sync missing folder ${folderPath}: ${error.message}`);
        }
      }
      
      console.log(`✅ Synced ${syncedCount} missing folders`);
      return { synced: syncedCount };
    } catch (error) {
      console.error('Error syncing missing folders:', error);
      return { error: error.message };
    }
  }

  /**
   * Get file type based on extension
   */
  getFileType(fileName) {
    const ext = this.getFileExtension(fileName);
    const typeMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'text'
    };
    
    return typeMap[ext] || 'text';
  }

  /**
   * Get file extension
   */
  getFileExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Full cleanup of duplicates and orphans
   */
  async fullCleanup(projectId) {
    try {
      console.log(`🧹 Starting full cleanup for project: ${projectId}`);
      
      const fileCleanup = await this.cleanupOrphanedFiles(projectId);
      const folderCleanup = await this.cleanupOrphanedFolders(projectId);
      const duplicateFileRemoval = await this.removeDuplicateFiles(projectId);
      const duplicateFolderRemoval = await this.removeDuplicateFolders(projectId);
      
      return {
        files: fileCleanup,
        folders: folderCleanup,
        duplicateFiles: duplicateFileRemoval,
        duplicateFolders: duplicateFolderRemoval
      };
    } catch (error) {
      console.error('Error in full cleanup:', error);
      return { error: error.message };
    }
  }

  /**
   * Full sync of missing items
   */
  async fullSync(projectId, projectOwnerId) {
    try {
      console.log(`🔄 Starting full sync for project: ${projectId}`);
      
      const fileSync = await this.syncMissingFiles(projectId, projectOwnerId);
      const folderSync = await this.syncMissingFolders(projectId, projectOwnerId);
      
      return {
        files: fileSync,
        folders: folderSync
      };
    } catch (error) {
      console.error('Error in full sync:', error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const duplicatePreventionService = new DuplicatePreventionService();

export default duplicatePreventionService;
