# Docker Setup Guide for CollabHub

## 🐳 **Simple Docker Deployment**

CollabHub can be easily deployed using Docker for consistent, portable deployment across different environments.

---

## 📋 **Prerequisites**

### System Requirements:
- **Docker** 20.0+ installed
- **Docker Compose** 2.0+ installed
- **4GB RAM** minimum
- **2GB disk space** for containers

### Check Docker Installation:
```bash
# Verify Docker is installed and running
docker --version
docker-compose --version

# Test Docker functionality
docker run hello-world
```

---

## 🚀 **Quick Start**

### **1. Production Deployment**
```bash
# Copy environment template
cp production.env.example .env.production

# Edit with your values
nano .env.production

# Deploy
docker-compose -f docker-compose.production.yml up -d
```

### **2. Development Setup**
```bash
# Start development containers
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 🔧 **Configuration**

### **Environment Variables (.env.production)**
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/collabhub

# Security
JWT_SECRET=your-super-secure-secret-key

# Application
NODE_ENV=production
PORT=5000
```

---

## 📊 **Container Management**

### **Common Commands**
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Update containers
docker-compose pull
docker-compose up -d
```

### **Health Checks**
```bash
# Check application health
curl http://localhost:5000/health

# Check container status
docker-compose ps
```

---

## 🛡️ **Security Features**

### **Container Security:**
- Non-root user execution
- Read-only filesystem where possible
- Resource limits (CPU/memory)
- Network isolation
- No privileged containers

### **Application Security:**
- File upload validation
- Path sanitization
- Access control
- Environment isolation

---

## 🐞 **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process (replace PID)
kill -9 PID

# Or use different ports in docker-compose.yml
```

#### **2. Database Connection Issues**
```bash
# Check environment variables
docker-compose exec backend env | grep MONGODB

# Test database connectivity
docker-compose exec backend node quick-db-test.js
```

#### **3. Container Won't Start**
```bash
# Check logs for errors
docker-compose logs backend

# Check disk space
df -h

# Clean up old containers
docker system prune
```

#### **4. File Permission Issues**
```bash
# Fix workspace permissions
sudo chown -R $(id -u):$(id -g) ./backend/workspaces
```

---

## 📈 **Performance Tuning**

### **Resource Limits**
```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

### **Volume Optimization**
```bash
# Use named volumes for better performance
volumes:
  node_modules_cache:
    driver: local
```

---

## 🔄 **Updates & Maintenance**

### **Regular Updates**
```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d

# Clean up old images
docker image prune
```

### **Backup Strategy**
```bash
# Backup application data
tar -czf backup-$(date +%Y%m%d).tar.gz ./backend/workspaces

# Backup database (if using local MongoDB)
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)
```

---

## 🎯 **Production Checklist**

Before deploying to production:

- [ ] **Environment Variables**: All secrets properly configured
- [ ] **Database**: Production MongoDB URI set
- [ ] **Security**: JWT_SECRET is strong and unique
- [ ] **Monitoring**: Health check endpoints working
- [ ] **Backup**: Backup strategy implemented
- [ ] **Logs**: Log aggregation configured
- [ ] **Resources**: Appropriate limits set
- [ ] **Network**: Firewall rules configured

---

## 📚 **Additional Resources**

### **Docker Commands Reference**
```bash
# Container inspection
docker inspect <container_name>

# Execute commands in container
docker-compose exec backend /bin/bash

# Copy files to/from container
docker cp local_file container_name:/path/to/destination
```

### **Monitoring**
```bash
# Resource usage
docker stats

# Container processes
docker-compose top
```

Your CollabHub is now ready for Docker deployment! 🚀 