# Folder API Documentation

## Base URL
```
http://localhost:5000/api/folders
```

## Authentication
Most endpoints require a `userId` parameter either in the query string or request body to validate permissions.

## Endpoints

### 1. Create Folder
**POST** `/create`

Creates a new folder in a project.

**Request Body:**
```json
{
  "name": "My New Folder",
  "projectId": "project_id_here",
  "parentId": "parent_folder_id_here", // optional
  "owner": "user_id_here",
  "description": "Folder description", // optional
  "tags": ["tag1", "tag2"] // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Folder created successfully",
  "folder": {
    "_id": "folder_id",
    "name": "My New Folder",
    "path": "/parent/path",
    "level": 1,
    "owner": "user_id",
    "project": "project_id",
    "parent": {
      "_id": "parent_id",
      "name": "Parent Folder",
      "path": "/parent"
    },
    "files": [],
    "subfolders": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Project Folders
**GET** `/project/:projectId?userId=user_id&includeArchived=false`

Retrieves all folders for a specific project.

**Query Parameters:**
- `userId` (required): User ID for permission checking
- `includeArchived` (optional): Include archived folders (default: false)

**Response:**
```json
{
  "success": true,
  "folders": [
    {
      "_id": "folder_id",
      "name": "Folder Name",
      "path": "/path/to/folder",
      "level": 0,
      "owner": "user_id",
      "files": [
        {
          "_id": "file_id",
          "name": "file.txt",
          "type": "text",
          "size": 1024
        }
      ],
      "subfolders": [
        {
          "_id": "subfolder_id",
          "name": "Subfolder"
        }
      ]
    }
  ],
  "count": 1
}
```

### 3. Get Folder by ID
**GET** `/:folderId?userId=user_id`

Retrieves a specific folder with its contents.

**Response:**
```json
{
  "success": true,
  "folder": {
    "_id": "folder_id",
    "name": "Folder Name",
    "path": "/path/to/folder",
    "level": 0,
    "owner": "user_id",
    "project": {
      "_id": "project_id",
      "name": "Project Name"
    },
    "parent": {
      "_id": "parent_id",
      "name": "Parent Folder",
      "path": "/parent"
    },
    "files": [
      {
        "_id": "file_id",
        "name": "file.txt",
        "type": "text",
        "size": 1024,
        "lastModifiedBy": "user_id"
      }
    ],
    "subfolders": [
      {
        "_id": "subfolder_id",
        "name": "Subfolder"
      }
    ]
  }
}
```

### 4. Update Folder
**PUT** `/:folderId`

Updates folder properties.

**Request Body:**
```json
{
  "name": "Updated Folder Name", // optional
  "description": "Updated description", // optional
  "tags": ["new", "tags"], // optional
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Folder updated successfully",
  "folder": {
    "_id": "folder_id",
    "name": "Updated Folder Name",
    "description": "Updated description",
    "tags": ["new", "tags"]
  }
}
```

### 5. Delete Folder
**DELETE** `/:folderId`

Deletes a folder and its contents.

**Request Body:**
```json
{
  "userId": "user_id_here",
  "force": false // optional, force delete even if folder has contents
}
```

**Response:**
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

### 6. Get Folder Tree
**GET** `/:folderId/tree?userId=user_id`

Retrieves the complete folder tree structure starting from the specified folder.

**Response:**
```json
{
  "success": true,
  "tree": {
    "_id": "folder_id",
    "name": "Root Folder",
    "path": "/root",
    "level": 0,
    "files": ["file_id_1", "file_id_2"],
    "subfolders": [
      {
        "_id": "subfolder_id",
        "name": "Subfolder",
        "path": "/root/subfolder",
        "level": 1,
        "files": ["file_id_3"],
        "subfolders": []
      }
    ]
  }
}
```

### 7. Get Folder Contents
**GET** `/:folderId/contents?userId=user_id&includeArchived=false`

Retrieves files and subfolders within a specific folder.

**Response:**
```json
{
  "success": true,
  "contents": {
    "files": [
      {
        "_id": "file_id",
        "name": "file.txt",
        "type": "text",
        "size": 1024,
        "lastModifiedBy": "user_id",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "subfolders": [
      {
        "_id": "subfolder_id",
        "name": "Subfolder",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalFiles": 1,
    "totalSubfolders": 1
  }
}
```

### 8. Move Folder
**PUT** `/:folderId/move`

Moves a folder to a different parent location.

**Request Body:**
```json
{
  "newParentId": "new_parent_folder_id", // null for root level
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Folder moved successfully",
  "folder": {
    "_id": "folder_id",
    "name": "Folder Name",
    "parent": {
      "_id": "new_parent_id",
      "name": "New Parent",
      "path": "/new/parent"
    }
  }
}
```

### 9. Copy Folder
**POST** `/:folderId/copy`

Creates a copy of a folder with all its contents.

**Request Body:**
```json
{
  "newParentId": "destination_parent_id", // optional
  "newName": "Copied Folder", // optional
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Folder copied successfully",
  "folder": {
    "_id": "new_folder_id",
    "name": "Copied Folder",
    "parent": {
      "_id": "destination_parent_id",
      "name": "Destination Parent",
      "path": "/destination"
    }
  }
}
```

### 10. Share Folder
**POST** `/:folderId/share`

Shares a folder with another user with specific permissions.

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
  "message": "Folder shared successfully",
  "folder": {
    "_id": "folder_id",
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

### 11. Get Shared Folders
**GET** `/shared/:userId`

Retrieves all folders shared with a specific user.

**Response:**
```json
{
  "success": true,
  "sharedFolders": [
    {
      "_id": "folder_id",
      "name": "Shared Folder",
      "owner": "owner_user_id",
      "project": {
        "_id": "project_id",
        "name": "Project Name"
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

### 12. Search Folders
**GET** `/search/:projectId?query=search_term&userId=user_id`

Searches for folders within a project.

**Query Parameters:**
- `query` (required): Search term
- `userId` (required): User ID for permission checking

**Response:**
```json
{
  "success": true,
  "folders": [
    {
      "_id": "folder_id",
      "name": "Matching Folder",
      "path": "/path/to/folder",
      "parent": {
        "_id": "parent_id",
        "name": "Parent Folder",
        "path": "/parent"
      },
      "project": {
        "_id": "project_id",
        "name": "Project Name"
      }
    }
  ],
  "count": 1
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
  "message": "Folder not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A folder with this name already exists in this location"
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

1. **Create a folder:**
```bash
curl -X POST http://localhost:5000/api/folders/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Folder",
    "projectId": "your_project_id",
    "owner": "your_user_id",
    "description": "A test folder"
  }'
```

2. **Get project folders:**
```bash
curl "http://localhost:5000/api/folders/project/your_project_id?userId=your_user_id"
```

3. **Update a folder:**
```bash
curl -X PUT http://localhost:5000/api/folders/your_folder_id \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Folder Name",
    "userId": "your_user_id"
  }'
```

### Using JavaScript/Fetch

```javascript
// Create folder
const createFolder = async (folderData) => {
  const response = await fetch('http://localhost:5000/api/folders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderData)
  });
  return response.json();
};

// Get folders
const getFolders = async (projectId, userId) => {
  const response = await fetch(`http://localhost:5000/api/folders/project/${projectId}?userId=${userId}`);
  return response.json();
};

// Usage
const newFolder = await createFolder({
  name: 'My Folder',
  projectId: 'project_id',
  owner: 'user_id'
});

const folders = await getFolders('project_id', 'user_id');
``` 