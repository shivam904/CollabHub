import File from '../models/file.js';
import Folder from '../models/Folder.js';
import Project from '../models/Project.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { getDockerWorkspaceManager } from '../services/dockerWorkspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check database connection
const checkDatabaseConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. Please try again in a moment.');
  }
};

// Create a new file
const createFile = async (req, res) => {
  try {
    const { name, folderId, projectId, owner, content, type, description, tags } = req.body;
    // Debug logging
    console.log('[DEBUG createFile] Creating file with owner:', owner);

    // Validation
    if (!name || !folderId || !projectId || !owner) {
      return res.status(400).json({
        success: false,
        message: 'Name, folderId, projectId, and owner are required'
      });
    }

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has permission to create files in this project
    if (!project.hasPermission(owner, 'write')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create files in this project'
      });
    }

    // Check if folder exists and belongs to the project
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    if (folder.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Folder does not belong to the specified project'
      });
    }

    // Check if file with same name already exists in the folder
    const existingFile = await File.findOne({
      name,
      folder: folderId
    });

    if (existingFile) {
      return res.status(409).json({
        success: false,
        message: 'A file with this name already exists in this folder'
      });
    }

    // Calculate file size
    const fileSize = content ? Buffer.byteLength(content, 'utf8') : 0;

    // Get folder path for the file
    let folderPath = '';
    if (folder.path && folder.name) {
      folderPath = folder.path + '/' + folder.name;
    } else if (folder.name) {
      // If folder has no path but has a name, use just the name
      folderPath = folder.name;
    }
    // For root folder, use empty path so files are at workspace root
    
    // Create full file path (folder path + filename) for unique index
    const fullFilePath = folderPath ? `${folderPath}/${name.trim()}` : name.trim();
    
    // Create the file
    const fileData = {
      name: name.trim(),
      folder: folderId,
      project: projectId,
      owner,
      content: content || '',
      type: type || 'text',
      size: fileSize,
      path: fullFilePath, // Use full file path for unique index
      description: description?.trim(),
      tags: tags || []
    };

    let file;
    try {
      file = await File.create(fileData);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - file with this path already exists
        return res.status(409).json({
          success: false,
          message: `A file with the path "${fullFilePath}" already exists in this project`,
          error: 'DUPLICATE_FILE_PATH'
        });
      }
      throw error; // Re-throw other errors
    }

    // Add file to folder's files array
    await Folder.findByIdAndUpdate(folderId, {
      $push: { files: file._id }
    });

    // Populate the created file
    const populatedFile = await File.findById(file._id)
      .populate('folder', 'name path')
      .populate('project', 'name');

    // Create file in Docker workspace
    try {
      const dockerManager = getDockerWorkspaceManager();
      const projectIdStr = projectId.toString();
      
      // Construct file path relative to workspace root
      let filePath = populatedFile.name;
      if (populatedFile.folder && populatedFile.folder.path) {
        filePath = path.join(populatedFile.folder.path, populatedFile.name);
      }

      // Create empty file in Docker workspace
      await dockerManager.writeFileToContainer(projectIdStr, filePath, content || '');
      console.log(`📄 File created in Docker workspace: ${filePath}`);
    } catch (dockerError) {
      console.warn(`⚠️ Failed to create file in Docker workspace: ${dockerError.message}`);
      // Don't fail the request if Docker sync fails
    }

    res.status(201).json({
      success: true,
      message: 'File created successfully',
      file: populatedFile
    });

  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all files for a project
const getFilesByProject = async (req, res) => {
  try {
    // Check database connection first
    checkDatabaseConnection();
    
    const { projectId } = req.params;
    const { userId, includeArchived = false } = req.query;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to the project
    if (userId && !project.hasPermission(userId, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this project'
      });
    }

    // Build query
    const query = { project: projectId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const files = await File.find(query)
      .populate('folder', 'name path')
      .populate('project', 'name')
      .sort({ name: 1 });

    // Validate files exist in Docker workspace and sync if needed
    const validatedFiles = [];
    
    try {
      const dockerManager = getDockerWorkspaceManager();
      
      for (const file of files) {
        try {
          // Construct file path
          let filePath = file.name;
          if (file.folder && file.folder.path) {
            filePath = path.join(file.folder.path, file.name);
          }

          // Check if file exists in Docker workspace
          const dockerContent = await dockerManager.readFileFromContainer(projectId, filePath);
          
          if (dockerContent !== null && dockerContent !== '') {
            // File exists in Docker workspace with content - use Docker content
            console.log(`✅ File exists in Docker workspace: ${filePath}`);
            validatedFiles.push(file);
          } else if (file.content && file.content.trim() !== '') {
            // File exists in database with content but not in Docker - sync it
            console.log(`🔄 Syncing file to Docker workspace: ${filePath}`);
            await dockerManager.writeFileToContainer(projectId, filePath, file.content);
            validatedFiles.push(file);
          } else {
            // File exists but has no content - skip sync to avoid overwriting
            console.log(`⚠️ File has no content, skipping sync: ${filePath}`);
            validatedFiles.push(file);
          }
        } catch (fileError) {
          // If individual file check fails, include it but log warning
          console.warn(`⚠️ File validation warning for ${file.name}: ${fileError.message}`);
          validatedFiles.push(file);
        }
      }
      
      console.log(`✅ Validated ${validatedFiles.length} files in project ${projectId}`);
      
    } catch (dockerError) {
      console.warn(`⚠️ Docker workspace validation failed: ${dockerError.message}`);
      // If Docker validation fails, return all database files
      validatedFiles.push(...files);
    }

    res.json({
      success: true,
      files: validatedFiles,
      count: validatedFiles.length
    });

  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get files by folder
const getFilesByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId, includeArchived = false } = req.query;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check permissions
    if (userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this folder'
        });
      }
    }

    // Build query
    const query = { folder: folderId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const files = await File.find(query)
      .populate('folder', 'name path')
      .sort({ name: 1 });

    res.json({
      success: true,
      files,
      count: files.length
    });

  } catch (error) {
    console.error('Error getting files by folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file by ID
const getFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    const file = await File.findById(fileId)
      .populate('folder', 'name path')
      .populate('project', 'name');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has access to the file
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this file'
        });
      }
    }

    res.json({
      success: true,
      file
    });

  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update file metadata
const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name, description, tags, userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has permission to update the file
    if (userId && file.owner !== userId) {
      // Check file-level permissions first
      const filePerm = file.permissions.find(p => p.userId === userId);
      if (filePerm && (filePerm.role === 'editor' || filePerm.role === 'admin')) {
        // Allow
      } else {
        // Fallback to project-level permission
        const project = await Project.findById(file.project);
        if (!project.hasPermission(userId, 'write')) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to update this file'
          });
        }
      }
    }

    // Check if new name conflicts with existing file
    if (name && name !== file.name) {
      const existingFile = await File.findOne({
        name,
        folder: file.folder,
        _id: { $ne: fileId }
      });

      if (existingFile) {
        return res.status(409).json({
          success: false,
          message: 'A file with this name already exists in this folder'
        });
      }
    }

    // Update file
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (tags) updateData.tags = tags;

    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      updateData,
      { new: true }
    ).populate('folder', 'name path')
     .populate('project', 'name');

    res.json({
      success: true,
      message: 'File updated successfully',
      file: updatedFile
    });

  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has permission to delete the file
    if (userId && file.owner !== userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'delete')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this file'
        });
      }
    }

    // Get file info before deletion for Docker workspace cleanup
    const projectId = file.project.toString();
    let filePath = file.name;
    
    // Construct proper file path for Docker container deletion
    if (file.folder) {
      const folder = await Folder.findById(file.folder);
      if (folder && folder.path && folder.path !== 'Root' && folder.path !== '') {
        // Use folder path directly if it's not the root folder
        filePath = `${folder.path}/${file.name}`;
      } else if (folder && folder.name && folder.name !== 'Root') {
        // Fallback to folder name if path is empty/root
        filePath = `${folder.name}/${file.name}`;
      }
      // If it's root folder or no folder path, just use filename
    }
    
    console.log(`🗑️ Deleting file from container: /workspace/${filePath}`);

    // Remove file from folder's files array
    await Folder.findByIdAndUpdate(file.folder, {
      $pull: { files: fileId }
    });

    // Delete the file from database
    await File.findByIdAndDelete(fileId);
    console.log(`🗑️ File deleted from database: ${file.name}`);

    // Delete file from Docker workspace
    try {
      const dockerManager = getDockerWorkspaceManager();
      const deleteSuccess = await dockerManager.deleteFileFromContainer(projectId, filePath);
      
      if (deleteSuccess) {
        console.log(`✅ File deleted from Docker workspace: ${filePath}`);
      } else {
        console.warn(`⚠️ File not found in Docker workspace: ${filePath}`);
      }
    } catch (dockerError) {
      console.error(`❌ Failed to delete file from Docker workspace: ${dockerError.message}`);
      // Don't fail the request if Docker deletion fails
    }

    res.json({
      success: true,
      message: 'File deleted successfully from both database and workspace'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file content
const getFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    // Check permissions
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this file'
        });
      }
      // Add role to response
      const role = getFileRole(file, userId, project);
      // Debug logging
      console.log('[DEBUG getFileContent] fileId:', fileId, 'file.owner:', file.owner, 'userId:', userId, 'project.creatorId:', project.creatorId, 'computed role:', role);
      
      // Debug: Check content integrity when retrieving
      const contentLength = file.content?.length || 0;
      const specialCharsInContent = file.content?.match(/[{}()\[\]:;"'<>,\.\/\\`~!@#$%^&*|+=_-]/g);
      console.log(`📖 [DEBUG] Retrieved content length: ${contentLength}`);
      if (specialCharsInContent) {
        console.log(`🔤 [DEBUG] Special characters in retrieved content: ${specialCharsInContent.length}`);
      } else {
        console.log(`⚠️ [DEBUG] No special characters found in retrieved content - possible data loss!`);
      }
      
      const fileObj = file.toObject ? file.toObject() : { ...file };
      fileObj.role = role;
      return res.json({
        success: true,
        content: file.content,
        file: fileObj
      });
    }
    res.json({
      success: true,
      content: file.content,
      file: {
        _id: file._id,
        name: file.name,
        type: file.type,
        size: file.size,
        version: file.version,
        lastModifiedBy: file.lastModifiedBy,
        role: 'viewer'
      }
    });
  } catch (error) {
    console.error('Error getting file content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update file content - New Docker-based implementation
const updateFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, userId } = req.body;
    
    console.log(`🚀 [Docker Save] Starting file save process`);
    console.log(`📁 File ID: ${fileId}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`📝 Content length: ${content?.length || 0} characters`);
    console.log(`🔍 Content preview: ${content?.substring(0, 50)}...`);
    
    // Debug: Check for special characters in content
    const specialChars = content?.match(/[{}()\[\]:;"'<>,\.\/\\`~!@#$%^&*|+=_-]/g);
    if (specialChars) {
      console.log(`🔤 Special characters detected: ${specialChars.slice(0, 10).join('')}${specialChars.length > 10 ? '...' : ''}`);
      console.log(`🔢 Total special characters: ${specialChars.length}`);
    }

    // Validate input
    if (!fileId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'File ID and User ID are required'
      });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be null or undefined'
      });
    }

    // Find file in database with project populated
    const file = await File.findById(fileId).populate('project');
    if (!file) {
      console.error(`❌ File not found in database: ${fileId}`);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    console.log(`✅ File found: ${file.name} in project ${file.project._id}`);

    // Check user permissions - Allow file owners or users with project write permissions
    const isFileOwner = file.owner === userId;
    const hasProjectWriteAccess = file.project.hasPermission(userId, 'write');
    
    if (!isFileOwner && !hasProjectWriteAccess) {
      // Check file-level permissions as fallback
      const filePerm = file.permissions && file.permissions.find(p => p.userId === userId);
      const hasFileWriteAccess = filePerm && (filePerm.role === 'editor' || filePerm.role === 'admin');
      
      if (!hasFileWriteAccess) {
        console.log(`❌ Permission denied for user ${userId} on file ${file.name}`);
        console.log(`- File owner: ${file.owner}`);
        console.log(`- Project write access: ${hasProjectWriteAccess}`);
        console.log(`- File write access: ${hasFileWriteAccess}`);
        
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this file'
        });
      }
    }
    
    console.log(`✅ Permission granted for user ${userId} on file ${file.name}`);
    console.log(`- Is file owner: ${isFileOwner}`);
    console.log(`- Has project write access: ${hasProjectWriteAccess}`);

    // Check if file is locked by another user
    if (file.isLocked && file.lockedBy !== userId) {
      return res.status(423).json({
        success: false,
        message: `File is locked by another user`,
        lockedBy: file.lockedBy,
        lockedAt: file.lockedAt
      });
    }

    // Check if content has actually changed
    if (content === file.content) {
      console.log(`📋 No changes detected for file: ${file.name}`);
      return res.json({
        success: true,
        message: 'No changes detected',
        file: {
          _id: file._id,
          name: file.name,
          content: file.content,
          size: file.size,
          version: file.version
        }
      });
    }

    // Create version backup before updating
    if (file.content && file.content.length > 0) {
      try {
        await file.createVersion(file.content, file.lastModifiedBy || file.owner, 'Auto-save before update');
        console.log(`📚 Version backup created for file: ${file.name}`);
      } catch (versionError) {
        console.warn(`⚠️ Failed to create version backup: ${versionError.message}`);
      }
    }

    // Update file in database
    file.content = content;
    file.size = Buffer.byteLength(content, 'utf8');
    file.lastModifiedBy = userId;
    file.lastModified = new Date();

    await file.save();
    console.log(`💾 File saved to database: ${file.name}`);
    
    // Debug: Verify content in database immediately after save
    const savedContent = file.content;
    const contentMatches = savedContent === content;
    console.log(`🔍 Database content verification: ${contentMatches ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!contentMatches) {
      console.log(`📊 Original length: ${content.length}, Saved length: ${savedContent.length}`);
      console.log(`📝 Original preview: ${content.substring(0, 50)}...`);
      console.log(`💾 Saved preview: ${savedContent.substring(0, 50)}...`);
    }

    // Save to Docker workspace using collabhub-workspace:latest image
    try {
      const dockerManager = getDockerWorkspaceManager();
      const projectId = file.project._id.toString();
      
      // Construct file path relative to workspace root
      let filePath = file.name;
      if (file.folder && file.folder.path) {
        filePath = path.join(file.folder.path, file.name);
      }

      console.log(`🐳 Saving to Docker workspace container: ${filePath}`);
      
      const dockerSuccess = await dockerManager.writeFileToContainer(projectId, filePath, content);
      
      if (dockerSuccess) {
        console.log(`✅ File successfully saved to Docker workspace container`);
        console.log(`📦 Container image: collabhub-workspace:latest`);
      } else {
        console.log(`⚠️ Docker workspace save failed - file saved to database only`);
      }

    } catch (dockerError) {
      console.error(`❌ Docker workspace error: ${dockerError.message}`);
      console.log(`📝 Continuing with database-only save`);
      // Don't fail the entire request if Docker sync fails
    }

    // Send success response
    res.json({
      success: true,
      message: 'File saved successfully',
      file: {
        _id: file._id,
        name: file.name,
        content: file.content,
        size: file.size,
        version: file.version,
        lastModifiedBy: file.lastModifiedBy,
        lastModified: file.lastModified
      }
    });

    console.log(`🎉 File save process completed successfully: ${file.name}`);

  } catch (error) {
    console.error(`💥 Error in updateFileContent:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to save file',
      error: error.message
    });
  }
};

// Create file version
const createFileVersion = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, userId, comment } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId && file.owner !== userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create versions of this file'
        });
      }
    }

    await file.createVersion(content, userId || file.owner, comment || 'Manual version');

    res.json({
      success: true,
      message: 'File version created successfully',
      version: file.version
    });

  } catch (error) {
    console.error('Error creating file version:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file versions
const getFileVersions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this file'
        });
      }
    }

    res.json({
      success: true,
      versions: file.versions,
      currentVersion: file.version
    });

  } catch (error) {
    console.error('Error getting file versions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Lock file
const lockFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId && file.owner !== userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to lock this file'
        });
      }
    }

    await file.lock(userId || file.owner);

    res.json({
      success: true,
      message: 'File locked successfully',
      lockedBy: file.lockedBy
    });

  } catch (error) {
    console.error('Error locking file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Unlock file
const unlockFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    await file.unlock(userId || file.owner);

    res.json({
      success: true,
      message: 'File unlocked successfully'
    });

  } catch (error) {
    console.error('Error unlocking file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Search files
const searchFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { query, userId } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Check project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (userId && !project.hasPermission(userId, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to search in this project'
      });
    }

    const files = await File.search(projectId, query);

    res.json({
      success: true,
      files,
      count: files.length
    });

  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload file (placeholder for future implementation)
const uploadFile = async (req, res) => {
  try {
    // This would handle file uploads using multer or similar
    res.status(501).json({
      success: false,
      message: 'File upload functionality not yet implemented'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download file (placeholder for future implementation)
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to download this file'
        });
      }
    }

    // For now, return file content as JSON
    // In the future, this would handle actual file downloads
    res.json({
      success: true,
      file: {
        name: file.name,
        content: file.content,
        type: file.type,
        size: file.size
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Share file
const shareFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, targetUserId, permissions } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has permission to share
    if (userId && file.owner !== userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to share this file'
        });
      }
    }

    // Update or add sharing
    const existingShare = file.sharedWith.find(s => s.userId === targetUserId);
    if (existingShare) {
      existingShare.permissions = { ...existingShare.permissions, ...permissions };
    } else {
      file.sharedWith.push({
        userId: targetUserId,
        permissions: permissions || { read: true, write: false, delete: false }
      });
    }

    await file.save();

    res.json({
      success: true,
      message: 'File shared successfully',
      file
    });

  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get shared files
const getSharedFiles = async (req, res) => {
  try {
    const { userId } = req.params;

    const sharedFiles = await File.find({
      'sharedWith.userId': userId
    }).populate('project', 'name')
      .populate('folder', 'name')
      .populate('owner', 'name')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      sharedFiles
    });

  } catch (error) {
    console.error('Error getting shared files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Duplicate file
const duplicateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName, userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to duplicate this file'
        });
      }
    }

    // Generate new name if not provided
    const fileName = newName || `${file.name} (Copy)`;

    // Check if name already exists
    const existingFile = await File.findOne({
      name: fileName,
      folder: file.folder
    });

    if (existingFile) {
      return res.status(409).json({
        success: false,
        message: 'A file with this name already exists in this folder'
      });
    }

    // Create duplicate
    const duplicate = await File.create({
      name: fileName,
      folder: file.folder,
      project: file.project,
      owner: userId || file.owner,
      content: file.content,
      type: file.type,
      description: file.description,
      tags: file.tags
    });

    // Add to folder's files array
    await Folder.findByIdAndUpdate(file.folder, {
      $push: { files: duplicate._id }
    });

    const populatedFile = await File.findById(duplicate._id)
      .populate('folder', 'name path')
      .populate('project', 'name');

    res.status(201).json({
      success: true,
      message: 'File duplicated successfully',
      file: populatedFile
    });

  } catch (error) {
    console.error('Error duplicating file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Move file
const moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newFolderId, userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has permission to move the file
    if (userId && file.owner !== userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move this file'
        });
      }
    }

    // Check if new folder exists and belongs to same project
    if (newFolderId) {
      const newFolder = await Folder.findById(newFolderId);
      if (!newFolder) {
        return res.status(404).json({
          success: false,
          message: 'Destination folder not found'
        });
      }

      if (newFolder.project.toString() !== file.project.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move file to different project'
        });
      }

      // Check if file with same name exists in destination
      const existingFile = await File.findOne({
        name: file.name,
        folder: newFolderId
      });

      if (existingFile) {
        return res.status(409).json({
          success: false,
          message: 'A file with this name already exists in the destination folder'
        });
      }
    }

    // Remove from old folder
    await Folder.findByIdAndUpdate(file.folder, {
      $pull: { files: fileId }
    });

    // Add to new folder
    if (newFolderId) {
      await Folder.findByIdAndUpdate(newFolderId, {
        $push: { files: fileId }
      });
    }

    // Update file
    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      { folder: newFolderId },
      { new: true }
    ).populate('folder', 'name path')
     .populate('project', 'name');

    res.json({
      success: true,
      message: 'File moved successfully',
      file: updatedFile
    });

  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Copy file
const copyFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newFolderId, newName, userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (userId) {
      const project = await Project.findById(file.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to copy this file'
        });
      }
    }

    // Check if destination folder exists
    if (newFolderId) {
      const newFolder = await Folder.findById(newFolderId);
      if (!newFolder) {
        return res.status(404).json({
          success: false,
          message: 'Destination folder not found'
        });
      }

      if (newFolder.project.toString() !== file.project.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot copy file to different project'
        });
      }
    }

    // Generate new name if not provided
    const fileName = newName || `${file.name} (Copy)`;

    // Check if name already exists in destination
    const existingFile = await File.findOne({
      name: fileName,
      folder: newFolderId || file.folder
    });

    if (existingFile) {
      return res.status(409).json({
        success: false,
        message: 'A file with this name already exists in the destination folder'
      });
    }

    // Create copy
    const copy = await File.create({
      name: fileName,
      folder: newFolderId || file.folder,
      project: file.project,
      owner: userId || file.owner,
      content: file.content,
      type: file.type,
      description: file.description,
      tags: file.tags
    });

    // Add to folder's files array
    await Folder.findByIdAndUpdate(copy.folder, {
      $push: { files: copy._id }
    });

    const populatedFile = await File.findById(copy._id)
      .populate('folder', 'name path')
      .populate('project', 'name');

    res.status(201).json({
      success: true,
      message: 'File copied successfully',
      file: populatedFile
    });

  } catch (error) {
    console.error('Error copying file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Assign a file to a member with a role (admin/editor) - owner only
const assignFileRole = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, role, actingUserId } = req.body; // actingUserId is the owner
    if (!fileId || !userId || !role || !actingUserId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!['admin', 'editor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const file = await File.findById(fileId).populate('project');
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    // Only project owner can assign
    if (file.project.creatorId !== actingUserId) {
      return res.status(403).json({ success: false, message: 'Only the project owner can assign file roles' });
    }
    // Update or add permission
    const idx = file.permissions.findIndex(p => p.userId === userId);
    if (idx >= 0) {
      file.permissions[idx].role = role;
    } else {
      file.permissions.push({ userId, role });
    }
    await file.save();
    res.json({ success: true, message: 'File role assigned', file });
  } catch (err) {
    console.error('Error assigning file role:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Helper to get file role for a user
const getFileRole = (file, userId, project) => {
  // Debug logging
  const fileOwner = file && file.owner && file.owner.toString();
  const projectCreator = project && project.creatorId && project.creatorId.toString();
  const userIdStr = userId && userId.toString();
  const result = (() => {
    if (!file || !userId) return 'viewer';
    if (fileOwner === userIdStr) return 'owner';
    if (project && projectCreator === userIdStr) return 'owner';
    const perm = file.permissions.find(p => (p.userId && p.userId.toString()) === userIdStr);
    if (perm) return perm.role;
    return 'viewer';
  })();
  console.log('[DEBUG getFileRole] file.owner:', fileOwner, 'userId:', userIdStr, 'project.creatorId:', projectCreator, 'result:', result);
  return result;
};

export {
  createFile,
  getFilesByProject,
  getFileById,
  updateFile,
  deleteFile,
  getFileContent,
  updateFileContent,
  createFileVersion,
  getFileVersions,
  lockFile,
  unlockFile,
  searchFiles,
  getFilesByFolder,
  uploadFile,
  downloadFile,
  shareFile,
  getSharedFiles,
  duplicateFile,
  moveFile,
  copyFile,
  assignFileRole,
  getFileRole
}; 