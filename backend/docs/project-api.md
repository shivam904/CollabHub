# Project API Documentation

## Overview
The Project API provides comprehensive project management functionality including CRUD operations, member management, statistics, and search capabilities.

## Base URL
```
http://localhost:5000/api/projects
```

## Authentication
Most endpoints require user authentication. Include the user ID in query parameters or use JWT tokens in headers.

## Endpoints

### 1. Create Project
**POST** `/new`

Creates a new project with the specified details.

#### Request Body
```json
{
  "name": "My React App",
  "description": "A collaborative React application",
  "creatorId": "user123",
  "members": ["user456", "user789"],
  "category": "web",
  "tags": ["react", "frontend", "collaboration"],
  "settings": {
    "allowPublicAccess": false,
    "requireApproval": false,
    "maxFileSize": 10485760,
    "allowedFileTypes": ["js", "jsx", "ts", "tsx", "css", "html"],
    "autoSave": true,
    "versionControl": true
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Project created successfully",
  "project": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "My React App",
    "description": "A collaborative React application",
    "creatorId": "user123",
    "members": [
      {
        "userId": "user123",
        "role": "owner",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "userId": "user456",
        "role": "viewer",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "category": "web",
    "tags": ["react", "frontend", "collaboration"],
    "settings": {
      "allowPublicAccess": false,
      "requireApproval": false,
      "maxFileSize": 10485760,
      "allowedFileTypes": ["js", "jsx", "ts", "tsx", "css", "html"],
      "autoSave": true,
      "versionControl": true
    },
    "stats": {
      "totalFiles": 0,
      "totalFolders": 0,
      "totalSize": 0,
      "lastActivity": "2024-01-15T10:30:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get User Projects
**GET** `/getProjects`

Retrieves all projects for a specific user.

#### Query Parameters
- `creatorId` (string, required): ID of the user who created the projects
- `userId` (string, optional): ID of the user to get projects for (includes shared projects)
- `status` (string, optional): Filter by project status (active, archived, deleted)
- `category` (string, optional): Filter by project category
- `search` (string, optional): Search in project name, description, or tags
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of projects per page (default: 10, max: 100)

#### Example Request
```
GET /api/projects/getProjects?creatorId=user123&page=1&limit=10
```

#### Response
```json
{
  "success": true,
  "projects": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "My React App",
      "description": "A collaborative React application",
      "creatorId": "user123",
      "category": "web",
      "tags": ["react", "frontend"],
      "stats": {
        "totalFiles": 5,
        "totalFolders": 3,
        "totalSize": 1024000,
        "lastActivity": "2024-01-15T10:30:00.000Z"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### 3. Get Project by ID
**GET** `/:projectId`

Retrieves a specific project by its ID.

#### Path Parameters
- `projectId` (string, required): The project ID

#### Query Parameters
- `userId` (string, required): ID of the user requesting the project

#### Example Request
```
GET /api/projects/64f8a1b2c3d4e5f6a7b8c9d0?userId=user123
```

#### Response
```json
{
  "success": true,
  "project": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "My React App",
    "description": "A collaborative React application",
    "creatorId": "user123",
    "members": [
      {
        "userId": "user123",
        "role": "owner",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "rootFolders": [],
    "category": "web",
    "tags": ["react", "frontend"],
    "settings": {
      "allowPublicAccess": false,
      "requireApproval": false,
      "maxFileSize": 10485760,
      "allowedFileTypes": ["js", "jsx", "ts", "tsx", "css", "html"],
      "autoSave": true,
      "versionControl": true
    },
    "stats": {
      "totalFiles": 5,
      "totalFolders": 3,
      "totalSize": 1024000,
      "lastActivity": "2024-01-15T10:30:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Update Project
**PUT** `/:projectId`

Updates an existing project.

#### Path Parameters
- `projectId` (string, required): The project ID

#### Query Parameters
- `userId` (string, required): ID of the user updating the project

#### Request Body
```json
{
  "name": "Updated React App",
  "description": "Updated description",
  "category": "web",
  "tags": ["react", "frontend", "updated"],
  "settings": {
    "allowPublicAccess": true
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Project updated successfully",
  "project": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Updated React App",
    "description": "Updated description",
    "category": "web",
    "tags": ["react", "frontend", "updated"],
    "settings": {
      "allowPublicAccess": true,
      "requireApproval": false,
      "maxFileSize": 10485760,
      "allowedFileTypes": ["js", "jsx", "ts", "tsx", "css", "html"],
      "autoSave": true,
      "versionControl": true
    },
    "updatedAt": "2024-01-15T11:30:00.000Z"
  }
}
```

### 5. Delete Project
**DELETE** `/:projectId`

Deletes a project (soft delete by default, hard delete with force flag).

#### Path Parameters
- `projectId` (string, required): The project ID

#### Request Body
```json
{
  "userId": "user123",
  "force": false
}
```

#### Response
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### 6. Get Project Statistics
**GET** `/:projectId/stats`

Retrieves detailed statistics for a project.

#### Path Parameters
- `projectId` (string, required): The project ID

#### Query Parameters
- `userId` (string, required): ID of the user requesting statistics

#### Example Request
```
GET /api/projects/64f8a1b2c3d4e5f6a7b8c9d0/stats?userId=user123
```

#### Response
```json
{
  "success": true,
  "stats": {
    "totalFiles": 15,
    "totalFolders": 8,
    "totalSize": 2048000,
    "lastActivity": "2024-01-15T10:30:00.000Z",
    "fileTypes": ["js", "jsx", "css", "html", "json"],
    "avgFileSize": 136533,
    "maxDepth": 4,
    "memberCount": 3,
    "age": 5
  }
}
```

### 7. Add Member
**POST** `/:projectId/members`

Adds a new member to the project.

#### Path Parameters
- `projectId` (string, required): The project ID

#### Request Body
```json
{
  "userId": "user123",
  "targetUserId": "user456",
  "role": "editor"
}
```

#### Response
```json
{
  "success": true,
  "message": "Member added successfully",
  "project": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "members": [
      {
        "userId": "user123",
        "role": "owner",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "userId": "user456",
        "role": "editor",
        "joinedAt": "2024-01-15T12:00:00.000Z"
      }
    ]
  }
}
```

### 8. Remove Member
**DELETE** `/:projectId/members`

Removes a member from the project.

#### Path Parameters
- `projectId` (string, required): The project ID

#### Request Body
```json
{
  "userId": "user123",
  "targetUserId": "user456"
}
```

#### Response
```json
{
  "success": true,
  "message": "Member removed successfully",
  "project": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "members": [
      {
        "userId": "user123",
        "role": "owner",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### 9. Search Projects
**GET** `/search`

Searches for projects based on query parameters.

#### Query Parameters
- `query` (string, required): Search query
- `userId` (string, optional): ID of the user to search projects for
- `category` (string, optional): Filter by category
- `status` (string, optional): Filter by status
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 10, max: 100)

#### Example Request
```
GET /api/projects/search?query=react&userId=user123&page=1&limit=10
```

#### Response
```json
{
  "success": true,
  "projects": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "My React App",
      "description": "A collaborative React application",
      "creatorId": "user123",
      "category": "web",
      "tags": ["react", "frontend"],
      "stats": {
        "totalFiles": 5,
        "totalFolders": 3,
        "totalSize": 1024000,
        "lastActivity": "2024-01-15T10:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### 10. Get Public Projects
**GET** `/public`

Retrieves all public projects.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 10, max: 100)
- `category` (string, optional): Filter by category
- `search` (string, optional): Search in project name, description, or tags

#### Example Request
```
GET /api/projects/public?page=1&limit=10&category=web
```

#### Response
```json
{
  "success": true,
  "projects": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Public React App",
      "description": "A public collaborative React application",
      "creatorId": "user123",
      "category": "web",
      "tags": ["react", "frontend", "public"],
      "settings": {
        "allowPublicAccess": true
      },
      "stats": {
        "totalFiles": 10,
        "totalFolders": 5,
        "totalSize": 2048000,
        "lastActivity": "2024-01-15T10:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Project name is required",
    "Project name cannot exceed 255 characters"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "User authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied to this project"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Project not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A project with this name already exists"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create project",
  "error": "Database connection error"
}
```

## Data Models

### Project Schema
```javascript
{
  name: String,           // Required, max 255 chars
  description: String,    // Max 1000 chars
  members: [{
    userId: String,
    role: String,         // 'owner', 'admin', 'editor', 'viewer'
    joinedAt: Date
  }],
  creatorId: String,      // Required
  rootFolders: [ObjectId], // References to Folder model
  settings: {
    allowPublicAccess: Boolean,
    requireApproval: Boolean,
    maxFileSize: Number,
    allowedFileTypes: [String],
    autoSave: Boolean,
    versionControl: Boolean
  },
  tags: [String],         // Max 10 tags, 50 chars each
  category: String,       // 'general', 'web', 'mobile', 'desktop', 'api', 'library', 'other'
  status: String,         // 'active', 'archived', 'deleted'
  stats: {
    totalFiles: Number,
    totalFolders: Number,
    totalSize: Number,
    lastActivity: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Rate Limiting
- 100 requests per 15 minutes per IP address
- Rate limit headers are included in responses

## Security
- Input sanitization for all requests
- CORS protection
- Helmet security headers
- JWT token validation (when implemented)
- Role-based access control

## Testing
Use the provided test data in `test-data/projects.json` to test the API endpoints. 