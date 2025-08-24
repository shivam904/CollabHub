import Project from "../models/Project.js";
import Folder from "../models/Folder.js";
import File from "../models/file.js";
import User from "../models/User.js";
import mongoose from 'mongoose';
import { getDockerWorkspaceManager } from '../services/dockerWorkspace.js';
import ProjectInvite from '../models/ProjectInvite.js';
import crypto from 'crypto';

// Helper function to check database connection
const checkDatabaseConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. Please try again in a moment.');
  }
};

// Helper function to get user details by UID
const getUserDetails = async (uid) => {
  try {
    const user = await User.findOne({ uid });
    return user ? {
      uid: user.uid,
      displayName: user.displayName || 'Unknown User',
      email: user.email,
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      location: user.location,
      website: user.website
    } : null;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
};

// Helper function to populate user information in project members
const populateUserInfo = async (members) => {
  if (!members || !Array.isArray(members)) return [];
  
  const populatedMembers = [];
  
  for (const member of members) {
    const userDetails = await getUserDetails(member.userId);
    if (userDetails) {
      populatedMembers.push({
        ...member,
        user: userDetails
      });
    } else {
      // Fallback if user not found
      populatedMembers.push({
        ...member,
        user: {
          uid: member.userId,
          displayName: 'Unknown User',
          email: 'unknown@example.com',
          profilePhoto: null
        }
      });
    }
  }
  
  return populatedMembers;
};

// Helper function to populate creator information
const populateCreatorInfo = async (creatorId) => {
  const userDetails = await getUserDetails(creatorId);
  return userDetails || {
    uid: creatorId,
    displayName: 'Unknown User',
    email: 'unknown@example.com',
    profilePhoto: null
  };
};

// Validation helper
const validateProjectData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Project name is required');
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Project name cannot exceed 255 characters');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Project description cannot exceed 1000 characters');
  }
  
  if (!data.creatorId) {
    errors.push('Creator ID is required');
  }
  
  return errors;
};

// Create new project
const createProject = async (req, res) => {
  try {
    const { name, description, members, creatorId, category, tags, settings } = req.body;
    
    // Validate input data
    const validationErrors = validateProjectData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check if project with same name exists for this user
    const existingProject = await Project.findOne({
      name: name.trim(),
      creatorId,
      status: { $ne: 'deleted' }
    });
    
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: 'A project with this name already exists'
      });
    }
    
    // Prepare members array with creator as owner
    const projectMembers = [
      { userId: creatorId, role: 'owner', joinedAt: new Date() }
    ];
    
    // Add other members if provided
    if (members && Array.isArray(members)) {
      members.forEach(memberId => {
        if (memberId !== creatorId) {
          projectMembers.push({
            userId: memberId,
            role: 'viewer',
            joinedAt: new Date()
          });
        }
      });
    }
    
    // Create project
    const project = new Project({
      name: name.trim(),
      description: description?.trim() || '',
      members: projectMembers,
      creatorId,
      category: category || 'general',
      tags: tags || [],
      settings: {
        allowPublicAccess: settings?.allowPublicAccess || false,
        requireApproval: settings?.requireApproval || false,
        maxFileSize: settings?.maxFileSize || 10 * 1024 * 1024,
        allowedFileTypes: settings?.allowedFileTypes || [],
        autoSave: settings?.autoSave !== undefined ? settings.autoSave : true,
        versionControl: settings?.versionControl !== undefined ? settings.versionControl : true
      }
    });
    
    await project.save();
    
    // Populate basic info
    await project.populate('rootFolders');
    
    // Populate user information
    const creator = await populateCreatorInfo(project.creatorId);
    const populatedMembers = await populateUserInfo(project.members);
    
    const projectWithUserInfo = {
      ...project.toObject(),
      creator,
      members: populatedMembers
    };
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: projectWithUserInfo
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
};

// Get projects for a user
const getProjects = async (req, res) => {
  try {
    // Check database connection first
    checkDatabaseConnection();
    
    const { creatorId, userId, status, category, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    
    // Handle user access - prioritize creatorId if both are present
    if (creatorId) {
      query.creatorId = creatorId;
    } else if (userId) {
      query.$or = [
        { creatorId: userId },
        { 'members.userId': userId }
      ];
    }
    
    // Handle status
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $ne: 'deleted' };
    }
    
    // Handle category
    if (category) {
      query.category = category;
    }
    
    // Handle search - this should be combined with existing query, not overwrite it
    if (search) {
      const searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };
      
      // If we already have a $or query (from userId), combine them
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchQuery
          ]
        };
      } else {
        query = { ...query, ...searchQuery };
      }
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const projects = await Project.find(query)
      .populate({
        path: 'rootFolders',
        populate: {
          path: 'subfolders',
          model: 'Folder'
        }
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Populate user information for each project
    const projectsWithUserInfo = await Promise.all(
      projects.map(async (project) => {
        // Populate creator info
        const creator = await populateCreatorInfo(project.creatorId);
        
        // Populate members info
        const populatedMembers = await populateUserInfo(project.members);
        
        return {
          ...project,
          creator,
          members: populatedMembers
        };
      })
    );
    
    // Get total count for pagination
    const total = await Project.countDocuments(query);
    
    res.json({
      success: true,
      projects: projectsWithUserInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

// Get project by ID
const getProject = async (req, res) => {
  try {
    // Check database connection first
    checkDatabaseConnection();
    
    const { projectId } = req.params;
    const { userId } = req.query;
    
    console.log('Backend: getProject called with projectId:', projectId, 'userId:', userId);
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    // First try to find the project without population
    const basicProject = await Project.findById(projectId).lean();
    if (!basicProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    console.log('Backend: Basic project found, now populating...');
    
    // Now try with population
    const project = await Project.findById(projectId)
      .populate({
        path: 'rootFolders',
        populate: {
          path: 'subfolders',
          model: 'Folder'
        }
      })
      .lean();
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    console.log('Backend: Project populated successfully');
    
    // Check if user has access
    if (userId) {
      const hasAccess = project.creatorId === userId || 
                       project.members.some(m => m.userId === userId);
      
      if (!hasAccess && !project.settings.allowPublicAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    // Populate user information
    const creator = await populateCreatorInfo(project.creatorId);
    const populatedMembers = await populateUserInfo(project.members);
    
    const projectWithUserInfo = {
      ...project,
      creator,
      members: populatedMembers
    };
    
    res.json({
      success: true,
      project: projectWithUserInfo
    });
    
  } catch (error) {
    console.error('Error fetching project:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, category, tags, settings, status } = req.body;
    const { userId } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    if (userId) {
      const hasPermission = project.hasPermission(userId, 'write');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update project'
        });
      }
    }
    
    // Validate input data
    const validationErrors = validateProjectData({ name, description, creatorId: project.creatorId });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check for name conflicts
    if (name && name !== project.name) {
      const existingProject = await Project.findOne({
        name: name.trim(),
        creatorId: project.creatorId,
        _id: { $ne: projectId },
        status: { $ne: 'deleted' }
      });
      
      if (existingProject) {
        return res.status(409).json({
          success: false,
          message: 'A project with this name already exists'
        });
      }
    }
    
    // Update fields
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    
    if (settings) {
      updateData.settings = {
        ...project.settings,
        ...settings
      };
    }
    
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    ).populate('rootFolders');
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
    
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, force = false } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    if (userId) {
      const hasPermission = project.hasPermission(userId, 'delete');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete project'
        });
      }
    }
    
    if (force) {
      // Hard delete - remove all related data
      await Promise.all([
        Folder.deleteMany({ project: projectId }),
        File.deleteMany({ project: projectId }),
        Project.findByIdAndDelete(projectId)
      ]);
      
      res.json({
        success: true,
        message: 'Project permanently deleted'
      });
    } else {
      // Soft delete
      project.status = 'deleted';
      await project.save();
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    }
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
};

// Get project statistics
const getProjectStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check access
    if (userId) {
      const hasAccess = project.creatorId === userId || 
                       project.members.some(m => m.userId === userId);
      
      if (!hasAccess && !project.settings.allowPublicAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    // Update stats
    await project.updateStats();
    
    // Get additional statistics
    const fileStats = await File.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgFileSize: { $avg: '$size' },
          fileTypes: { $addToSet: '$extension' }
        }
      }
    ]);
    
    const folderStats = await Folder.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: null,
          totalFolders: { $sum: 1 },
          maxDepth: { $max: '$level' }
        }
      }
    ]);
    
    const stats = {
      ...project.stats.toObject(),
      fileTypes: fileStats[0]?.fileTypes || [],
      avgFileSize: fileStats[0]?.avgFileSize || 0,
      maxDepth: folderStats[0]?.maxDepth || 0,
      memberCount: project.members.length,
      age: project.age
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project statistics',
      error: error.message
    });
  }
};

// Add member to project
const addMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, targetUserId, role = 'viewer' } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    const hasPermission = project.hasPermission(userId, 'admin');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to add members'
      });
    }
    
    // Add member
    await project.addMember(targetUserId, role);
    
    // Populate user information
    const creator = await populateCreatorInfo(project.creatorId);
    const populatedMembers = await populateUserInfo(project.members);
    
    const projectWithUserInfo = {
      ...project.toObject(),
      creator,
      members: populatedMembers
    };
    
    res.json({
      success: true,
      message: 'Member added successfully',
      project: projectWithUserInfo
    });
    
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
};

// Remove member from project
const removeMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, targetUserId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    const hasPermission = project.hasPermission(userId, 'admin');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to remove members'
      });
    }
    
    // Cannot remove the owner
    if (targetUserId === project.creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project owner'
      });
    }
    
    // Remove member
    await project.removeMember(targetUserId);
    
    // Populate user information
    const creator = await populateCreatorInfo(project.creatorId);
    const populatedMembers = await populateUserInfo(project.members);
    
    const projectWithUserInfo = {
      ...project.toObject(),
      creator,
      members: populatedMembers
    };
    
    res.json({
      success: true,
      message: 'Member removed successfully',
      project: projectWithUserInfo
    });
    
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

// Search projects
const searchProjects = async (req, res) => {
  try {
    const { query, userId, category, status, page = 1, limit = 10 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const projects = await Project.search(query.trim(), userId);
    
    // Apply additional filters
    let filteredProjects = projects;
    
    if (category) {
      filteredProjects = filteredProjects.filter(p => p.category === category);
    }
    
    if (status) {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    } else {
      filteredProjects = filteredProjects.filter(p => p.status !== 'deleted');
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProjects = filteredProjects.slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      projects: paginatedProjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProjects.length,
        pages: Math.ceil(filteredProjects.length / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search projects',
      error: error.message
    });
  }
};

// Get public projects
const getPublicProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    let query = {
      'settings.allowPublicAccess': true,
      status: 'active'
    };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const projects = await Project.find(query)
      .populate('rootFolders')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Project.countDocuments(query);
    
    res.json({
      success: true,
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching public projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public projects',
      error: error.message
    });
  }
};

// Generate invite link
const createProjectInvite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role = 'viewer' } = req.body;
    const userId = req.user?.uid || req.body.userId; // support both auth middleware and manual

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    // Only allow project owner/admin to create invites
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const isAllowed = project.creatorId === userId || (project.members || []).some(m => m.userId === userId && ['owner','admin'].includes(m.role));
    if (!isAllowed) return res.status(403).json({ success: false, message: 'Not authorized' });

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const invite = await ProjectInvite.create({
      token,
      project: projectId,
      role,
      createdBy: userId
    });
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;
    res.json({ success: true, inviteLink, token, expiresAt: invite.expiresAt });
  } catch (err) {
    console.error('Error creating invite:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Accept invite link
 const acceptProjectInvite = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.uid || req.body.userId;
    if (!token || !userId) return res.status(400).json({ success: false, message: 'Missing token or user' });
    const invite = await ProjectInvite.findOne({ token });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite' });
    }
    // Add user to project if not already a member
    const project = await Project.findById(invite.project);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const alreadyMember = project.members.some(m => m.userId === userId);
    if (!alreadyMember) {
      project.members.push({ userId, role: invite.role });
      await project.save();
    }
    invite.used = true;
    invite.usedBy = userId;
    await invite.save();
    res.json({ success: true, message: 'Joined project', projectId: project._id });
  } catch (err) {
    console.error('Error accepting invite:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  addMember,
  removeMember,
  searchProjects,
  getPublicProjects,
  createProjectInvite,
  acceptProjectInvite
};