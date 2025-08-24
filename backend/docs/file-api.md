# File API Documentation

## Base URL
```
http://localhost:5000/api/files
```

## Authentication
Most endpoints require a `userId` parameter either in the query string or request body to validate permissions.

## Endpoints

### 1. Create File
**POST** `/create`

Creates a new file in a folder.

**Request Body:**
```json
{
  "name": "app.js",
  "folderId": "folder_id_here",
  "projectId": "project_id_here",
  "owner": "user_id_here",
  "content": "console.log('Hello World');",
  "type": "text",
  "description": "Main application file",
  "tags": ["javascript", "main"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "File created successfully",
  "file": {
    "_id": "file_id",
    "name": "app.js",
    "folder": {
      "_id": "folder_id",
      "name": "src",
      "path": "/src"
    },
    "project": {
      "_id": "project_id",
      "name": "My Project"
    },
    "content": "console.log('Hello World');",
    "type": "text",
    "size": 25,
    "version": 1,
    "owner": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Project Files
**GET** `/project/:projectId?userId=user_id&includeArchived=false`

Retrieves all files for a specific project.

**Query Parameters:**
- `userId` (required): User ID for permission checking
- `includeArchived` (optional): Include archived files (default: false)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "_id": "file_id",
      "name": "app.js",
      "type": "text",
      "size": 1024,
      "version": 1,
      "folder": {
        "_id": "folder_id",
        "name": "src",
        "path": "/src"
      },
      "project": {
        "_id": "project_id",
        "name": "My Project"
      }
    }
  ],
  "count": 1
}
```

### 3. Get Folder Files
**GET** `/folder/:folderId?userId=user_id&includeArchived=false`

Retrieves all files in a specific folder.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "_id": "file_id",
      "name": "app.js",
      "type": "text",
      "size": 1024,
      "folder": {
        "_id": "folder_id",
        "name": "src",
        "path": "/src"
      }
    }
  ],
  "count": 1
}
```

### 4. Get File by ID
**GET** `/:fileId?userId=user_id`

Retrieves a specific file with its metadata.

**Response:**
```json
{
  "success": true,
  "file": {
    "_id": "file_id",
    "name": "app.js",
    "type": "text",
    "size": 1024,
    "version": 1,
    "owner": "user_id",
    "folder": {
      "_id": "folder_id",
      "name": "src",
      "path": "/src"
    },
    "project": {
      "_id": "project_id",
      "name": "My Project"
    },
    "isLocked": false,
    "lockedBy": null,
    "lastModifiedBy": "user_id"
  }
}
```

### 5. Update File Metadata
**PUT** `/:fileId`

Updates file properties (name, description, tags).

**Request Body:**
```json
{
  "name": "updated-app.js",
  "description": "Updated description",
  "tags": ["updated", "tags"],
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File updated successfully",
  "file": {
    "_id": "file_id",
    "name": "updated-app.js",
    "description": "Updated description",
    "tags": ["updated", "tags"]
  }
}
```

### 6. Delete File
**DELETE** `/:fileId`

Deletes a file.

**Request Body:**
```json
{
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 7. Get File Content
**GET** `/:fileId/content?userId=user_id`

Retrieves the content of a file.

**Response:**
```json
{
  "success": true,
  "content": "console.log('Hello World');",
  "file": {
    "_id": "file_id",
    "name": "app.js",
    "type": "text",
    "size": 25,
    "version": 1,
    "lastModifiedBy": "user_id"
  }
}
```

### 8. Update File Content
**PUT** `/:fileId/content`

Updates the content of a file and creates a new version.

**Request Body:**
```json
{
  "content": "console.log('Updated content');",
  "userId": "user_id_here",
  "comment": "Updated the main function"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File content updated successfully",
  "file": {
    "_id": "file_id",
    "name": "app.js",
    "version": 2,
    "size": 30,
    "lastModifiedBy": "user_id"
  }
}
```

### 9. Create File Version
**POST** `/:fileId/versions`

Creates a new version of a file.

**Request Body:**
```json
{
  "content": "console.log('New version');",
  "userId": "user_id_here",
  "comment": "Added new feature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File version created successfully",
  "version": 3
}
```

### 10. Get File Versions
**GET** `/:fileId/versions?userId=user_id`

Retrieves all versions of a file.

**Response:**
```json
{
  "success": true,
  "versions": [
    {
      "content": "console.log('Version 1');",
      "version": 1,
      "modifiedBy": "user_id",
      "modifiedAt": "2024-01-01T00:00:00.000Z",
      "comment": "Initial version"
    },
    {
      "content": "console.log('Version 2');",
      "version": 2,
      "modifiedBy": "user_id",
      "modifiedAt": "2024-01-01T01:00:00.000Z",
      "comment": "Updated content"
    }
  ],
  "currentVersion": 2
}
```

### 11. Lock File
**POST** `/:fileId/lock`

Locks a file for editing by a specific user.

**Request Body:**
```json
{
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File locked successfully",
  "lockedBy": "user_id"
}
```

### 12. Unlock File
**POST** `/:fileId/unlock`

Unlocks a file.

**Request Body:**
```json
{
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File unlocked successfully"
}
```

### 13. Search Files
**GET** `/search/:projectId?query=search_term&userId=user_id`

Searches for files within a project.

**Query Parameters:**
- `query` (required): Search term
- `userId` (required): User ID for permission checking

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "_id": "file_id",
      "name": "app.js",
      "type": "text",
      "folder": {
        "_id": "folder_id",
        "name": "src",
        "path": "/src"
      }
    }
  ],
  "count": 1
}
```

### 14. Duplicate File
**POST** `/:fileId/duplicate`

Creates a copy of a file.

**Request Body:**
```json
{
  "newName": "app-copy.js",
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File duplicated successfully",
  "file": {
    "_id": "new_file_id",
    "name": "app-copy.js",
    "folder": {
      "_id": "folder_id",
      "name": "src",
      "path": "/src"
    }
  }
}
```

### 15. Move File
**PUT** `/:fileId/move`

Moves a file to a different folder.

**Request Body:**
```json
{
  "newFolderId": "new_folder_id",
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File moved successfully",
  "file": {
    "_id": "file_id",
    "name": "app.js",
    "folder": {
      "_id": "new_folder_id",
      "name": "New Folder",
      "path": "/new/folder"
    }
  }
}
```

### 16. Copy File
**POST** `/:fileId/copy`

Copies a file to a different folder.

**Request Body:**
```json
{
  "newFolderId": "destination_folder_id",
  "newName": "app-copy.js",
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File copied successfully",
  "file": {
    "_id": "new_file_id",
    "name": "app-copy.js",
    "folder": {
      "_id": "destination_folder_id",
      "name": "Destination",
      "path": "/destination"
    }
  }
}
```

### 17. Share File
**POST** `/:fileId/share`

Shares a file with another user with specific permissions.

**Request Body:**
```json
{
  "userId": "owner_user_id",
  "targetUserId": "target_user_id",
  "permissions": {
    "read": true,
    "write": false,
    "delete": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "File shared successfully",
  "file": {
    "_id": "file_id",
    "sharedWith": [
      {
        "userId": "target_user_id",
        "permissions": {
          "read": true,
          "write": false,
          "delete": false
        }
      }
    ]
  }
}
```

### 18. Get Shared Files
**GET** `/shared/:userId`

Retrieves all files shared with a specific user.

**Response:**
```json
{
  "success": true,
  "sharedFiles": [
    {
      "_id": "file_id",
      "name": "shared-file.js",
      "owner": "owner_user_id",
      "project": {
        "_id": "project_id",
        "name": "Project Name"
      },
      "folder": {
        "_id": "folder_id",
        "name": "Folder Name"
      },
      "sharedWith": [
        {
          "userId": "user_id",
          "permissions": {
            "read": true,
            "write": false,
            "delete": false
          }
        }
      ]
    }
  ]
}
```

### 19. Download File
**GET** `/:fileId/download?userId=user_id`

Downloads a file (returns file content as JSON for now).

**Response:**
```json
{
  "success": true,
  "file": {
    "name": "app.js",
    "content": "console.log('Hello World');",
    "type": "text",
    "size": 25
  }
}
```

### 20. Upload File
**POST** `/upload`

Uploads a file (placeholder for future implementation).

**Response:**
```json
{
  "success": false,
  "message": "File upload functionality not yet implemented"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "User ID is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "File not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A file with this name already exists in this folder"
}
```

### 423 Locked
```json
{
  "success": false,
  "message": "File is locked by another user"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

## Testing Examples

### Using cURL

1. **Create a file:**
```bash
curl -X POST http://localhost:5000/api/files/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app.js",
    "folderId": "your_folder_id",
    "projectId": "your_project_id",
    "owner": "your_user_id",
    "content": "console.log(\"Hello World\");",
    "type": "text"
  }'
```

2. **Get project files:**
```bash
curl "http://localhost:5000/api/files/project/your_project_id?userId=your_user_id"
```

3. **Update file content:**
```bash
curl -X PUT http://localhost:5000/api/files/your_file_id/content \
  -H "Content-Type: application/json" \
  -d '{
    "content": "console.log(\"Updated content\");",
    "userId": "your_user_id"
  }'
```

### Using JavaScript/Fetch

```javascript
// Create file
const createFile = async (fileData) => {
  const response = await fetch('http://localhost:5000/api/files/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fileData)
  });
  return response.json();
};

// Get file content
const getFileContent = async (fileId, userId) => {
  const response = await fetch(`http://localhost:5000/api/files/${fileId}/content?userId=${userId}`);
  return response.json();
};

// Usage
const newFile = await createFile({
  name: 'app.js',
  folderId: 'folder_id',
  projectId: 'project_id',
  owner: 'user_id',
  content: 'console.log("Hello World");',
  type: 'text'
});

const fileContent = await getFileContent('file_id', 'user_id');
```

## File Types Supported

The API supports various file types:
- `text` - Plain text files
- `code` - Source code files
- `document` - Document files
- `image` - Image files
- `pdf` - PDF files
- `binary` - Binary files

## Version Control

Files support automatic version control:
- Each content update creates a new version
- Version history is maintained
- Comments can be added to versions
- Previous versions can be accessed

## Collaboration Features

- **File Locking**: Prevent concurrent edits
- **Sharing**: Share files with specific permissions
- **Real-time Updates**: Track who last modified files
- **Permission System**: Granular access control 