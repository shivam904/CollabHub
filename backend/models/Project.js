import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
  },
  description: { 
    type: String, 
    maxlength: 1000 
  },
  members: [{
    userId: String,
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'editor', 'viewer'], 
      default: 'viewer' 
    },
    joinedAt: { type: Date, default: Date.now }
  }],
  creatorId: { 
    type: String, 
    required: true 
  },
  // File and folder references
  rootFolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }],
  // Project settings
  settings: {
    allowPublicAccess: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB default
    allowedFileTypes: [String],
    autoSave: { type: Boolean, default: true },
    versionControl: { type: Boolean, default: true }
  },
  // Project metadata
  tags: [String],
  category: { 
    type: String, 
    default: 'general' 
  },
  status: { 
    type: String, 
    enum: ['active', 'archived', 'deleted'], 
    default: 'active' 
  },
  // Statistics
  stats: {
    totalFiles: { type: Number, default: 0 },
    totalFolders: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Strategic indexes for ultra-fast queries
ProjectSchema.index({ creatorId: 1 });
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ tags: 1 });

// Advanced compound indexes for complex queries
ProjectSchema.index({ status: 1, createdAt: -1 }); // Active projects by date
ProjectSchema.index({ creatorId: 1, status: 1 }); // User's active projects
ProjectSchema.index({ 'members.userId': 1, status: 1 }); // Member's active projects
ProjectSchema.index({ category: 1, status: 1, createdAt: -1 }); // Category + status + date
ProjectSchema.index({ 'stats.lastActivity': -1 }); // Most recently active projects
ProjectSchema.index({ 'stats.totalFiles': -1 }); // Projects with most files
ProjectSchema.index({ memberCount: -1 }); // Projects with most members (virtual field)

// Text search index for project search
ProjectSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 3
  }
});

// Sparse indexes for optional fields
ProjectSchema.index({ 'settings.allowPublicAccess': 1 }, { sparse: true });
ProjectSchema.index({ updatedAt: -1 }); // Recently updated projects

// Virtual for getting member count
ProjectSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for getting project age
ProjectSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update stats
ProjectSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.members) {
    this.members = [];
  }
  if (!this.rootFolders) {
    this.rootFolders = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  
  if (this.isModified('rootFolders')) {
    await this.updateStats();
  }
  next();
});

// Instance method to add member
ProjectSchema.methods.addMember = function(userId, role = 'viewer') {
  if (!this.members) {
    this.members = [];
  }
  
  const existingMember = this.members.find(m => m.userId === userId);
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({ userId, role });
  }
  return this.save();
};

// Instance method to remove member
ProjectSchema.methods.removeMember = function(userId) {
  if (!this.members) {
    this.members = [];
  }
  this.members = this.members.filter(m => m.userId !== userId);
  return this.save();
};

// Instance method to check if user has permission
ProjectSchema.methods.hasPermission = function(userId, permission) {
  // Always grant all permissions to the creator
  if (this.creatorId && this.creatorId.toString() === userId.toString()) {
    return true;
  }
  if (!this.members) return false;
  const member = this.members.find(m => m.userId === userId);
  if (!member) return false;
  const rolePermissions = {
    owner: ['read', 'write', 'delete', 'admin'],
    admin: ['read', 'write', 'delete', 'admin'],
    editor: ['read', 'write'],
    viewer: ['read']
  };
  return rolePermissions[member.role]?.includes(permission) || false;
};

// Instance method to update project statistics
ProjectSchema.methods.updateStats = async function() {
  const Folder = mongoose.model('Folder');
  const File = mongoose.model('File');
  
  // Count folders
  const folderCount = await Folder.countDocuments({ project: this._id });
  
  // Count files and calculate total size
  const files = await File.find({ project: this._id });
  const fileCount = files.length;
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  
  // Update stats
  this.stats = {
    totalFiles: fileCount,
    totalFolders: folderCount,
    totalSize: totalSize,
    lastActivity: new Date()
  };
  
  return this.save();
};

// Static method to find projects by user
ProjectSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { creatorId: userId },
      { 'members.userId': userId }
    ]
  }).populate('rootFolders');
};

// Static method to find public projects
ProjectSchema.statics.findPublic = function() {
  return this.find({ 
    'settings.allowPublicAccess': true,
    status: 'active'
  }).populate('rootFolders');
};

// Optimized static methods using indexes and lean queries
ProjectSchema.statics.search = function(query, userId = null, limit = 20) {
  const pipeline = [];
  
  // Use text search if available
  if (query) {
    pipeline.push({
      $match: {
        $text: { $search: query },
        ...(userId && {
          $or: [
            { creatorId: userId },
            { 'members.userId': userId }
          ]
        })
      }
    });
    
    pipeline.push({
      $addFields: {
        score: { $meta: 'textScore' }
      }
    });
    
    pipeline.push({ $sort: { score: { $meta: 'textScore' } } });
  } else {
    pipeline.push({
      $match: userId ? {
        $or: [
          { creatorId: userId },
          { 'members.userId': userId }
        ]
      } : {}
    });
    
    pipeline.push({ $sort: { 'stats.lastActivity': -1 } });
  }
  
  pipeline.push({ $limit: limit });
  
  return this.aggregate(pipeline);
};

// Fast user projects query with caching hints
ProjectSchema.statics.findByUserOptimized = function(userId, options = {}) {
  const {
    status = 'active',
    limit = 50,
    sortBy = 'stats.lastActivity',
    sortOrder = -1,
    includeStats = true
  } = options;
  
  const query = {
    $or: [
      { creatorId: userId },
      { 'members.userId': userId }
    ],
    status: status
  };
  
  let projection = {
    name: 1,
    description: 1,
    creatorId: 1,
    members: 1,
    status: 1,
    category: 1,
    tags: 1,
    createdAt: 1,
    updatedAt: 1
  };
  
  if (includeStats) {
    projection.stats = 1;
  }
  
  return this.find(query, projection)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .lean();
};

// Get trending projects (most active recently)
ProjectSchema.statics.getTrending = function(limit = 10, days = 7) {
  const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    status: 'active',
    'stats.lastActivity': { $gte: cutoffDate }
  })
    .sort({ 
      'stats.lastActivity': -1,
      'stats.totalFiles': -1,
      memberCount: -1
    })
    .limit(limit)
    .select('name description stats memberCount createdAt')
    .lean();
};

// Get project statistics efficiently
ProjectSchema.statics.getProjectStats = function(projectId) {
  return this.findById(projectId)
    .select('stats name memberCount')
    .lean();
};

// Pre-save middleware optimizations
ProjectSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.members) {
    this.members = [];
  }
  if (!this.rootFolders) {
    this.rootFolders = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  
  // Update stats efficiently only when needed
  if (this.isModified('rootFolders') || this.isModified('members')) {
    this.stats.lastActivity = new Date();
    
    // Only update file/folder stats if rootFolders changed
    if (this.isModified('rootFolders')) {
      await this.updateStats();
    }
  }
  
  next();
});

// Add cache invalidation hooks
ProjectSchema.post('save', function() {
  // Invalidate cache for this project and related users
  if (global.cacheService) {
    global.cacheService.invalidateProject(this._id);
    global.cacheService.invalidateUser(this.creatorId);
    
    // Invalidate cache for all members
    if (this.members) {
      this.members.forEach(member => {
        global.cacheService.invalidateUser(member.userId);
      });
    }
  }
});

ProjectSchema.post('deleteOne', function() {
  if (global.cacheService) {
    global.cacheService.invalidateProject(this._id);
  }
});

const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

export default Project;