import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema({
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
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  }, // null for root folders
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  // File and folder references
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  subfolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }],
  // Additional metadata
  path: { 
    type: String, 
    required: true 
  }, // Full path from root
  level: { 
    type: Number, 
    default: 0 
  }, // Depth level in folder hierarchy
  isRoot: { 
    type: Boolean, 
    default: false 
  },
  // Permissions and sharing
  permissions: {
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: true },
    delete: { type: Boolean, default: true }
  },
  sharedWith: [{
    userId: String,
    permissions: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  }],
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

// Strategic indexes for ultra-fast folder operations
FolderSchema.index({ project: 1, parent: 1 });
// Ensure unique folder per location within a project (path + name uniquely identifies a folder)
FolderSchema.index({ project: 1, path: 1, name: 1 }, { unique: true });
FolderSchema.index({ owner: 1 });
FolderSchema.index({ 'sharedWith.userId': 1 });
FolderSchema.index({ isRoot: 1, project: 1 }); // Root folders
FolderSchema.index({ level: 1 }); // Folder depth queries

// Advanced compound indexes
FolderSchema.index({ project: 1, isRoot: 1, updatedAt: -1 }); // Recent root folders
FolderSchema.index({ project: 1, owner: 1, updatedAt: -1 }); // User's recent folders
FolderSchema.index({ parent: 1, name: 1 }); // Subfolder lookups
FolderSchema.index({ project: 1, isArchived: 1 }); // Active/archived folders

// Text search for folder names and descriptions
FolderSchema.index({ 
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

// Virtual for getting full folder path
FolderSchema.virtual('fullPath').get(function() {
  return this.path + '/' + this.name;
});

// Virtual for getting total file count (including subfolders)
FolderSchema.virtual('totalFileCount').get(function() {
  return this.files ? this.files.length : 0;
});

// Pre-save middleware to update path and level
FolderSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.files) {
    this.files = [];
  }
  if (!this.subfolders) {
    this.subfolders = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  if (!this.sharedWith) {
    this.sharedWith = [];
  }
  
  if (this.isNew || this.isModified('parent')) {
    if (this.parent) {
      const parentFolder = await this.constructor.findById(this.parent);
      if (parentFolder) {
        this.path = parentFolder.path + '/' + parentFolder.name;
        this.level = parentFolder.level + 1;
      }
    } else {
      this.path = '';
      this.level = 0;
      this.isRoot = true;
    }
  }
  next();
});

// Instance method to get all files recursively
FolderSchema.methods.getAllFiles = async function() {
  const files = [...(this.files || [])];
  
  if (this.subfolders) {
    for (const subfolderId of this.subfolders) {
      const subfolder = await this.constructor.findById(subfolderId);
      if (subfolder) {
        const subfolderFiles = await subfolder.getAllFiles();
        files.push(...subfolderFiles);
      }
    }
  }
  
  return files;
};

// Instance method to get folder tree
FolderSchema.methods.getFolderTree = async function() {
  const tree = {
    _id: this._id,
    name: this.name,
    path: this.path,
    level: this.level,
    files: this.files || [],
    subfolders: []
  };
  
  if (this.subfolders) {
    for (const subfolderId of this.subfolders) {
      const subfolder = await this.constructor.findById(subfolderId);
      if (subfolder) {
        const subtree = await subfolder.getFolderTree();
        tree.subfolders.push(subtree);
      }
    }
  }
  
  return tree;
};

// Static method to find folders by project
FolderSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId }).populate('files subfolders');
};

// Optimized static methods for folder operations
FolderSchema.statics.findRootFolders = function(projectId, options = {}) {
  const { includeFiles = false, includeSubfolders = false, limit = 50 } = options;
  
  let query = this.find({ 
    project: projectId, 
    isRoot: true,
    isArchived: { $ne: true }
  })
  .sort({ updatedAt: -1 })
  .limit(limit);
  
  if (includeFiles) {
    query = query.populate('files', 'name type size extension updatedAt');
  }
  
  if (includeSubfolders) {
    query = query.populate('subfolders', 'name level updatedAt');
  }
  
  return query.lean();
};

// Get folder tree efficiently using aggregation
FolderSchema.statics.getFolderTree = function(projectId, maxDepth = 5) {
  return this.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isArchived: { $ne: true }
      }
    },
    {
      $graphLookup: {
        from: 'folders',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parent',
        as: 'descendants',
        maxDepth: maxDepth,
        depthField: 'depth'
      }
    },
    {
      $match: {
        isRoot: true
      }
    },
    {
      $project: {
        name: 1,
        path: 1,
        level: 1,
        files: 1,
        descendants: {
          $map: {
            input: '$descendants',
            as: 'desc',
            in: {
              _id: '$$desc._id',
              name: '$$desc.name',
              parent: '$$desc.parent',
              level: '$$desc.level',
              depth: '$$desc.depth'
            }
          }
        }
      }
    }
  ]);
};

// Fast folder listing with minimal data
FolderSchema.statics.listFolders = function(projectId, parentId = null, options = {}) {
  const { limit = 100, includeFileCount = false } = options;
  
  const pipeline = [
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        parent: parentId ? new mongoose.Types.ObjectId(parentId) : null,
        isArchived: { $ne: true }
      }
    },
    {
      $project: {
        name: 1,
        path: 1,
        level: 1,
        owner: 1,
        updatedAt: 1,
        ...(includeFileCount && {
          fileCount: { $size: '$files' },
          subfolderCount: { $size: '$subfolders' }
        })
      }
    },
    { $sort: { name: 1 } },
    { $limit: limit }
  ];
  
  return this.aggregate(pipeline);
};

// Search folders efficiently
FolderSchema.statics.searchFolders = function(projectId, query, limit = 20) {
  const pipeline = [];
  
  const matchStage = {
    project: new mongoose.Types.ObjectId(projectId),
    isArchived: { $ne: true }
  };
  
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
  
  pipeline.push({
    $project: {
      name: 1,
      path: 1,
      level: 1,
      parent: 1,
      fileCount: { $size: '$files' },
      subfolderCount: { $size: '$subfolders' },
      updatedAt: 1
    }
  });
  
  pipeline.push({ $limit: limit });
  
  return this.aggregate(pipeline);
};

// Get folder statistics
FolderSchema.statics.getFolderStats = function(projectId) {
  return this.aggregate([
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
};

// Pre-save middleware optimizations
FolderSchema.pre('save', async function(next) {
  // Initialize arrays if they don't exist
  if (!this.files) {
    this.files = [];
  }
  if (!this.subfolders) {
    this.subfolders = [];
  }
  if (!this.tags) {
    this.tags = [];
  }
  if (!this.sharedWith) {
    this.sharedWith = [];
  }
  
  // Only update path and level when necessary
  if (this.isNew || this.isModified('parent')) {
    if (this.parent) {
      const parentFolder = await this.constructor.findById(this.parent)
        .select('path name level')
        .lean();
      if (parentFolder) {
        this.path = parentFolder.path + '/' + parentFolder.name;
        this.level = parentFolder.level + 1;
      }
    } else {
      this.path = '';
      this.level = 0;
      this.isRoot = true;
    }
  }
  
  next();
});

// Add cache invalidation hooks
FolderSchema.post('save', function() {
  if (global.cacheService) {
    global.cacheService.invalidatePattern(`*folder:${this._id}*`);
    global.cacheService.invalidateProject(this.project);
    
    // Invalidate parent folder cache
    if (this.parent) {
      global.cacheService.invalidatePattern(`*folder:${this.parent}*`);
    }
  }
});

FolderSchema.post('deleteOne', function() {
  if (global.cacheService) {
    global.cacheService.invalidatePattern(`*folder:${this._id}*`);
    global.cacheService.invalidateProject(this.project);
  }
});

const Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);

export default Folder; 