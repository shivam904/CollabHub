import Folder from '../models/Folder.js';
import File from '../models/file.js';
import Project from '../models/Project.js';
import path from 'path';
import { getDockerWorkspaceManager } from '../services/dockerWorkspace.js';
import duplicatePreventionService from '../services/duplicatePrevention.js';
import mongoose from 'mongoose';


// Create a new folder
const createFolder = async (req, res) => {
  try {
    const { name, projectId, parentId, owner, description, tags } = req.body;

    // Validation
    if (!name || !projectId || !owner) {
      return res.status(400).json({
        success: false,
        message: 'Name, projectId, and owner are required'
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

    // Check if user has permission to create folders in this project
    if (!project.hasPermission(owner, 'write')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create folders in this project'
      });
    }

    // Check if parent folder exists (if provided)
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found'
        });
      }

      // Check if parent folder belongs to the same project
      if (parentFolder.project.toString() !== projectId) {
        return res.status(400).json({
          success: false,
          message: 'Parent folder does not belong to the specified project'
        });
      }
    }

    // Check if folder with same name already exists in the same location
    const existingFolder = await Folder.findOne({
      name,
      project: projectId,
      parent: parentId || null
    });

    if (existingFolder) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this location'
      });
    }

    // Create the folder
    let folderPath = typeof req.body.path === 'string' ? req.body.path.trim() : '';
    
    // For root level folders, set path to empty string
    if (!folderPath && !parentId) {
      folderPath = '';
    } else if (!folderPath && parentId) {
      // For subfolders, get parent folder's path
      const parentFolder = await Folder.findById(parentId);
      if (parentFolder) {
        folderPath = parentFolder.path ? `${parentFolder.path}/${parentFolder.name}` : parentFolder.name;
      }
    }
    
    const folderData = {
      name: name.trim(),
      project: projectId,
      owner,
      description: description?.trim(),
      tags: tags || [],
      path: folderPath
    };

    if (parentId) {
      folderData.parent = parentId;
    }

    const folder = await Folder.create(folderData);

    // Update parent folder's subfolders array
    if (parentId) {
      await Folder.findByIdAndUpdate(parentId, {
        $push: { subfolders: folder._id }
      });
    } else {
      // Add to project's root folders
      await Project.findByIdAndUpdate(projectId, {
        $push: { rootFolders: folder._id }
      }, {
        // Ensure rootFolders array exists
        upsert: false,
        setDefaultsOnInsert: true
      });
    }

    // Populate the created folder
    const populatedFolder = await Folder.findById(folder._id)
      .populate('parent', 'name path')
      .populate('project', 'name');

    // Create folder in Docker workspace
    try {
      const dockerManager = getDockerWorkspaceManager();
      const projectIdStr = folder.project.toString();
      
      // Create folder in Docker workspace using the actual folder path
      const folderPath = folder.path || folder.name;
      await dockerManager.createFolderInContainer(projectIdStr, folderPath);
      console.log(`📂 Folder created in Docker workspace: ${folderPath}`);
    } catch (dockerError) {
      console.warn(`⚠️ Failed to create Docker workspace folder: ${dockerError.message}`);
      // Don't fail the request if Docker sync fails
    }

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder: populatedFolder
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all folders for a project
const getFolders = async (req, res) => {
  try {
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

    const folders = await Folder.find(query)
      .populate('parent', 'name path')
      .populate('files', 'name type size')
      .populate('subfolders', 'name')
      .sort({ name: 1 });

    // Ensure all folders exist in Docker workspace
    try {
      const dockerManager = getDockerWorkspaceManager();
      
      for (const folder of folders) {
        try {
          const folderPath = folder.path || folder.name;
          if (folderPath && folderPath !== 'Root') {
            await dockerManager.createFolderInContainer(projectId, folderPath);
          }
        } catch (folderError) {
          console.warn(`⚠️ Failed to sync folder ${folder.name} to Docker workspace: ${folderError.message}`);
        }
      }
      
      console.log(`✅ Synced ${folders.length} folders to Docker workspace`);
      
    } catch (dockerError) {
      console.warn(`⚠️ Docker workspace folder sync failed: ${dockerError.message}`);
      // Don't fail the request if Docker sync fails
    }

    res.json({
      success: true,
      folders,
      count: folders.length
    });

  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get folder by ID
const getFolderById = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId } = req.query;

    const folder = await Folder.findById(folderId)
      .populate('parent', 'name path')
      .populate('project', 'name')
      .populate('files', 'name type size lastModifiedBy')
      .populate('subfolders', 'name');

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check if user has access to the folder
    if (userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'read')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this folder'
        });
      }
    }

    res.json({
      success: true,
      folder
    });

  } catch (error) {
    console.error('Error getting folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update folder
const updateFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, description, tags, userId } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check if user has permission to update the folder
    if (userId && folder.owner !== userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this folder'
        });
      }
    }

    // Check if new name conflicts with existing folder
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({
        name,
        project: folder.project,
        parent: folder.parent,
        _id: { $ne: folderId }
      });

      if (existingFolder) {
        return res.status(409).json({
          success: false,
          message: 'A folder with this name already exists in this location'
        });
      }
    }

    // Update folder
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (tags) updateData.tags = tags;

    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      updateData,
      { new: true }
    ).populate('parent', 'name path')
     .populate('project', 'name');

    res.json({
      success: true,
      message: 'Folder updated successfully',
      folder: updatedFolder
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete folder
const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId, force = false } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check if user has permission to delete the folder
    if (userId && folder.owner !== userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'delete')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this folder'
        });
      }
    }

    // Check if folder has contents (unless force delete)
    if (!force) {
      const hasFiles = folder.files.length > 0;
      const hasSubfolders = folder.subfolders.length > 0;

      if (hasFiles || hasSubfolders) {
        return res.status(400).json({
          success: false,
          message: 'Folder contains files or subfolders. Use force=true to delete anyway.',
          hasFiles,
          hasSubfolders
        });
      }
    }

    // Get folder info for Docker workspace cleanup
    const projectId = folder.project.toString();
    const folderPath = folder.path || folder.name;

    // Delete all files in the folder from both database and Docker workspace
    const filesToDelete = await File.find({ folder: folderId });
    for (const file of filesToDelete) {
      try {
        // Delete from Docker workspace
        const dockerManager = getDockerWorkspaceManager();
        let filePath = file.name;
        if (folderPath) {
          filePath = path.join(folderPath, file.name);
        }
        await dockerManager.deleteFileFromContainer(projectId, filePath);
        console.log(`🗑️ Deleted file from Docker workspace: ${filePath}`);
      } catch (dockerError) {
        console.warn(`⚠️ Failed to delete file ${file.name} from Docker workspace: ${dockerError.message}`);
      }
    }
    await File.deleteMany({ folder: folderId });

    // Recursively delete subfolders
    for (const subfolderId of folder.subfolders) {
      await deleteFolderRecursive(subfolderId);
    }

    // Remove from parent folder's subfolders array
    if (folder.parent) {
      await Folder.findByIdAndUpdate(folder.parent, {
        $pull: { subfolders: folderId }
      });
    } else {
      // Remove from project's root folders
      await Project.findByIdAndUpdate(folder.project, {
        $pull: { rootFolders: folderId }
      });
    }

    // Delete the folder from database
    await Folder.findByIdAndDelete(folderId);
    console.log(`🗑️ Folder deleted from database: ${folder.name}`);

    // Delete the folder from Docker workspace
    try {
      const dockerManager = getDockerWorkspaceManager();
      await dockerManager.deleteFolderFromContainer(projectId, folderPath);
      console.log(`✅ Folder deleted from Docker workspace: ${folderPath}`);
    } catch (dockerError) {
      console.warn(`⚠️ Failed to delete folder from Docker workspace: ${dockerError.message}`);
    }

    res.json({
      success: true,
      message: 'Folder deleted successfully from both database and workspace'
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to recursively delete folders
const deleteFolderRecursive = async (folderId) => {
  const folder = await Folder.findById(folderId);
  if (!folder) return;

  const projectId = folder.project.toString();
  const folderPath = folder.path || folder.name;

  // Delete all files from both database and Docker workspace
  const filesToDelete = await File.find({ folder: folderId });
  for (const file of filesToDelete) {
    try {
      // Delete from Docker workspace
      const dockerManager = getDockerWorkspaceManager();
      let filePath = file.name;
      if (folderPath) {
        filePath = path.join(folderPath, file.name);
      }
      await dockerManager.deleteFileFromContainer(projectId, filePath);
      console.log(`🗑️ Deleted file from Docker workspace: ${filePath}`);
    } catch (dockerError) {
      console.warn(`⚠️ Failed to delete file ${file.name} from Docker workspace: ${dockerError.message}`);
    }
  }
  await File.deleteMany({ folder: folderId });

  // Recursively delete subfolders
  for (const subfolderId of folder.subfolders) {
    await deleteFolderRecursive(subfolderId);
  }

  // Delete the folder from database
  await Folder.findByIdAndDelete(folderId);
  
  // Delete the folder from Docker workspace
  try {
    const dockerManager = getDockerWorkspaceManager();
    await dockerManager.deleteFolderFromContainer(projectId, folderPath);
    console.log(`✅ Folder deleted from Docker workspace: ${folderPath}`);
  } catch (dockerError) {
    console.warn(`⚠️ Failed to delete folder from Docker workspace: ${dockerError.message}`);
  }
  
  console.log(`🗑️ Recursive delete completed for folder: ${folder.name}`);
};

// Get folder tree structure
const getFolderTree = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId } = req.query;

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

    const tree = await folder.getFolderTree();

    res.json({
      success: true,
      tree
    });

  } catch (error) {
    console.error('Error getting folder tree:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get folder contents (files and subfolders)
const getFolderContents = async (req, res) => {
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

    // Get files
    const fileQuery = { folder: folderId };
    if (!includeArchived) {
      fileQuery.isArchived = false;
    }

    const files = await File.find(fileQuery)
      .select('name type size lastModifiedBy createdAt')
      .sort({ name: 1 });

    // Get subfolders
    const subfolderQuery = { _id: { $in: folder.subfolders } };
    if (!includeArchived) {
      subfolderQuery.isArchived = false;
    }

    const subfolders = await Folder.find(subfolderQuery)
      .select('name createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      contents: {
        files,
        subfolders,
        totalFiles: files.length,
        totalSubfolders: subfolders.length
      }
    });

  } catch (error) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Move folder to different parent
const moveFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newParentId, userId } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check permissions
    if (userId && folder.owner !== userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move this folder'
        });
      }
    }

    // Check if new parent exists and belongs to same project
    if (newParentId) {
      const newParent = await Folder.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: 'New parent folder not found'
        });
      }

      if (newParent.project.toString() !== folder.project.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move folder to different project'
        });
      }

      // Check for circular reference
      if (newParentId === folderId || await isDescendant(newParentId, folderId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move folder to its own descendant'
        });
      }
    }

    // Remove from old parent
    if (folder.parent) {
      await Folder.findByIdAndUpdate(folder.parent, {
        $pull: { subfolders: folderId }
      });
    } else {
      await Project.findByIdAndUpdate(folder.project, {
        $pull: { rootFolders: folderId }
      });
    }

    // Add to new parent
    if (newParentId) {
      await Folder.findByIdAndUpdate(newParentId, {
        $push: { subfolders: folderId }
      });
    } else {
      await Project.findByIdAndUpdate(folder.project, {
        $push: { rootFolders: folderId }
      });
    }

    // Update folder
    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      { parent: newParentId || null },
      { new: true }
    ).populate('parent', 'name path');

    res.json({
      success: true,
      message: 'Folder moved successfully',
      folder: updatedFolder
    });

  } catch (error) {
    console.error('Error moving folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to check if folder is descendant
const isDescendant = async (parentId, childId) => {
  const parent = await Folder.findById(parentId);
  if (!parent) return false;

  if (parent.subfolders.includes(childId)) return true;

  for (const subfolderId of parent.subfolders) {
    if (await isDescendant(subfolderId, childId)) return true;
  }

  return false;
};

// Copy folder
const copyFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newParentId, newName, userId } = req.body;

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
          message: 'You do not have permission to copy this folder'
        });
      }
    }

    // Generate new name if not provided
    const folderName = newName || `${folder.name} (Copy)`;

    // Create new folder
    const newFolder = await Folder.create({
      name: folderName,
      project: folder.project,
      owner: userId || folder.owner,
      parent: newParentId || folder.parent,
      description: folder.description,
      tags: folder.tags
    });

    // Copy files
    for (const fileId of folder.files) {
      const file = await File.findById(fileId);
      if (file) {
        await File.create({
          name: file.name,
          folder: newFolder._id,
          project: file.project,
          owner: userId || file.owner,
          content: file.content,
          type: file.type,
          description: file.description,
          tags: file.tags
        });
      }
    }

    // Recursively copy subfolders
    for (const subfolderId of folder.subfolders) {
      await copyFolderRecursive(subfolderId, newFolder._id, userId);
    }

    // Add to parent
    if (newParentId) {
      await Folder.findByIdAndUpdate(newParentId, {
        $push: { subfolders: newFolder._id }
      });
    } else {
      await Project.findByIdAndUpdate(folder.project, {
        $push: { rootFolders: newFolder._id }
      });
    }

    const populatedFolder = await Folder.findById(newFolder._id)
      .populate('parent', 'name path')
      .populate('project', 'name');

    res.status(201).json({
      success: true,
      message: 'Folder copied successfully',
      folder: populatedFolder
    });

  } catch (error) {
    console.error('Error copying folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to recursively copy folders
const copyFolderRecursive = async (folderId, newParentId, userId) => {
  const folder = await Folder.findById(folderId);
  if (!folder) return;

  const newFolder = await Folder.create({
    name: folder.name,
    project: folder.project,
    owner: userId || folder.owner,
    parent: newParentId,
    description: folder.description,
    tags: folder.tags
  });

  // Copy files
  for (const fileId of folder.files) {
    const file = await File.findById(fileId);
    if (file) {
      await File.create({
        name: file.name,
        folder: newFolder._id,
        project: file.project,
        owner: userId || file.owner,
        content: file.content,
        type: file.type,
        description: file.description,
        tags: file.tags
      });
    }
  }

  // Recursively copy subfolders
  for (const subfolderId of folder.subfolders) {
    await copyFolderRecursive(subfolderId, newFolder._id, userId);
  }

  return newFolder;
};

// Share folder with user
const shareFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId, targetUserId, permissions } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check if user has permission to share
    if (userId && folder.owner !== userId) {
      const project = await Project.findById(folder.project);
      if (!project.hasPermission(userId, 'write')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to share this folder'
        });
      }
    }

    // Update or add sharing
    const existingShare = folder.sharedWith.find(s => s.userId === targetUserId);
    if (existingShare) {
      existingShare.permissions = { ...existingShare.permissions, ...permissions };
    } else {
      folder.sharedWith.push({
        userId: targetUserId,
        permissions: permissions || { read: true, write: false, delete: false }
      });
    }

    await folder.save();

    res.json({
      success: true,
      message: 'Folder shared successfully',
      folder
    });

  } catch (error) {
    console.error('Error sharing folder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get shared folders for user
const getSharedFolders = async (req, res) => {
  try {
    const { userId } = req.params;

    const sharedFolders = await Folder.find({
      'sharedWith.userId': userId
    }).populate('project', 'name')
      .populate('owner', 'name')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      sharedFolders
    });

  } catch (error) {
    console.error('Error getting shared folders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search folders
const searchFolders = async (req, res) => {
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

    const folders = await Folder.find({
      project: projectId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).populate('parent', 'name path')
      .populate('project', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      folders,
      count: folders.length
    });

  } catch (error) {
    console.error('Error searching folders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Clean up duplicates and orphaned items
const cleanupProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has permission to clean up the project
    if (userId && !project.hasPermission(userId, 'write')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to clean up this project'
      });
    }

    console.log(`🧹 Starting cleanup for project: ${projectId}`);

    // Perform full cleanup
    const cleanupResult = await duplicatePreventionService.fullCleanup(projectId);

    if (cleanupResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: cleanupResult.error
      });
    }

    res.json({
      success: true,
      message: 'Project cleanup completed successfully',
      results: cleanupResult
    });

  } catch (error) {
    console.error('Error cleaning up project:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Sync missing items from container to database
const syncProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has permission to sync the project
    if (userId && !project.hasPermission(userId, 'write')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to sync this project'
      });
    }

    const projectOwnerId = userId || project.owner || project.creatorId;

    console.log(`🔄 Starting sync for project: ${projectId}`);

    // Perform full sync
    const syncResult = await duplicatePreventionService.fullSync(projectId, projectOwnerId);

    if (syncResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Sync failed',
        error: syncResult.error
      });
    }

    res.json({
      success: true,
      message: 'Project sync completed successfully',
      results: syncResult
    });

  } catch (error) {
    console.error('Error syncing project:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get project statistics
const getProjectStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;

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

    // Get file statistics
    const fileStats = await File.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          fileTypes: { $addToSet: '$extension' },
          avgFileSize: { $avg: '$size' },
          recentlyModified: {
            $sum: {
              $cond: [
                { $gte: ['$updatedAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get folder statistics
    const folderStats = await Folder.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalFolders: { $sum: 1 },
          rootFolders: {
            $sum: { $cond: ['$isRoot', 1, 0] }
          },
          avgDepth: { $avg: '$level' },
          maxDepth: { $max: '$level' }
        }
      }
    ]);

    // Get potential issues
    const potentialIssues = [];
    
    // Check for duplicate files
    const duplicateFiles = await File.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateFiles.length > 0) {
      potentialIssues.push({
        type: 'duplicate_files',
        count: duplicateFiles.length,
        description: `${duplicateFiles.length} files have duplicate entries`
      });
    }

    // Check for duplicate folders
    const duplicateFolders = await Folder.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateFolders.length > 0) {
      potentialIssues.push({
        type: 'duplicate_folders',
        count: duplicateFolders.length,
        description: `${duplicateFolders.length} folders have duplicate entries`
      });
    }

    res.json({
      success: true,
      stats: {
        files: fileStats[0] || {
          totalFiles: 0,
          totalSize: 0,
          fileTypes: [],
          avgFileSize: 0,
          recentlyModified: 0
        },
        folders: folderStats[0] || {
          totalFolders: 0,
          rootFolders: 0,
          avgDepth: 0,
          maxDepth: 0
        },
        potentialIssues
      }
    });

  } catch (error) {
    console.error('Error getting project stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  getFolderTree,
  getFolderContents,
  moveFolder,
  copyFolder,
  shareFolder,
  getSharedFolders,
  searchFolders,
  cleanupProject,
  syncProject,
  getProjectStats
}; 