# CollabHub Frontend

A modern, responsive React frontend for the CollabHub collaborative coding platform, featuring enhanced project management, real-time collaboration, and comprehensive file management.

## 🚀 Features

### Enhanced Project Management
- **Project Dashboard**: View all projects with filtering, search, and statistics
- **Project Creation**: Create new projects with tags, visibility settings, and descriptions
- **Project Settings**: Comprehensive project management including:
  - General settings (name, description, visibility)
  - Member management (add/remove team members)
  - Project statistics and analytics
  - Danger zone (project deletion)
- **Project Search**: Advanced search with filters for status, visibility, and sorting
- **Public Projects**: Browse and discover public projects

### File & Folder Management
- **File Explorer**: Hierarchical file and folder navigation
- **File Operations**: Create, edit, delete, move, copy, and duplicate files
- **Folder Operations**: Create, delete, move, and copy folders
- **File Versioning**: Track file changes with version history
- **File Locking**: Prevent conflicts with file locking system
- **File Sharing**: Share files with specific permissions

### Real-time Collaboration
- **Live Code Editing**: Real-time collaborative code editing
- **User Presence**: See who's currently editing files
- **Change Tracking**: Track changes and comments
- **Conflict Resolution**: Handle concurrent edits gracefully

### User Interface
- **Modern Design**: Clean, responsive design with dark/light theme support
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Intuitive Navigation**: Easy-to-use sidebar navigation
- **Loading States**: Smooth loading indicators and error handling
- **Form Validation**: Comprehensive client-side validation

## 🛠️ Technology Stack

- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **Custom Hooks**: Reusable state management
- **CSS3**: Modern styling with Flexbox and Grid
- **Responsive Design**: Mobile-first approach

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx
│   ├── editor/
│   │   ├── CodeEditor.jsx
│   │   ├── CollaborationPanel.jsx
│   │   ├── FileExplorer.jsx

│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Layout.jsx
│   │   └── Sidebar.jsx
│   └── ui/
│       └── LoadingSpinner.jsx
├── contexts/
│   └── AuthContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useFileManager.js
│   └── useProjectManager.js
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── Dashboard.jsx
│   ├── Editor.jsx
│   ├── NewProject.jsx
│   ├── Profile.jsx
│   └── ProjectSettings.jsx
├── services/
│   └── api.js
├── App.css
├── App.jsx
└── main.jsx
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Backend server running (see backend README)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🎯 Key Components

### Project Management

#### Dashboard (`pages/Dashboard.jsx`)
- Displays user's projects in a responsive grid
- Search and filter functionality
- Project statistics overview
- Quick actions for project management

#### NewProject (`pages/NewProject.jsx`)
- Form for creating new projects
- Validation for project name, description, and tags
- Visibility settings (public/private)
- Tag management with add/remove functionality

#### ProjectSettings (`pages/ProjectSettings.jsx`)
- Tabbed interface for different settings sections
- General settings (name, description, visibility)
- Member management with role assignment
- Project statistics and analytics
- Danger zone for project deletion

### Custom Hooks

#### useProjectManager (`hooks/useProjectManager.js`)
Comprehensive project management hook providing:
- Project CRUD operations
- Member management
- Search and filtering
- Statistics loading
- Error handling

#### useFileManager (`hooks/useFileManager.js`)
File and folder management hook with:
- File/folder CRUD operations
- Version management
- File locking
- Search functionality
- Real-time updates

### API Service (`services/api.js`)
Centralized API service with:
- Project endpoints
- File/folder endpoints
- Error handling
- Request/response interceptors

## 🎨 Styling

The application uses a custom CSS approach with:
- **CSS Grid & Flexbox**: Modern layout techniques
- **CSS Custom Properties**: Theme variables
- **Responsive Design**: Mobile-first approach
- **Component-based Styling**: Modular CSS classes

### Key Style Features
- Clean, modern design
- Consistent spacing and typography
- Smooth animations and transitions
- Accessible color contrast
- Responsive breakpoints

## 🔄 State Management

### Context API
- **AuthContext**: User authentication state
- **ProjectContext**: Current project state
- **FileContext**: File management state

### Custom Hooks
- **useAuth**: Authentication operations
- **useProjectManager**: Project state management
- **useFileManager**: File state management

## 🚦 Routing

The application uses React Router with protected routes:

```jsx
// Public routes
/login
/register

// Protected routes
/
/dashboard
/new-project
/editor/:projectId
/project/:projectId/settings
/profile
```

## 🔐 Authentication

- Firebase Authentication integration
- Protected routes for authenticated users
- User context management
- Automatic token refresh

## 📱 Responsive Design

The application is fully responsive with:
- **Desktop**: Full sidebar navigation
- **Tablet**: Collapsible sidebar
- **Mobile**: Hamburger menu with overlay

### Breakpoints
- `1024px`: Sidebar becomes collapsible
- `768px`: Mobile layout adjustments
- `480px`: Compact mobile layout

## 🧪 Error Handling

Comprehensive error handling throughout the application:
- API error handling with user-friendly messages
- Form validation with real-time feedback
- Loading states and error boundaries
- Network error recovery

## 🔧 Development

### Code Quality
- ESLint configuration for code quality
- Consistent code formatting
- Component documentation
- Type checking with PropTypes

### Performance
- Lazy loading for routes
- Optimized re-renders with useCallback/useMemo
- Efficient state updates
- Minimal bundle size

## 🚀 Deployment

### Build Process
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview build
npm run preview
```

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Drag-and-drop deployment
- **AWS S3**: Static hosting
- **GitHub Pages**: Free hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Open an issue on GitHub
- Contact the development team

---

**Note**: This frontend is designed to work with the CollabHub backend API. Make sure the backend server is running and properly configured before using the frontend.
