# 🚀 CollabHub Cloud Terminal - Production Guide

## ✨ **What You Get**

A **production-grade cloud terminal** that runs completely in Docker containers - no local system dependencies required!

### **🎯 Features**
- ✅ **Real bash/zsh terminal** with full functionality
- ✅ **Multi-language support** - Node.js, Python, Java, Go, Rust, C/C++
- ✅ **Cloud containers** - Isolated Docker environments per user
- ✅ **Persistent volumes** - Files retained between sessions
- ✅ **Secure isolation** - Each user gets their own container
- ✅ **Real-time output** - Live command execution
- ✅ **Full app creation** - `create-react-app`, `npm init`, etc.
- ✅ **Package installation** - Install dependencies inside containers

---

## 🏗️ **Setup & Installation**

### **1. Build Terminal Environment**
```bash
# Linux/Mac
cd CollabHub/backend
npm run terminal:build

# Windows
npm run terminal:build:win
```

### **2. Start Backend**
```bash
npm start
```

### **3. Access Terminal**
- Open your CollabHub editor
- Click the **terminal icon** in the top bar
- Wait for container initialization
- Start coding! 🎉

---

## 🔧 **Available Languages & Tools**

### **Frontend Development**
```bash
# Create React app
npx create-react-app my-app
cd my-app && npm start

# Create Vite React app  
npm create vite@latest my-vite-app -- --template react
cd my-vite-app && npm install && npm run dev

# Create Vue app
npm create vue@latest my-vue-app
```

### **Backend Development**
```bash
# Express API
mkdir my-api && cd my-api
npm init -y
npm install express cors helmet
npm install -D nodemon

# Python Flask
mkdir my-flask-app && cd my-flask-app
python -m venv venv
source venv/bin/activate
pip install flask requests
```

### **Systems Programming**
```bash
# Go application
mkdir my-go-app && cd my-go-app
go mod init my-go-app
echo 'package main
import "fmt"
func main() { fmt.Println("Hello from Go!") }' > main.go
go run main.go

# Rust application
cargo new my-rust-app --bin
cd my-rust-app
cargo run

# C++ application
echo '#include <iostream>
int main() { 
    std::cout << "Hello from C++!" << std::endl; 
    return 0; 
}' > hello.cpp
g++ hello.cpp -o hello && ./hello
```

### **Java Development**
```bash
# Create Java project
mkdir my-java-app && cd my-java-app
mvn archetype:generate -DgroupId=com.example -DartifactId=my-app
cd my-app
mvn compile exec:java
```

---

## 🎮 **Built-in Helper Commands**

The terminal comes with convenient helpers:

```bash
# Quick project creation
create-react <name>      # Create React app
create-vite <name>       # Create Vite React app  
create-express <name>    # Create Express API
create-python <name>     # Create Python Flask app

# Git setup
git-setup               # Configure Git credentials

# Development servers
npm run dev             # Start dev server
python -m http.server   # Python HTTP server
serve .                 # Serve static files
```

---

## 🔒 **Security Features**

### **Container Isolation**
- Each user gets a **separate Docker container**
- **No access** to host system or other users
- **Resource limits** (512MB RAM, 0.5 CPU)
- **Automatic cleanup** after 30 minutes of inactivity

### **Network Security**
- Containers run in **isolated bridge network**
- **No privileged access** to host system
- **Secure file mounting** only for project workspace

### **File System Security**
- **Read/write access** only to user's workspace
- **No system directory access** (`/etc`, `/var`, etc.)
- **Automatic file persistence** in project directory

---

## 🚀 **Production Deployment**

### **Environment Variables**
```env
# .env.production
DOCKER_HOST=unix:///var/run/docker.sock
TERMINAL_SESSION_TIMEOUT=1800000  # 30 minutes
TERMINAL_MEMORY_LIMIT=536870912   # 512MB
TERMINAL_CPU_SHARES=512
```

### **Docker Compose Production**
```yaml
version: '3.8'
services:
  backend:
    build: .
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./workspaces:/app/workspaces
    environment:
      - NODE_ENV=production
```

### **Resource Monitoring**
```bash
# Check active containers
docker ps --filter "ancestor=collabhub-dev-env"

# Monitor resource usage
docker stats --filter "ancestor=collabhub-dev-env"

# View terminal logs
docker logs <container-id>
```

---

## 🐞 **Troubleshooting**

### **Terminal Won't Start**
```bash
# 1. Check Docker is running
docker info

# 2. Check terminal image exists
docker images collabhub-dev-env

# 3. Rebuild if needed
npm run terminal:build

# 4. Check backend logs
npm start
```

### **Container Issues**
```bash
# Clean up stuck containers
docker container prune

# Remove terminal image and rebuild
docker rmi collabhub-dev-env:latest
npm run terminal:build
```

### **Permission Issues**
```bash
# Fix workspace permissions
sudo chown -R $(id -u):$(id -g) ./workspaces

# For Windows (run as Administrator)
takeown /f workspaces /r /d y
```

---

## 🔧 **Advanced Configuration**

### **Custom Language Support**
Modify `Dockerfile.terminal` to add more languages:
```dockerfile
# Add PHP
RUN apt-get update && apt-get install -y php php-cli

# Add Ruby  
RUN apt-get update && apt-get install -y ruby ruby-dev

# Add .NET
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && apt-get update && apt-get install -y dotnet-sdk-8.0
```

### **Performance Tuning**
```javascript
// In cloudTerminal.js - adjust limits
const container = await this.docker.createContainer({
  HostConfig: {
    Memory: 1024 * 1024 * 1024,  // 1GB instead of 512MB
    CpuShares: 1024,             // More CPU
    NetworkMode: 'bridge'
  }
});
```

### **Custom Terminal Theme**
Modify `CloudTerminal.jsx` terminal theme:
```javascript
const terminal = new Terminal({
  theme: {
    background: '#1e1e1e',    // VS Code dark
    foreground: '#d4d4d4',
    cursor: '#569cd6',
    // ... custom colors
  }
});
```

---

## 📊 **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Docker Engine  │
│   React+xterm   │◄──►│  Socket.IO      │◄──►│   Containers    │
│   CloudTerminal │    │  cloudTerminal  │    │  (User Envs)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │    │   Session Mgmt  │    │  File Volumes   │
│   Commands      │    │   Docker API    │    │  Persistence    │
│   Real-time     │    │   Container     │    │  Isolation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎉 **Success Examples**

### **React Development**
```bash
terminal@collabhub:~$ npx create-react-app my-awesome-app
terminal@collabhub:~$ cd my-awesome-app
terminal@collabhub:~/my-awesome-app$ npm start
```

### **Full-Stack Development**
```bash
# Backend
terminal@collabhub:~$ mkdir my-fullstack && cd my-fullstack
terminal@collabhub:~/my-fullstack$ mkdir api && cd api
terminal@collabhub:~/my-fullstack/api$ npm init -y
terminal@collabhub:~/my-fullstack/api$ npm install express

# Frontend  
terminal@collabhub:~/my-fullstack$ npx create-vite@latest frontend -- --template react
terminal@collabhub:~/my-fullstack$ cd frontend && npm install
```

### **Multi-Language Project**
```bash
terminal@collabhub:~$ mkdir polyglot-project && cd polyglot-project

# Node.js API
terminal@collabhub:~/polyglot-project$ mkdir api && cd api
terminal@collabhub:~/polyglot-project/api$ npm init -y

# Python Data Processing
terminal@collabhub:~/polyglot-project$ mkdir data && cd data  
terminal@collabhub:~/polyglot-project/data$ python -m venv venv
terminal@collabhub:~/polyglot-project/data$ source venv/bin/activate
terminal@collabhub:~/polyglot-project/data$ pip install pandas numpy

# Go Microservice
terminal@collabhub:~/polyglot-project$ mkdir service && cd service
terminal@collabhub:~/polyglot-project/service$ go mod init polyglot-service
```

---

## 🏆 **What You've Achieved**

✅ **Enterprise-grade cloud terminal** running in Docker  
✅ **Multi-language development environment** ready  
✅ **Secure, isolated containers** per user session  
✅ **Persistent file storage** across sessions  
✅ **Production-ready deployment** configuration  
✅ **Real-time collaborative coding** environment  

**Your CollabHub now rivals GitHub Codespaces and Replit!** 🚀 