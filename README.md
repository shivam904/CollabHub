# 🚀 CollabHub - Advanced Collaborative Development Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A production-ready collaborative development platform with real-time code editing, cloud terminals, file management, and advanced collaboration features.**

## ✨ **What is CollabHub?**

CollabHub is a comprehensive collaborative development platform that combines the power of real-time code editing with cloud-based development environments. It's designed for teams who want to code together seamlessly, with features ranging from basic file editing to advanced cloud terminal integration.

### 🎯 **Key Features**

- **🖥️ Real-time Collaborative Code Editor** - Edit code together with live synchronization
- **☁️ Cloud Terminal Integration** - Full development environment in Docker containers
- **📁 Advanced File Management** - Hierarchical folder structure with version control
- **🔐 Secure Authentication** - Firebase-based user management
- **💬 Real-time Communication** - Built-in chat and collaboration tools
- **🚀 Multi-language Support** - Node.js, Python, Java, Go, Rust, C/C++
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **🔍 Advanced Search** - Full-text search across files and folders
- **🔄 Auto-sync** - Automatic file synchronization with conflict resolution

---

## 🏗️ **Architecture Overview**

### **Backend Stack**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.io** - Real-time communication
- **Docker** - Container orchestration
- **Redis** - Caching and session management
- **Firebase Admin** - Authentication and user management

### **Frontend Stack**
- **React 19** - UI library with latest features
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - Professional code editor
- **Socket.io Client** - Real-time communication
- **XTerm.js** - Terminal emulator
- **Yjs** - CRDT for collaborative editing

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- MongoDB 6+
- Docker (for cloud terminal features)
- Git

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/collabhub.git
cd collabhub
```

### **2. Backend Setup**
```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Configure your environment variables
nano .env
```

**Required Environment Variables:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collabhub
JWT_SECRET=your_super_secret_jwt_key_here
CORS_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

**Firebase Setup:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file and rename it to `serviceAccountKey.json`
6. Place it in `backend/config/` directory
7. Update your backend `.env` file with the Firebase credentials
8. Go to Project Settings > General
9. Copy the Firebase configuration values
10. Update your frontend `.env` file with the Firebase config

### **3. Frontend Setup**
```bash
cd ../frontend
npm install

# Create environment file
cp ../frontend.env.example .env

# Configure your Firebase environment variables
nano .env
```

**Required Frontend Environment Variables:**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### **4. Start Development Servers**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### **5. Access the Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 🎮 **Core Features**

### **1. Real-time Collaborative Editing**
- **Live synchronization** of code changes
- **Cursor tracking** - see where team members are editing
- **Conflict resolution** - automatic merge of concurrent edits
- **Version history** - track all changes with comments
- **File locking** - prevent conflicts during simultaneous editing

### **2. Cloud Terminal Integration**
- **Docker-based containers** for each user
- **Multi-language support** - Node.js, Python, Java, Go, Rust, C/C++
- **Persistent volumes** - files retained between sessions
- **Secure isolation** - each user gets their own container
- **Real-time output** - live command execution

**Supported Development Workflows:**
```bash
# React Development
npx create-react-app my-app
cd my-app && npm start

# Node.js API
npm init -y
npm install express cors helmet
npm install -D nodemon

# Python Development
python -m venv venv
source venv/bin/activate
pip install flask requests

# Go Development
go mod init my-go-app
go run main.go
```

### **3. Advanced File Management**
- **Hierarchical folder structure** with unlimited nesting
- **Drag & drop** file operations
- **Bulk operations** - select multiple files/folders
- **Search & filter** - find files quickly
- **Archive system** - organize without deletion
- **Permission management** - control access levels

### **4. Project Collaboration**
- **Team management** - invite and manage team members
- **Role-based permissions** - owner, editor, viewer
- **Project sharing** - public and private projects
- **Activity feed** - track team activity
- **Comment system** - discuss code changes

---

## 🔧 **Advanced Configuration**

### **Docker Setup for Cloud Terminal**
```bash
# Build terminal environment
cd backend
npm run docker:build:terminal

# Start with terminal support
npm start
```

### **Production Deployment**
```bash
# Use production deployment script
chmod +x deploy-production.sh
./deploy-production.sh
```

### **Environment Configuration**
```bash
# Development
cp .env.example .env

# Production  
cp production.env.example .env.production
```

---

## 📚 **API Documentation**

### **Authentication Endpoints**
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
GET /api/auth/profile
```

### **Project Management**
```http
POST /api/projects/new
GET /api/projects/getProjects
GET /api/projects/:projectId
PUT /api/projects/:projectId
DELETE /api/projects/:projectId
```

### **File Operations**
```http
POST /api/files/create
GET /api/files/:fileId/content
PUT /api/files/:fileId/content
DELETE /api/files/:fileId
GET /api/files/search/:projectId
```

### **Folder Operations**
```http
POST /api/folders/create
GET /api/folders/project/:projectId
GET /api/folders/:folderId/contents
PUT /api/folders/:folderId
DELETE /api/folders/:folderId
```

### **Terminal Operations**
```http
POST /api/terminal/create
GET /api/terminal/:terminalId/status
POST /api/terminal/:terminalId/execute
DELETE /api/terminal/:terminalId
```

---

## 🛡️ **Security Features**

### **Authentication & Authorization**
- **Firebase Authentication** - Secure user management
- **JWT Tokens** - Stateless session management
- **Role-based Access Control** - Fine-grained permissions
- **API Rate Limiting** - Prevent abuse

### **Sensitive File Management**
- **Never commit credentials** - All sensitive files are gitignored
- **Environment variables** - Use `.env` files for configuration
- **Service account keys** - Store Firebase credentials securely
- **Template files** - Use `.example` files for configuration examples

### **Data Security**
- **Input Validation** - Sanitize all user inputs
- **File Upload Restrictions** - Whitelist allowed file types
- **Path Traversal Protection** - Prevent directory traversal attacks
- **SQL Injection Prevention** - Parameterized queries

### **Container Security**
- **Non-root Execution** - Containers run as non-privileged users
- **Resource Limits** - Prevent resource exhaustion
- **Network Isolation** - Isolated bridge networks
- **Security Options** - Docker security features enabled

---

## 🚀 **Deployment Options**

### **Local Development**
```bash
# Quick start for development
./setup.sh  # Linux/Mac
./setup.bat # Windows
```

### **Docker Deployment**
```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d
```

### **Cloud Deployment**
- **AWS** - EC2 with Docker
- **Google Cloud** - Compute Engine
- **Azure** - Container Instances
- **DigitalOcean** - Droplets with Docker
- **Heroku** - Container deployment

### **Environment Variables for Production**

**Backend (.env.production):**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-domain.com
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
REDIS_URL=redis://your-redis-instance
```

**Frontend (.env.production):**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

---

## 🧪 **Testing**

### **Run Test Suite**
```bash
# Backend tests
cd backend
npm run test:sync
npm run test:db

# Frontend tests
cd frontend
npm run test
```

### **Health Checks**
```bash
# Check backend health
curl http://localhost:5000/health

# Check database connection
npm run health
```

---

## 📊 **Performance & Monitoring**

### **Performance Optimizations**
- **Redis Caching** - Fast data access
- **Compression** - Reduced bandwidth usage
- **CDN Integration** - Static asset delivery
- **Database Indexing** - Optimized queries
- **Lazy Loading** - On-demand resource loading

### **Monitoring**
- **Health Endpoints** - Service status monitoring
- **Error Logging** - Comprehensive error tracking
- **Performance Metrics** - Response time monitoring
- **Resource Usage** - Memory and CPU tracking

---

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** if applicable
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### **Development Guidelines**
- Follow the existing code style
- Add comments for complex logic
- Update documentation for new features
- Ensure all tests pass
- Test in multiple browsers

---

## 📝 **Changelog**

### **v2.0.0** - Current Version
- ✨ Added cloud terminal integration
- 🔄 Improved real-time collaboration
- 🛡️ Enhanced security features
- 📱 Better mobile responsiveness
- 🚀 Performance optimizations

### **v1.0.0** - Initial Release
- 🎉 Basic collaborative editing
- 📁 File and folder management
- 🔐 User authentication
- 💬 Real-time chat

---

## 🆘 **Troubleshooting**

### **Common Issues**

**1. MongoDB Connection Issues**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod
```

**2. Docker Container Issues**
```bash
# Check Docker status
docker ps

# Clean up containers
npm run cleanup
```

**3. Port Conflicts**
```bash
# Check port usage
lsof -i :5000
lsof -i :5173

# Kill processes using ports
npm run kill
```

**4. File Sync Issues**
```bash
# Test file synchronization
npm run test:sync

# Clear workspace
npm run clear-workspace
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=true npm start
```

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Monaco Editor** - Professional code editing
- **Socket.io** - Real-time communication
- **Docker** - Container orchestration
- **Firebase** - Authentication services
- **Tailwind CSS** - Utility-first styling

---

## 📞 **Support**

- **Documentation**: [Wiki](https://github.com/yourusername/collabhub/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/collabhub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/collabhub/discussions)
- **Email**: support@collabhub.com

---

## ⭐ **Star History**

If you find this project helpful, please give it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/collabhub&type=Date)](https://star-history.com/#yourusername/collabhub&Date)

---

**Made with ❤️ by the CollabHub Team** 