import mongoose from 'mongoose';

// Project validation
export const validateProject = (req, res, next) => {
  const { name, description, category, tags, settings } = req.body;
  const errors = [];

  // Name validation
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      errors.push('Project name is required');
    } else if (name.length > 255) {
      errors.push('Project name cannot exceed 255 characters');
    }
  }

  // Description validation
  if (description !== undefined && description.length > 1000) {
    errors.push('Project description cannot exceed 1000 characters');
  }

  // Category validation
  if (category !== undefined && !['general', 'web', 'mobile', 'desktop', 'api', 'library', 'other'].includes(category)) {
    errors.push('Invalid project category');
  }

  // Tags validation
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push('Tags must be an array');
    } else if (tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    } else {
      tags.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.length > 50) {
          errors.push(`Tag ${index + 1} must be a string and cannot exceed 50 characters`);
        }
      });
    }
  }

  // Settings validation
  if (settings !== undefined) {
    if (typeof settings !== 'object') {
      errors.push('Settings must be an object');
    } else {
      if (settings.maxFileSize !== undefined && (typeof settings.maxFileSize !== 'number' || settings.maxFileSize <= 0)) {
        errors.push('Max file size must be a positive number');
      }
      if (settings.allowedFileTypes !== undefined && !Array.isArray(settings.allowedFileTypes)) {
        errors.push('Allowed file types must be an array');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize data
  if (name) req.body.name = name.trim();
  if (description) req.body.description = description.trim();
  if (tags) req.body.tags = tags.map(tag => tag.trim().toLowerCase());

  next();
};

// Folder validation
export const validateFolder = (req, res, next) => {
  const { name, description, parent, projectId } = req.body;
  const errors = [];

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push('Folder name is required');
  } else if (name.length > 255) {
    errors.push('Folder name cannot exceed 255 characters');
  }

  // Description validation
  if (description && description.length > 500) {
    errors.push('Folder description cannot exceed 500 characters');
  }

  // Parent validation
  if (parent !== undefined && parent !== null) {
    if (!mongoose.Types.ObjectId.isValid(parent)) {
      errors.push('Invalid parent folder ID');
    }
  }

  // Project ID validation
  if (!projectId) {
    errors.push('Project ID is required');
  } else if (!mongoose.Types.ObjectId.isValid(projectId)) {
    errors.push('Invalid project ID');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize data
  req.body.name = name.trim();
  if (description) req.body.description = description.trim();

  next();
};

// File validation
export const validateFile = (req, res, next) => {
  const { name, content, type, folder, projectId, description } = req.body;
  const errors = [];

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push('File name is required');
  } else if (name.length > 255) {
    errors.push('File name cannot exceed 255 characters');
  }

  // Content validation
  if (content !== undefined && typeof content !== 'string') {
    errors.push('File content must be a string');
  }

  // Type validation
  if (type && !['text', 'binary', 'image', 'video', 'audio', 'archive'].includes(type)) {
    errors.push('Invalid file type');
  }

  // Folder validation
  if (folder !== undefined && folder !== null) {
    if (!mongoose.Types.ObjectId.isValid(folder)) {
      errors.push('Invalid folder ID');
    }
  }

  // Project ID validation
  if (!projectId) {
    errors.push('Project ID is required');
  } else if (!mongoose.Types.ObjectId.isValid(projectId)) {
    errors.push('Invalid project ID');
  }

  // Description validation
  if (description && description.length > 500) {
    errors.push('File description cannot exceed 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize data
  req.body.name = name.trim();
  if (description) req.body.description = description.trim();

  next();
};

// Member validation
export const validateMember = (req, res, next) => {
  const { userId, targetUserId, role } = req.body;
  const errors = [];

  // User ID validation
  if (!userId) {
    errors.push('User ID is required');
  }

  // Target user ID validation
  if (!targetUserId) {
    errors.push('Target user ID is required');
  }

  // Role validation
  if (role && !['owner', 'admin', 'editor', 'viewer'].includes(role)) {
    errors.push('Invalid role. Must be owner, admin, editor, or viewer');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Search validation
export const validateSearch = (req, res, next) => {
  const { query, page, limit } = req.query;
  const errors = [];

  // Query validation
  if (!query || query.trim().length === 0) {
    errors.push('Search query is required');
  } else if (query.length > 100) {
    errors.push('Search query cannot exceed 100 characters');
  }

  // Page validation
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  // Limit validation
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize data
  req.query.query = query.trim();

  next();
};

// Pagination validation
export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  const errors = [];

  // Page validation
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  // Limit validation
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Object ID validation
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

// File upload validation
export const validateFileUpload = (req, res, next) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = req.body;
  const errors = [];

  if (!req.file) {
    errors.push('No file uploaded');
  } else {
    // Check file size
    if (req.file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      errors
    });
  }

  next();
};

// Sanitize input
export const sanitizeInput = (req, res, next) => {
  // Fields that should NEVER be sanitized (preserve ALL characters)
  const preservedFields = [
    'content',      // File content - preserve ALL symbols
    'code',         // Code content
    'data',         // Raw data
    'raw',          // Raw content
    'text',         // Text content
    'body',         // Message body
    'message',      // Message content
    'template',     // Template content
    'script',       // Script content
    'style',        // CSS content
    'html',         // HTML content
    'xml',          // XML content
    'json',         // JSON content
    'yaml',         // YAML content
    'sql',          // SQL queries
    'regex',        // Regular expressions
    'pattern'       // Pattern content
  ];
  
  // Sanitize string fields (for non-content fields only)
  const sanitizeNonContentString = (str) => {
    if (typeof str === 'string') {
      // Only remove potentially dangerous scripts/protocols, keep all other symbols
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
        .replace(/javascript:\s*/gi, '') // Remove javascript: protocol
        .replace(/data:\s*text\/html/gi, '') // Remove data:text/html
        .replace(/vbscript:\s*/gi, '') // Remove vbscript: protocol
        .replace(/on\w+\s*=\s*['""][^'""]*['""]?/gi, ''); // Remove event handlers
    }
    return str;
  };

  // Recursively sanitize object
  const sanitizeObject = (obj, currentPath = '') => {
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const fieldPath = currentPath ? `${currentPath}.${key}` : key;
        
        // Check if this field should be preserved (case-insensitive)
        const shouldPreserve = preservedFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase()) || 
          fieldPath.toLowerCase().includes(field.toLowerCase())
        );
        
        if (shouldPreserve) {
          // Don't sanitize this field - preserve ALL characters
          console.log(`🔒 Preserving ALL symbols in field: ${fieldPath}`);
          return;
        }
        
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeNonContentString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key], fieldPath);
        }
      });
    } else if (Array.isArray(obj)) {
      // Handle arrays
      obj.forEach((item, index) => {
        const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        if (typeof item === 'object') {
          sanitizeObject(item, arrayPath);
        }
      });
    }
  };

  // Log the request for debugging
  if (req.body && Object.keys(req.body).length > 0) {
    const contentFields = Object.keys(req.body).filter(key => 
      preservedFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
    );
    if (contentFields.length > 0) {
      console.log(`📝 Request contains content fields: ${contentFields.join(', ')}`);
    }
  }

  sanitizeObject(req.body);
  sanitizeObject(req.query);

  next();
}; 