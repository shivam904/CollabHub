import Docker from 'dockerode';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import tar from 'tar-stream';
import net from 'net';
import { getDockerWorkspaceManager } from './dockerWorkspace.js';
import terminalFileWatcher from './terminalFileWatcher.js';

class CloudTerminalManager {
  constructor() {
    this.docker = new Docker();
    this.containers = new Map();
    this.sessions = new Map();
    this.imageName = 'collabhub-dev-env';
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxSessions = 50; // Maximum concurrent sessions
    
    this.init();
  }

  async init() {
    try {
      // Check Docker availability
      await this.docker.ping();
      
      // Clean up any conflicting containers
      await this.cleanupConflictingContainers();
      
      // Ensure our development image exists
      await this.ensureDevImage(false);
      
      // Start cleanup interval
      this.startCleanupInterval();
    } catch (error) {
      console.error('❌ Docker initialization failed:', error.message);
    }
  }

  // Create comprehensive development image
  async ensureDevImage(forceRebuild = false) {
    try {
      const images = await this.docker.listImages();
      const imageExists = images.some(img => 
        img.RepoTags && img.RepoTags.includes(`${this.imageName}:latest`)
      );

      if (!imageExists) {
        await this.buildDevImage();
      } else if (forceRebuild) {
        await this.buildDevImage();
      }
    } catch (error) {
      console.error('❌ Failed to ensure dev image:', error.message);
    }
  }

  // Build comprehensive development image
  async buildDevImage() {
    const dockerfile = `
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Update and install system dependencies
RUN apt-get update && apt-get install -y \\
    curl wget git vim nano htop tree unzip zip \\
    build-essential software-properties-common \\
    ca-certificates gnupg lsb-release sudo \\
    ncurses-base ncurses-term terminfo \\
    bash-completion less man-db \\
    python3 python3-pip python3-venv python3-dev \\
    openjdk-17-jdk openjdk-17-jre \\
    nodejs npm \\
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \\
    && apt-get install -y nodejs

# Install Go 1.21
RUN wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz \\
    && tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz \\
    && rm go1.21.5.linux-amd64.tar.gz

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Install PHP
RUN apt-get update && apt-get install -y \\
    php php-cli php-fpm php-mysql php-pgsql php-sqlite3 \\
    php-gd php-mbstring php-xml php-curl php-zip \\
    && rm -rf /var/lib/apt/lists/*

# Install Ruby
RUN apt-get update && apt-get install -y \\
    ruby ruby-dev ruby-bundler \\
    && rm -rf /var/lib/apt/lists/*

# Install additional development tools
RUN apt-get update && apt-get install -y \\
    gcc g++ make cmake \\
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /workspace/project

# Create a non-root user
RUN useradd -m -s /bin/bash developer && \\
    usermod -aG sudo developer && \\
    echo 'developer ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Set up environment
ENV PATH="/usr/local/go/bin:/home/developer/.cargo/bin:$PATH"
ENV GOPATH="/home/developer/go"
ENV GOROOT="/usr/local/go"

# Switch to developer user
USER developer

# Set up shell environment
RUN echo 'export PATH="/usr/local/go/bin:/home/developer/.cargo/bin:$PATH"' >> ~/.bashrc && \\
    echo 'export GOPATH="/home/developer/go"' >> ~/.bashrc && \\
    echo 'export GOROOT="/usr/local/go"' >> ~/.bashrc

# Expose common development ports (avoiding frontend port 3000 and backend port 5000)
EXPOSE 4000 4001 4002 4003 4004 6000 6001 6002

# Default command
CMD ["/bin/bash", "-l"]
`;

    try {
      const res = await this.docker.buildImage(
        tar.pack(),
        {
          t: `${this.imageName}:latest`,
          dockerfile: dockerfile
        }
      );

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(res, (err, res) => {
          if (err) {
            console.error('❌ Docker build failed:', err);
            reject(err);
            return;
          }
          resolve(res);
        }, (event) => {
          if (event.error) {
            console.error('❌ Build error:', event.error);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to build dev image:', error.message);
      throw error;
    }
  }

  // Check if a port is actually available on the host
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }

  // Get available ports dynamically
  async getAvailablePorts() {
    const usedPorts = new Set();
    
    // Get all running containers and their port bindings
    try {
      const containers = await this.docker.listContainers();
      for (const container of containers) {
        if (container.Ports) {
          for (const port of container.Ports) {
            if (port.IP && port.PublicPort) {
              usedPorts.add(port.PublicPort);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not check existing container ports:', error.message);
    }

    // Find available ports in ranges (avoiding common ports: 3000, 5000, 8080, 9000)
    const portRanges = [
      { start: 4001, end: 4020 },
      { start: 6001, end: 6020 },
      { start: 7001, end: 7020 },
      { start: 8001, end: 8079 }, // Avoid 8080
      { start: 8081, end: 8099 }, // Skip 8080
      { start: 9001, end: 9020 }  // Avoid 9000
    ];

    const availablePorts = [];
    for (const range of portRanges) {
      for (let port = range.start; port <= range.end; port++) {
        if (!usedPorts.has(port)) {
          // Actually test if the port is available on the host
          const isAvailable = await this.isPortAvailable(port);
          if (isAvailable) {
            availablePorts.push(port);
            if (availablePorts.length >= 10) {
              break;
            }
          }
        }
      }
      if (availablePorts.length >= 10) {
        break;
      }
    }

    console.log(`🔌 Found ${availablePorts.length} available ports: ${availablePorts.slice(0, 5).join(', ')}...`);
    return availablePorts;
  }

  // Create terminal session
  async createSession(sessionId, userId, projectId, terminalSize = { cols: 80, rows: 24 }) {
    try {
      console.log(`🚀 Creating terminal session: ${sessionId} for project: ${projectId}`);
      
      // Check session limit
      if (this.sessions.size >= this.maxSessions) {
        throw new Error('Maximum session limit reached');
      }

      // Check if session already exists
      if (this.sessions.has(sessionId)) {
        console.log(`📋 Session ${sessionId} already exists, returning existing session`);
        return this.sessions.get(sessionId);
      }

      // Get available ports
      const availablePorts = await this.getAvailablePorts();
      if (availablePorts.length < 5) {
        throw new Error('Insufficient available ports');
      }

      // Ensure Docker workspace exists for this project
      console.log(`🖥️ Initializing terminal for project: ${projectId}`);
      const dockerManager = getDockerWorkspaceManager();
      
      try {
        await dockerManager.getProjectContainer(projectId);
        console.log(`✅ Docker workspace ready for terminal connection`);
        
        // Sync all project data to workspace before terminal access
        console.log(`🔄 Syncing project data to workspace...`);
        await dockerManager.syncProjectToWorkspace(projectId);
        console.log(`✅ Project data synchronized to workspace`);
        
      } catch (workspaceError) {
        console.warn(`⚠️ Docker workspace not available: ${workspaceError.message}`);
        console.log(`💡 Creating terminal without workspace sync - files may not be available`);
      }

      // Create container with comprehensive port mapping
      const container = await this.docker.createContainer({
          Image: `${this.imageName}:latest`,
        name: `terminal-${sessionId}-${Date.now()}`,
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
            Tty: true,
            OpenStdin: true,
            StdinOnce: false,
            Env: [
          'TERM=xterm-256color',
              `COLUMNS=${terminalSize.cols}`,
              `LINES=${terminalSize.rows}`,
          'DEBIAN_FRONTEND=noninteractive',
          'PS1=\\u@\\h:\\w\\$ ',
          'HISTFILE=/workspace/.bash_history',
          'HISTSIZE=1000',
          'HISTFILESIZE=2000',
          'PYTHONUNBUFFERED=1',
          'PYTHONIOENCODING=utf-8',
          'PYTHONDONTWRITEBYTECODE=1',
          'PYTHONHASHSEED=0',
          'PYTHONPATH=/workspace'
            ],
            WorkingDir: '/workspace',
            HostConfig: {
          AutoRemove: false,
          PortBindings: {
            '4000/tcp': [{ HostPort: availablePorts[0].toString() }],
            '4001/tcp': [{ HostPort: availablePorts[1].toString() }],
            '4002/tcp': [{ HostPort: availablePorts[2].toString() }],
            '4003/tcp': [{ HostPort: availablePorts[3].toString() }],
            '4004/tcp': [{ HostPort: availablePorts[4].toString() }],
            '6000/tcp': [{ HostPort: availablePorts[5].toString() }],
            '6001/tcp': [{ HostPort: availablePorts[6].toString() }],
            '6002/tcp': [{ HostPort: availablePorts[7].toString() }]
          },
          Binds: [
            `collabhub-project-${projectId}:/workspace:rw`
          ],
          Memory: 2 * 1024 * 1024 * 1024, // 2GB
          MemorySwap: 4 * 1024 * 1024 * 1024, // 4GB swap
              CpuShares: 512,
          CpuPeriod: 100000,
          CpuQuota: 50000
        },
        WorkingDir: '/workspace',
        Cmd: ['/bin/bash', '-i', '-l']
      });

      // Start container with retry mechanism
      let containerStarted = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!containerStarted && retryCount < maxRetries) {
        try {
          console.log(`🔄 Starting container (attempt ${retryCount + 1}/${maxRetries})...`);
          await container.start();
          containerStarted = true;
          console.log(`✅ Container started successfully`);
        } catch (startError) {
          retryCount++;
          console.warn(`⚠️ Container start attempt ${retryCount} failed: ${startError.message}`);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to start container after ${maxRetries} attempts: ${startError.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Verify container is running
      try {
        const containerInfo = await container.inspect();
        if (!containerInfo.State.Running) {
          throw new Error('Container started but is not running');
        }
        console.log(`✅ Container verified as running`);
      } catch (inspectError) {
        console.error(`❌ Container inspection failed: ${inspectError.message}`);
        throw new Error(`Container verification failed: ${inspectError.message}`);
      }

      // Set up Python cache clearing utilities
      try {
        console.log(`🐍 Setting up Python cache clearing utilities...`);
        
        // Create a Python runner that clears cache using Docker exec
        const createPyrunExec = await container.exec({
          Cmd: ['sh', '-c', `cat > /usr/local/bin/pyrun << 'EOF'
#!/bin/bash
# Clear Python cache and run script fresh
if [ -f "$1" ]; then
    # Remove any .pyc files
    find "$(dirname "$1")" -name "*.pyc" -delete 2>/dev/null || true
    find "$(dirname "$1")" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    # Run with fresh interpreter
    python3 -B "$@"
else
    echo "File not found: $1"
fi
EOF`],
          AttachStdout: true,
          AttachStderr: true
        });
        await createPyrunExec.start();
        
        const chmodExec = await container.exec({
          Cmd: ['chmod', '+x', '/usr/bin/python3'],
          AttachStdout: true,
          AttachStderr: true
        });
        await chmodExec.start();
        
        // Add alias to bashrc for convenience
        const aliasExec = await container.exec({
          Cmd: ['sh', '-c', 'echo "alias py-fresh=pyrun" >> ~/.bashrc'],
          AttachStdout: true,
          AttachStderr: true
        });
        await aliasExec.start();
        
        console.log(`✅ Python cache clearing utilities installed`);
        
      } catch (pythonSetupError) {
        console.warn(`⚠️ Failed to set up Python utilities: ${pythonSetupError.message}`);
      }

      // Store session info
      const sessionInfo = {
        id: sessionId,
        userId,
        projectId,
        containerId: container.id,
        container,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        ports: availablePorts.slice(0, 8),
        terminalSize
      };

      this.sessions.set(sessionId, sessionInfo);
      this.containers.set(container.id, sessionInfo);

      return sessionInfo;
    } catch (error) {
      console.error(`❌ Failed to create session ${sessionId}:`, error.message);
      throw error;
    }
  }

  // Execute command in terminal
  async executeCommand(sessionId, command) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();

    try {
      const exec = await session.container.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['/bin/bash', '-c', command]
      });

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        exec.start({ hijack: true, stdin: false }, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          stream.on('data', (chunk) => {
            // Docker exec returns data with stream type prefix
            // chunk[0] = 1 for stdout, chunk[0] = 2 for stderr
            const data = chunk.toString();
            
            if (chunk[0] === 1) { // stdout
              stdout += data.slice(8); // Remove the 8-byte header
            } else if (chunk[0] === 2) { // stderr
              stderr += data.slice(8); // Remove the 8-byte header
            } else {
              // Fallback for non-stream data
              stdout += data;
            }
          });

          stream.on('end', () => {
            // Combine stdout and stderr, but prioritize stdout
            const output = stdout + (stderr ? '\n' + stderr : '');
            resolve(output);
          });

          stream.on('error', (err) => {
            reject(err);
          });
        });
      });
    } catch (error) {
      console.error(`❌ Command execution failed:`, error.message);
      throw error;
    }
  }

  // Attach to shell
  async attachToShell(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();

    try {
      const exec = await session.container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ['/bin/bash', '-i', '-l']
      });

      return exec;
    } catch (error) {
      console.error(`❌ Shell attachment failed:`, error.message);
      throw error;
    }
  }

  // Resize terminal
  async resizeTerminal(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();
    session.terminalSize = { cols, rows };

    try {
      // Update container environment
      await session.container.update({
        Env: [
          'TERM=xterm',
          `COLUMNS=${cols}`,
          `LINES=${rows}`,
          'DEBIAN_FRONTEND=noninteractive'
        ]
      });

    } catch (error) {
      console.error(`❌ Terminal resize failed:`, error.message);
      throw error;
    }
  }

  // Get session info
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`);
      console.log(`📊 Available sessions: ${Array.from(this.sessions.keys()).join(', ')}`);
      throw new Error(`Terminal session not found for ID: ${sessionId}`);
    }
    
    // Verify container is still running
    try {
      if (!session.container) {
        throw new Error('Container reference is null');
      }
    } catch (error) {
      console.error(`❌ Container validation failed for session ${sessionId}: ${error.message}`);
      // Remove invalid session
      this.sessions.delete(sessionId);
      throw new Error(`Terminal container not found for ID: ${sessionId}`);
    }
    
    return session;
  }

  // Destroy session
  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      // Stop and remove container
          await session.container.stop();
          await session.container.remove();

      // Clean up session data
      this.sessions.delete(sessionId);
      this.containers.delete(session.containerId);
    } catch (error) {
      console.error(`❌ Failed to destroy session ${sessionId}:`, error.message);
    }
  }

  // Cleanup old sessions
  startCleanupInterval() {
    setInterval(async () => {
      const now = Date.now();
      const sessionsToRemove = [];

      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivity > this.sessionTimeout) {
          sessionsToRemove.push(sessionId);
        }
      }

      for (const sessionId of sessionsToRemove) {
        await this.destroySession(sessionId);
      }
    }, 60000); // Check every minute
  }

  // Get active sessions
  getActiveSessions() {
    return Array.from(this.sessions.values());
  }

  // Health check
  async healthCheck() {
    try {
      await this.docker.ping();
      return {
        healthy: true,
        activeSessions: this.sessions.size,
        maxSessions: this.maxSessions,
        dockerConnected: true
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        activeSessions: this.sessions.size,
        maxSessions: this.maxSessions,
        dockerConnected: false
      };
    }
  }

  // Check if a command is likely to create files
  isFileCreationCommand(command) {
    const fileCreationPatterns = [
      /^touch\s+/i,           // touch command
      /^echo\s+.*\s*>\s*\S+/i, // echo > file
      /^cat\s+.*\s*>\s*\S+/i,  // cat > file
      /^mkdir\s+/i,           // mkdir command
      /^cp\s+/i,              // copy command
      /^mv\s+/i,              // move command
      /^wget\s+/i,            // wget download
      /^curl\s+.*\s*-o\s+/i,  // curl with output
      /^git\s+clone/i,        // git clone
      /^npm\s+init/i,         // npm init
      /^yarn\s+init/i,        // yarn init
      /^npx\s+create-/i,      // npx create commands
      /^python\s+-m\s+venv/i, // python virtual env
      /^go\s+mod\s+init/i,    // go mod init
      /^cargo\s+init/i,       // cargo init
      /^composer\s+init/i,    // composer init
      /^bundle\s+init/i,      // bundle init
      /^>.*\.\w+$/i,          // redirect to file
      /^>>.*\.\w+$/i,         // append to file
    ];
    
    return fileCreationPatterns.some(pattern => pattern.test(command.trim()));
  }

  // Force rebuild image
  async forceRebuildImage() {
    try {
      await this.buildDevImage();
    } catch (error) {
      console.error('❌ Image rebuild failed:', error.message);
      throw error;
    }
  }

  // Manual rebuild
  async manualRebuild() {
    try {
      // Remove existing image
      const images = await this.docker.listImages();
      const existingImage = images.find(img => 
        img.RepoTags && img.RepoTags.includes(`${this.imageName}:latest`)
      );

      if (existingImage) {
        await this.docker.getImage(existingImage.Id).remove();
      }

      // Build new image
      await this.buildDevImage();
    } catch (error) {
      console.error('❌ Manual rebuild failed:', error.message);
      throw error;
    }
  }

  // Clean up conflicting containers
  async cleanupConflictingContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true });
      let cleanedCount = 0;
      
      for (const containerInfo of containers) {
        if (containerInfo.Names && containerInfo.Names.some(name => 
          name.includes('terminal-') && containerInfo.State !== 'running'
        )) {
          try {
            const container = this.docker.getContainer(containerInfo.Id);
            await container.remove();
            cleanedCount++;
          } catch (error) {
            console.warn(`⚠️ Could not remove container ${containerInfo.Id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not cleanup conflicting containers:', error.message);
    }
  }
}

// Create singleton instance
const cloudTerminalManager = new CloudTerminalManager();

// Socket.IO handlers
export const setupCloudTerminalHandlers = (io) => {
  io.on('connection', (socket) => {

    // Handle terminal initialization (matches frontend 'terminal:init' event)
    socket.on('terminal:init', async (data) => {
      try {
        const { userId, projectId, terminalId, cols, rows } = data;
        const sessionId = `${userId}-${projectId}-${terminalId}`;
        
        const session = await cloudTerminalManager.createSession(
          sessionId, 
          userId, 
          projectId, 
          { cols: cols || 80, rows: rows || 24 }
        );
        
        // Start interactive shell session
        const exec = await cloudTerminalManager.attachToShell(sessionId);
        
        // Start the interactive shell
        exec.start({ hijack: true, stdin: true }, (err, stream) => {
          if (err) {
            console.error('❌ Failed to start interactive shell:', err);
            socket.emit('terminal:error', {
              error: 'Failed to start interactive shell',
              success: false
            });
            return;
          }
          
          // Store the stream for this session
          session.shellStream = stream;
          
          // Handle shell output with proper Docker exec stream handling
          stream.on('data', (chunk) => {
            // Docker exec returns data with stream type prefix
            // chunk[0] = 1 for stdout, chunk[0] = 2 for stderr
            let output = '';
            
            if (chunk[0] === 1 || chunk[0] === 2) {
              // Remove the 8-byte header for stream data
              output = chunk.toString().slice(8);
            } else {
              // Fallback for non-stream data
              output = chunk.toString();
            }
            
            if (output) {
              console.log(`📤 Sending terminal output: ${output.substring(0, 100)}...`);
              socket.emit('terminal:output', {
                sessionId,
                terminalId: session.currentTerminalId || terminalId,
                output: output,
                success: true
              });
            }
          });
          
          // Handle shell end
          stream.on('end', () => {
            // Shell session ended
          });
          
          // Handle shell errors
          stream.on('error', (err) => {
            console.error(`❌ Shell stream error for ${sessionId}:`, err);
            socket.emit('terminal:error', {
              error: 'Shell stream error',
              success: false
            });
          });
        });
        
        socket.emit('terminal:ready', {
          sessionId,
          terminalId,
          containerId: session.containerId,
          workingDir: '/workspace/project',
          languages: ['Node.js', 'Python', 'Java', 'Go', 'Rust', 'PHP', 'Ruby'],
          success: true
        });
        
        // Start file system watcher for this project to detect terminal file changes
        try {
          const project = await import('../models/Project.js').then(m => m.default.findById(projectId));
          if (project) {
            const watcherStarted = await terminalFileWatcher.startWatching(projectId, project.owner || project.creatorId);
            if (watcherStarted) {
              console.log(`🔍 File watcher started for terminal session: ${sessionId}`);
            }
          }
        } catch (watcherError) {
          console.warn(`⚠️ Failed to start file watcher for project ${projectId}: ${watcherError.message}`);
        }
        
        console.log(`✅ Terminal session initialized: ${sessionId}`);
      } catch (error) {
        console.error('❌ Terminal initialization failed:', error.message);
        socket.emit('terminal:error', {
          error: error.message,
          success: false
        });
      }
    });

    // Handle terminal input (matches frontend 'terminal:input' event)
    socket.on('terminal:input', async (data) => {
      try {
        const { sessionId, terminalId, data: inputData } = data;
        
        if (!sessionId) {
          throw new Error('Session ID required');
        }
        
        const session = cloudTerminalManager.getSession(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Check if this is a file creation command
        const isFileCreationCommand = cloudTerminalManager.isFileCreationCommand(inputData);
        
        // Write directly to shell stream if available
        if (session.shellStream) {
          // Store the terminalId for this session so we can use it in output
          session.currentTerminalId = terminalId;
          session.shellStream.write(inputData);
          
          // If it's a file creation command, trigger immediate file sync after a short delay
          if (isFileCreationCommand && session.projectId) {
            setTimeout(async () => {
              try {
                console.log(`🔄 Triggering immediate file sync after file creation command`);
                await terminalFileWatcher.forcSync(session.projectId, session.userId);
              } catch (syncError) {
                console.warn(`⚠️ Immediate file sync failed: ${syncError.message}`);
              }
            }, 1000); // Wait 1 second for file to be created
          }
        } else {
          // Fallback to executeCommand if no shell stream
          const output = await cloudTerminalManager.executeCommand(sessionId, inputData);
          socket.emit('terminal:output', {
            sessionId,
            terminalId,
            output,
            success: true
          });
          
          // If it's a file creation command, trigger immediate file sync
          if (isFileCreationCommand && session.projectId) {
            try {
              console.log(`🔄 Triggering immediate file sync after file creation command`);
              await terminalFileWatcher.forcSync(session.projectId, session.userId);
            } catch (syncError) {
              console.warn(`⚠️ Immediate file sync failed: ${syncError.message}`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Terminal input failed:', error.message);
        socket.emit('terminal:error', {
          error: error.message,
          success: false
        });
      }
    });

    // Handle terminal resize (matches frontend 'terminal:resize' event)
    socket.on('terminal:resize', async (data) => {
      try {
        const { sessionId, terminalId, cols, rows } = data;
        
        if (!sessionId) {
          throw new Error('Session ID required');
        }
        
        await cloudTerminalManager.resizeTerminal(sessionId, cols, rows);
        
        socket.emit('terminal:resized', {
          sessionId,
          terminalId,
          success: true
        });
      } catch (error) {
        console.error('❌ Terminal resize failed:', error.message);
        socket.emit('terminal:error', {
          error: error.message,
          success: false
        });
      }
    });

    // Create terminal session
    socket.on('create-terminal', async (data) => {
      try {
        const { userId, projectId, terminalSize } = data;
        const sessionId = `${userId}-${projectId}-${Date.now()}`;
        
        const session = await cloudTerminalManager.createSession(
          sessionId, 
          userId, 
          projectId, 
          terminalSize
        );
        
        socket.emit('terminal-created', {
          sessionId,
          ports: session.ports,
          success: true
        });
        
      } catch (error) {
        console.error('❌ Terminal creation failed:', error.message);
        socket.emit('terminal-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Execute command
    socket.on('execute-command', async (data) => {
      try {
        const { sessionId, command } = data;
        const output = await cloudTerminalManager.executeCommand(sessionId, command);
        
        socket.emit('command-output', {
          sessionId,
          output,
          success: true
        });
      } catch (error) {
        console.error('❌ Command execution failed:', error.message);
        socket.emit('command-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Attach to shell
    socket.on('attach-shell', async (data) => {
      try {
        const { sessionId } = data;
        const exec = await cloudTerminalManager.attachToShell(sessionId);
        
        socket.emit('shell-attached', {
          sessionId,
          success: true
        });
      } catch (error) {
        console.error('❌ Shell attachment failed:', error.message);
        socket.emit('shell-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Resize terminal
    socket.on('resize-terminal', async (data) => {
      try {
        const { sessionId, cols, rows } = data;
        await cloudTerminalManager.resizeTerminal(sessionId, cols, rows);
        
        socket.emit('terminal-resized', {
          sessionId,
          success: true
        });
      } catch (error) {
        console.error('❌ Terminal resize failed:', error.message);
        socket.emit('resize-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Destroy session
    socket.on('destroy-terminal', async (data) => {
      try {
        const { sessionId } = data;
        await cloudTerminalManager.destroySession(sessionId);
        
        socket.emit('terminal-destroyed', {
          sessionId,
          success: true
        });
        } catch (error) {
        console.error('❌ Terminal destruction failed:', error.message);
        socket.emit('destroy-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Health check
    socket.on('terminal-health', async () => {
      try {
        const health = await cloudTerminalManager.healthCheck();
        socket.emit('health-status', health);
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
        socket.emit('health-error', {
          error: error.message
        });
      }
    });

    // Rebuild image
    socket.on('rebuild-image', async () => {
      try {
        await cloudTerminalManager.forceRebuildImage();
        socket.emit('rebuild-complete', {
          success: true
          });
        } catch (error) {
        console.error('❌ Image rebuild failed:', error.message);
        socket.emit('rebuild-error', {
          error: error.message,
          success: false
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      // Terminal client disconnected
    });
  });
};

export default cloudTerminalManager; 