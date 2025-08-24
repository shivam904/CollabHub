import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
  },
  owner: { 
    type: String, 
    required: true 
  },
  folder: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder'
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  content: { 
    type: String, 
    default: '' 
  },
  type: { 
    type: String, 
    default: 'text'
  },
  // File metadata
  size: { 
    type: Number, 
    default: 0 
  },
  extension: { 
    type: String, 
    default: '' 
  },
  mimeType: { 
    type: String, 
    default: 'text/plain' 
  },
  path: { 
    type: String, 
    required: true 
  }, // Full file path
  // Version control
  version: { 
    type: Number, 
    default: 1 
  },
  versions: [{
    content: String,
    version: Number,
    modifiedBy: String,
    modifiedAt: { type: Date, default: Date.now },
    comment: String
  }],
  // File-level permissions: array of { userId, role }
  permissions: [{
    userId: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor'], required: true }
  }],
  // Collaboration
  isLocked: { 
    type: Boolean, 
    default: false 
  },
  lockedBy: { 
    type: String, 
    default: null 
  },
  lastModifiedBy: { 
    type: String, 
    default: null 
  },
  // Metadata
  description: { 
    type: String, 
    maxlength: 500 
  },
  tags: [String],
  isArchived: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Strategic indexes for ultra-fast file operations
FileSchema.index({ project: 1, folder: 1 });
// Uniqueness per canonical path across project
FileSchema.index({ project: 1, path: 1 }, { unique: true });
FileSchema.index({ owner: 1 });
FileSchema.index({ 'permissions.userId': 1 });
FileSchema.index({ type: 1 });
FileSchema.index({ extension: 1 });

// Advanced compound indexes for complex queries
FileSchema.index({ project: 1, type: 1, updatedAt: -1 }); // Recent files by type
FileSchema.index({ project: 1, owner: 1, updatedAt: -1 }); // User's recent files
FileSchema.index({ project: 1, size: -1 }); // Largest files in project
FileSchema.index({ project: 1, version: -1 }); // Most recent versions
FileSchema.index({ lastModifiedBy: 1, updatedAt: -1 }); // Recently modified by user
FileSchema.index({ isLocked: 1, lockedBy: 1 }); // Locked files
FileSchema.index({ isArchived: 1 }); // Archived files

// Text search index for file content and names
FileSchema.index({ 
  name: 'text', 
  content: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 3,
    content: 1
  }
});

// Sparse indexes for optional fields
FileSchema.index({ lockedBy: 1 }, { sparse: true });
FileSchema.index({ lastModifiedBy: 1 }, { sparse: true });

// Virtual for getting full file path
FileSchema.virtual('fullPath').get(function() {
  return this.path + '/' + this.name;
});

// Virtual for getting file size in human readable format
FileSchema.virtual('sizeFormatted').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Pre-save middleware to update path and extract extension
FileSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.versions) {
    this.versions = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  if (!this.permissions) {
    this.permissions = [];
  }
  
  // Only update path if it's not already set and we have a folder
  if (!this.path && this.folder) {
    const Folder = mongoose.model('Folder');
    const folder = await Folder.findById(this.folder);
    if (folder) {
      this.path = folder.path + '/' + folder.name;
    }
  }
  
  // Extract file extension from name
  if (this.name && this.name.includes('.')) {
    this.extension = this.name.split('.').pop().toLowerCase();
  }
  
  // Set mime type based on extension
  if (this.extension) {
    const mimeTypes = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'py': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'go': 'text/x-go',
      'rs': 'text/x-rust',
      'sql': 'text/x-sql',
      'xml': 'application/xml',
      'yaml': 'text/yaml',
      'yml': 'text/yaml'
    };
    this.mimeType = mimeTypes[this.extension] || 'text/plain';
  }
  
  next();
});

// Instance method to create new version
FileSchema.methods.createVersion = function(content, modifiedBy, comment = '') {
  if (!this.versions) {
    this.versions = [];
  }
  
  this.versions.push({
    content: this.content,
    version: this.version,
    modifiedBy: this.lastModifiedBy || this.owner,
    modifiedAt: new Date(),
    comment: comment
  });
  
  this.content = content;
  this.version += 1;
  this.lastModifiedBy = modifiedBy;
  
  return this.save();
};

// Instance method to lock file
FileSchema.methods.lock = function(userId) {
  if (this.isLocked && this.lockedBy !== userId) {
    throw new Error('File is already locked by another user');
  }
  
  this.isLocked = true;
  this.lockedBy = userId;
  return this.save();
};

// Instance method to unlock file
FileSchema.methods.unlock = function(userId) {
  if (this.lockedBy !== userId) {
    throw new Error('Only the user who locked the file can unlock it');
  }
  
  this.isLocked = false;
  this.lockedBy = null;
  return this.save();
};

// Static method to find files by project
FileSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId }).populate('folder');
};

// Static method to find files by folder
FileSchema.statics.findByFolder = function(folderId) {
  return this.find({ folder: folderId });
};

// Optimized static methods using aggregation and indexes
FileSchema.statics.search = function(projectId, query, options = {}) {
  const {
    limit = 50,
    includeContent = false,
    fileTypes = null,
    userId = null
  } = options;
  
  const pipeline = [];
  
  // Base match
  const matchStage = {
    project: new mongoose.Types.ObjectId(projectId),
    isArchived: { $ne: true }
  };
  
  // Add file type filter
  if (fileTypes && fileTypes.length > 0) {
    matchStage.extension = { $in: fileTypes };
  }
  
  // Add user filter for permissions
  if (userId) {
    matchStage.$or = [
      { owner: userId },
      { 'permissions.userId': userId }
    ];
  }
  
  // Text search if query provided
  if (query) {
    matchStage.$text = { $search: query };
    pipeline.push({ $match: matchStage });
    pipeline.push({
      $addFields: {
        score: { $meta: 'textScore' }
      }
    });
    pipeline.push({ $sort: { score: { $meta: 'textScore' } } });
  } else {
    pipeline.push({ $match: matchStage });
    pipeline.push({ $sort: { updatedAt: -1 } });
  }
  
  // Project only needed fields
  const projectStage = {
    name: 1,
    path: 1,
    type: 1,
    extension: 1,
    size: 1,
    owner: 1,
    folder: 1,
    version: 1,
    isLocked: 1,
    lockedBy: 1,
    lastModifiedBy: 1,
    updatedAt: 1,
    createdAt: 1
  };
  
  if (includeContent) {
    projectStage.content = 1;
  }
  
  pipeline.push({ $project: projectStage });
  pipeline.push({ $limit: limit });
  
  return this.aggregate(pipeline);
};

// Fast file listing with minimal data
FileSchema.statics.listFiles = function(projectId, folderId = null, options = {}) {
  const {
    limit = 100,
    sortBy = 'updatedAt',
    sortOrder = -1,
    includeStats = false
  } = options;
  
  const query = {
    project: projectId,
    isArchived: { $ne: true }
  };
  
  if (folderId) {
    query.folder = folderId;
  }
  
  const projection = {
    name: 1,
    type: 1,
    extension: 1,
    size: 1,
    folder: 1,
    version: 1,
    isLocked: 1,
    updatedAt: 1
  };
  
  if (includeStats) {
    projection.owner = 1;
    projection.lastModifiedBy = 1;
    projection.createdAt = 1;
  }
  
  return this.find(query, projection)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .lean();
};

// Get file statistics for a project
FileSchema.statics.getProjectFileStats = function(projectId) {
  return this.aggregate([
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
};

// Get user's recent files across projects
FileSchema.statics.getUserRecentFiles = function(userId, limit = 20) {
  return this.find({
    $or: [
      { owner: userId },
      { lastModifiedBy: userId }
    ],
    isArchived: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('name project folder type extension size updatedAt')
    .populate('project', 'name')
    .lean();
};

// Pre-save middleware optimizations
FileSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.versions) {
    this.versions = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  if (!this.permissions) {
    this.permissions = [];
  }
  
  // Only update path if it's not already set and we have a folder
  if (!this.path && this.folder) {
    const Folder = mongoose.model('Folder');
    const folder = await Folder.findById(this.folder).select('path name').lean();
    if (folder) {
      this.path = folder.path + '/' + folder.name;
    }
  }
  
  // Extract file extension and set mime type efficiently
  if (this.isModified('name') && this.name && this.name.includes('.')) {
    this.extension = this.name.split('.').pop().toLowerCase();
    
    // Set mime type based on extension
    const mimeTypes = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'py': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'go': 'text/x-go',
      'rs': 'text/x-rust',
      'sql': 'text/x-sql',
      'xml': 'application/xml',
      'yaml': 'text/yaml',
      'yml': 'text/yaml'
    };
    this.mimeType = mimeTypes[this.extension] || 'text/plain';
  }
  
  // Update size if content changed
  if (this.isModified('content')) {
    this.size = Buffer.byteLength(this.content || '', 'utf8');
  }
  
  next();
});

// Add cache invalidation hooks
FileSchema.post('save', function() {
  if (global.cacheService) {
    global.cacheService.invalidateFile(this._id);
    global.cacheService.invalidateProject(this.project);
    
    // Invalidate folder cache if file is in a folder
    if (this.folder) {
      global.cacheService.invalidatePattern(`*folder:${this.folder}*`);
    }
  }
});

FileSchema.post('deleteOne', function() {
  if (global.cacheService) {
    global.cacheService.invalidateFile(this._id);
    global.cacheService.invalidateProject(this.project);
  }
});

const File = mongoose.models.File || mongoose.model('File', FileSchema);

export default File;