import Docker from 'dockerode';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DockerWorkspaceManager {
  constructor() {
    this.docker = new Docker();
    this.containers = new Map(); // projectId -> container info
    this.volumes = new Map(); // projectId -> volume name
  }

  /**
   * Create a Docker container workspace for a project
   */
  async createProjectWorkspace(projectId, projectName) {
    try {
      console.log(`🐳 Creating Docker workspace for project: ${projectName}`);
      
      const volumeName = `collabhub-project-${projectId}`;
      const containerName = `collabhub-workspace-${projectId}`;

      // Create Docker volumes for persistent storage and compilation
      try {
        // Main workspace volume
        await this.docker.createVolume({
          Name: volumeName,
          Driver: 'local'
        });
        console.log(`✅ Created Docker volume: ${volumeName}`);
        
        // Temporary compilation volume
        const tempVolumeName = `collabhub-tmp-${projectId}`;
        await this.docker.createVolume({
          Name: tempVolumeName,
          Driver: 'local'
        });
        console.log(`✅ Created Docker temp volume: ${tempVolumeName}`);
        
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log(`📁 Docker volumes already exist`);
      }

      let container;
      
      // Check if container with this name already exists
      try {
        const existingContainers = await this.docker.listContainers({ all: true });
        const existingContainer = existingContainers.find(c => 
          c.Names.includes(`/${containerName}`) || c.Names.includes(containerName)
        );

        if (existingContainer) {
          console.log(`📦 Found existing container: ${containerName}`);
          container = this.docker.getContainer(existingContainer.Id);
          
          // Check if it's running
          const containerData = await container.inspect();
          if (!containerData.State.Running) {
            console.log(`🔄 Starting existing container: ${containerName}`);
            await container.start();
          } else {
            console.log(`✅ Container already running: ${containerName}`);
          }
        } else {
          // Check for any containers with conflicting names and remove them
          try {
            const allContainers = await this.docker.listContainers({ all: true });
            const conflictingContainer = allContainers.find(c => 
              c.Names.some(name => name.includes(containerName))
            );
            
            if (conflictingContainer) {
              console.log(`🗑️ Removing conflicting container: ${conflictingContainer.Id}`);
              const oldContainer = this.docker.getContainer(conflictingContainer.Id);
              try {
                await oldContainer.stop();
              } catch (stopError) {
                console.log(`Container already stopped: ${stopError.message}`);
              }
              await oldContainer.remove();
            }
          } catch (cleanupError) {
            console.warn(`⚠️ Cleanup warning: ${cleanupError.message}`);
          }
          
          // Create new container with enhanced configuration for multi-language support
          console.log(`🆕 Creating new container: ${containerName}`);
          container = await this.docker.createContainer({
            Image: 'collabhub-workspace:latest',
            name: containerName,
            Cmd: ['tail', '-f', '/dev/null'], // Keep container running
            WorkingDir: '/workspace',
            User: 'root', // Run as root to allow compilation and execution
            Env: [
              'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
              'DEBIAN_FRONTEND=noninteractive',
              'LC_ALL=C.UTF-8',
              'LANG=C.UTF-8',
              'NPM_CONFIG_PREFIX=/usr/local',
              'NPM_CONFIG_CACHE=/tmp/.npm',
              'NODE_OPTIONS=--max-old-space-size=2048',
              `PROJECT_ID=${projectId}`
            ],
            Volumes: {
              '/workspace': {},
              '/tmp/collabhub': {} // Temporary compilation directory
            },
            HostConfig: {
              Binds: [
                `${volumeName}:/workspace:rw`,
                `collabhub-tmp-${projectId}:/tmp/collabhub:rw` // Dedicated temp volume for compilation
              ],
              AutoRemove: false,
              // Enhanced security while allowing compilation
              SecurityOpt: [
                'no-new-privileges:false' // Allow privilege escalation for compilation
              ],
              // Resource limits for safety
              Memory: 1024 * 1024 * 1024, // 1GB RAM
              MemorySwap: 2 * 1024 * 1024 * 1024, // 2GB swap
              CpuShares: 1024, // Normal CPU priority
              // Network isolation for security
              NetworkMode: 'none'
            },
            AttachStdout: false,
            AttachStderr: false,
            Tty: true
          });

          // Start the container
          await container.start();
          console.log(`🚀 Started new container: ${containerName}`);
        }
      } catch (createError) {
        console.error(`❌ Error managing container: ${createError.message}`);
        throw createError;
      }
      
      // Wait a moment for container to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Initialize workspace with comprehensive structure for multi-language development
      try {
        console.log(`🔧 Setting up multi-language development environment...`);
        
        // Create directory structure
        await this.executeInContainer(container, [
          'mkdir', '-p', 
          '/workspace/src',           // Source files
          '/workspace/public',        // Public assets
          '/workspace/assets',        // Project assets
          '/workspace/bin',           // Compiled binaries
          '/workspace/build',         // Build artifacts
          '/workspace/dist',          // Distribution files
          '/workspace/output',        // Program output
          '/tmp/collabhub',          // Temporary compilation directory
          '/tmp/collabhub/bin',      // Temporary binaries
          '/tmp/collabhub/build',    // Temporary build files
          '/tmp/.npm',               // npm cache directory
          '/root/.npm'               // npm home directory
        ]);

        // Set comprehensive write permissions for all directories
        await this.executeInContainer(container, [
          'chmod', '-R', '777', '/workspace', '/tmp/collabhub', '/tmp/.npm', '/root/.npm'
        ]);

        // Set additional permissions for system directories that might be needed
        await this.executeInContainer(container, [
          'chmod', '777', '/usr/local/lib/node_modules', '/usr/bin/node', '/usr/bin/npm', '/usr/bin/npx', '/usr/local/share'
        ]);

        // Ensure all workspace subdirectories have full permissions
        await this.executeInContainer(container, [
          'find', '/workspace', '-type', 'd', '-exec', 'chmod', '777', '{}', '+'
        ]);

        // Ensure all files in workspace are writable
        await this.executeInContainer(container, [
          'find', '/workspace', '-type', 'f', '-exec', 'chmod', '666', '{}', '+'
        ]);

        // Configure npm settings in container with full permissions
        await this.executeInContainer(container, [
          'npm', 'config', 'set', 'prefix', '/usr/local'
        ]);
        await this.executeInContainer(container, [
          'npm', 'config', 'set', 'cache', '/tmp/.npm'
        ]);
        // Note: unsafe-perm and user config are deprecated in newer npm versions, so we skip them

        // Set umask for all processes to ensure new files/directories are writable
        await this.executeInContainer(container, [
          'sh', '-c', 'echo "umask 000" >> /root/.bashrc'
        ]);

        // Create symlinks for common npm commands to ensure they work
        await this.executeInContainer(container, [
          'ln', '-sf', '/usr/local/bin/npx', '/usr/bin/npx'
        ]);

        // Ensure global npm packages directory exists and is writable
        await this.executeInContainer(container, [
          'mkdir', '-p', '/usr/local/lib/node_modules/.bin'
        ]);
        await this.executeInContainer(container, [
          'chmod', '-R', '777', '/usr/local/lib/node_modules'
        ]);

        // Create compilation helper scripts for different languages
        await this.setupCompilationEnvironment(container);
        
        console.log(`✅ Multi-language development environment initialized`);
        
      } catch (initError) {
        console.warn(`⚠️ Workspace initialization warning: ${initError.message}`);
        // Don't fail if directory creation fails (they might already exist)
      }

      // Store container info
      this.containers.set(projectId, {
        container,
        containerId: container.id,
        volumeName,
        containerName
      });

      this.volumes.set(projectId, volumeName);

      console.log(`✅ Docker workspace ready for project ${projectId}`);
      return { container, containerId: container.id, volumeName };

    } catch (error) {
      console.error(`❌ Failed to create Docker workspace for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get or create container for project
   */
  async getProjectContainer(projectId) {
    if (this.containers.has(projectId)) {
      const containerInfo = this.containers.get(projectId);
      
      // Check if container is still running
      try {
        const containerData = await containerInfo.container.inspect();
        if (containerData.State.Running) {
          return containerInfo;
        }
      } catch (error) {
        console.log(`Container for project ${projectId} not found, will recreate`);
      }
    }

    // Container doesn't exist or isn't running, create new one
    return await this.createProjectWorkspace(projectId, `project-${projectId}`);
  }

  /**
   * Write file content to Docker container
   */
  async writeFileToContainer(projectId, filePath, content) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Check if file already exists in container to prevent duplicates
      const fileExists = await this.executeInContainer(containerInfo.container, [
        'test', '-f', `/workspace/${filePath}`
      ]);
      
      if (fileExists && !fileExists.error) {
        console.log(`📄 File already exists in container: ${filePath}`);
        return true;
      }
      
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      if (dirPath !== '.') {
        await this.executeInContainer(containerInfo.container, [
          'mkdir', '-p', `/workspace/${dirPath}`
        ]);
      }

      // Use base64 encoding to safely handle all special characters
      // This method preserves ALL characters including symbols, unicode, etc.
      const base64Content = Buffer.from(content, 'utf8').toString('base64');
      
      console.log(`📝 Writing file to container: /workspace/${filePath}`);
      console.log(`📝 Content length: ${content.length} characters`);
      console.log(`🔐 Base64 encoded length: ${base64Content.length} characters`);
      
      // Write using base64 decode to preserve all characters
      await this.executeInContainer(containerInfo.container, [
        'sh', '-c', `echo '${base64Content}' | base64 -d > '/workspace/${filePath}'`
      ]);

      // Ensure the newly created file has write permissions
      await this.executeInContainer(containerInfo.container, [
        'chmod', '666', `/workspace/${filePath}`
      ]);

      // Ensure filesystem sync and verify the file was created
      try {
        // Force filesystem sync
        await this.executeInContainer(containerInfo.container, [
          'sync'
        ]);
        
        const verifyResult = await this.executeInContainer(containerInfo.container, [
          'ls', '-la', `/workspace/${filePath}`
        ]);
        console.log(`✅ File verified in Docker container: ${filePath}`);
        console.log(`📄 File details: ${verifyResult.output}`);
        
        // Verify content integrity by reading it back
        const contentCheck = await this.executeInContainer(containerInfo.container, [
          'head', '-c', '200', `/workspace/${filePath}`
        ]);
        console.log(`📖 File content preview: ${contentCheck.output}`);
        
        // Additional verification: check if content matches
        const fullContent = await this.readFileFromContainer(projectId, filePath);
        if (fullContent === content) {
          console.log(`✅ Content integrity verified - all symbols preserved`);
        } else {
          console.warn(`⚠️ Content mismatch detected - some characters may be lost`);
          console.log(`Original length: ${content.length}, Read length: ${fullContent?.length || 0}`);
        }
        
      } catch (verifyError) {
        console.warn(`⚠️ Could not verify file creation: ${verifyError.message}`);
      }

      return true;

    } catch (error) {
      console.error(`❌ Failed to write file to container:`, error);
      
      // Fallback: Log the action but don't fail the file save
      console.log(`📝 Fallback: File saved to database only (Docker unavailable)`);
      console.log(`📁 Project: ${projectId}, File: ${filePath}, Size: ${content.length} chars`);
      
      // Don't throw - let the file save succeed even if Docker fails
      return false;
    }
  }

  /**
   * Read file content from Docker container
   */
  async readFileFromContainer(projectId, filePath) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Use a completely different approach - use Node.js to read the file
      // This avoids all Docker exec issues by using a different execution method
      const nodeScript = `
const fs = require('fs');
const path = require('path');

const filePath = '/workspace/${filePath}';

try {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    process.stdout.write(content);
  } else {
    process.stderr.write('FILE_NOT_FOUND');
    process.exit(1);
  }
} catch (error) {
  process.stderr.write('ERROR: ' + error.message);
  process.exit(1);
}`;
      
      // Use a different execution method that doesn't rely on Docker exec
      return new Promise((resolve, reject) => {
        const options = {
          Cmd: ['node', '-e', nodeScript],
          AttachStdout: true,
          AttachStderr: true
        };

        containerInfo.container.exec(options, (err, exec) => {
          if (err) {
            console.error(`❌ Docker exec error:`, err);
            return reject(err);
          }

          exec.start({ hijack: true, stdin: false }, (err, stream) => {
            if (err) {
              console.error(`❌ Docker exec start error:`, err);
              return reject(err);
            }

            let output = '';
            let error = '';

            stream.on('data', (chunk) => {
              if (chunk.length > 0) {
                const streamType = chunk[0];
                const data = chunk.toString();
                
                if (streamType === 1) { // stdout
                  output += data.slice(8);
                } else if (streamType === 2) { // stderr
                  error += data.slice(8);
                } else {
                  output += data;
                }
              }
            });

            stream.on('end', () => {
              if (error && error.includes('FILE_NOT_FOUND')) {
                console.warn(`⚠️ File does not exist: ${filePath}`);
                resolve(null);
              } else if (error && error.trim()) {
                reject(new Error(error.trim()));
              } else {
                resolve(output.trim());
              }
            });

            stream.on('error', (err) => {
              console.error(`❌ Docker exec stream error:`, err);
              reject(err);
            });
          });
        });
      });

    } catch (error) {
      console.error(`❌ Failed to read file from container: ${filePath}`, error);
      return null;
    }
  }

  /**
   * List files in Docker container directory
   */
  async listFiles(projectId, directoryPath = '') {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      const result = await this.executeInContainer(containerInfo.container, [
        'find', `/workspace/${directoryPath}`, '-type', 'f'
      ]);

      const files = result.output
        .split('\n')
        .filter(file => file.trim())
        .map(file => file.replace('/workspace/', ''));

      return files;

    } catch (error) {
      console.error(`❌ Failed to list files in container:`, error);
      return [];
    }
  }

  /**
   * Delete file from Docker container
   */
  async deleteFileFromContainer(projectId, filePath) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Delete the file
      await this.executeInContainer(containerInfo.container, [
        'rm', '-f', `/workspace/${filePath}`
      ]);

      console.log(`✅ File deleted from Docker container: ${filePath}`);
      
      // Check if parent directory is now empty and remove if so
      const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null;
      if (dirPath) {
        try {
          // Check if directory is empty
          const result = await this.executeInContainer(containerInfo.container, [
            'find', `/workspace/${dirPath}`, '-maxdepth', '1', '-type', 'f'
          ]);
          
          // If no files found, remove the empty directory
          if (!result.output || result.output.trim() === '') {
            await this.executeInContainer(containerInfo.container, [
              'rmdir', `/workspace/${dirPath}`
            ]);
            console.log(`🗑️ Removed empty directory from container: ${dirPath}`);
          }
        } catch (dirError) {
          // Directory might not be empty or have subdirectories, which is fine
          console.log(`📁 Directory ${dirPath} not removed (may contain other files)`);
        }
      }
      
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete file from container:`, error);
      return false;
    }
  }

  /**
   * Delete folder from Docker container
   */
  async deleteFolderFromContainer(projectId, folderPath) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Remove the entire directory and its contents
      await this.executeInContainer(containerInfo.container, [
        'rm', '-rf', `/workspace/${folderPath}`
      ]);

      console.log(`✅ Folder deleted from Docker container: ${folderPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete folder from container:`, error);
      return false;
    }
  }



  /**
   * List files in Docker container directory with improved detection
   */
  async listFilesInContainer(projectId, directoryPath = '') {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Use a more robust find command that handles edge cases
      const findPath = directoryPath ? `/workspace/${directoryPath}` : '/workspace';
      
      const result = await this.executeInContainer(containerInfo.container, [
        'find', findPath, '-type', 'f', '-not', '-path', '*/node_modules/*', 
        '-not', '-path', '*/.git/*', '-not', '-path', '*/.tmp/*', 
        '-not', '-path', '*/.temp/*', '-printf', '%P\n'
      ]);

      if (!result.output) {
        return [];
      }

      const files = result.output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(file => {
          // Additional filtering for problematic files
          if (file.includes('\\') || file.match(/[<>:"|?*]/)) return false;
          if (file.startsWith('.') && !file.includes('/')) return false; // Skip hidden files in root
          if (file.endsWith('~') || file.endsWith('.tmp') || file.endsWith('.temp')) return false;
          return true;
        });

      return files;

    } catch (error) {
      console.warn(`⚠️ Failed to list files in container directory: ${directoryPath} - ${error.message}`);
      return [];
    }
  }

  /**
   * Create folder in Docker container with duplicate prevention
   */
  async createFolderInContainer(projectId, folderPath) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      // Check if folder already exists in container
      const folderExists = await this.executeInContainer(containerInfo.container, [
        'test', '-d', `/workspace/${folderPath}`
      ]);
      
      if (folderExists && !folderExists.error) {
        console.log(`📁 Folder already exists in container: ${folderPath}`);
        return true;
      }
      
      // Create folder with parent directories
      await this.executeInContainer(containerInfo.container, [
        'mkdir', '-p', `/workspace/${folderPath}`
      ]);

      // Ensure the newly created folder has full write permissions
      await this.executeInContainer(containerInfo.container, [
        'chmod', '777', `/workspace/${folderPath}`
      ]);

      console.log(`✅ Folder created in Docker container: ${folderPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to create folder in container:`, error);
      return false;
    }
  }

  /**
   * Setup compilation environment for multiple programming languages
   */
  async setupCompilationEnvironment(container) {
    try {
      console.log(`🛠️ Setting up compilation environments for multiple languages...`);

      // Create C/C++ compilation script
      const cppScript = `#!/bin/bash
# C/C++ Compilation and Execution Script
set -e

SOURCE_FILE="$1"
OUTPUT_NAME="$2"
COMPILE_TYPE="$3"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: compile-cpp <source-file> [output-name] [type]"
    echo "Types: cpp, c, debug, release"
    exit 1
fi

# Set default output name
if [ -z "$OUTPUT_NAME" ]; then
    OUTPUT_NAME="/tmp/collabhub/bin/\$(basename "\${SOURCE_FILE%.*}")"
fi

# Set compilation flags based on type
case "$COMPILE_TYPE" in
    "debug")
        FLAGS="-g -O0 -Wall -Wextra -std=c++17"
        ;;
    "release")
        FLAGS="-O2 -std=c++17"
        ;;
    "c")
        FLAGS="-std=c11 -Wall -Wextra"
        COMPILER="gcc"
        ;;
    *)
        FLAGS="-std=c++17 -Wall"
        COMPILER="g++"
        ;;
esac

# Compile
echo "🔧 Compiling \$SOURCE_FILE with \${COMPILER:-g++} \$FLAGS"
\${COMPILER:-g++} \$FLAGS "\$SOURCE_FILE" -o "\$OUTPUT_NAME"

echo "✅ Compilation successful: \$OUTPUT_NAME"
echo "🚀 To run: \$OUTPUT_NAME"
`;

      // Create Python execution script
      const pythonScript = `#!/bin/bash
# Python Execution Script
set -e

SOURCE_FILE="$1"
ARGS="\${@:2}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: run-python <source-file> [arguments...]"
    exit 1
fi

echo "🐍 Running Python: \$SOURCE_FILE \$ARGS"
python3 "\$SOURCE_FILE" \$ARGS
`;

      // Create Java compilation and execution script
      const javaScript = `#!/bin/bash
# Java Compilation and Execution Script
set -e

SOURCE_FILE="$1"
MAIN_CLASS="$2"
ARGS="\${@:3}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: run-java <source-file> [main-class] [arguments...]"
    exit 1
fi

# Get class name from file if not provided
if [ -z "$MAIN_CLASS" ]; then
    MAIN_CLASS=\$(basename "\${SOURCE_FILE%.*}")
fi

# Compile
echo "☕ Compiling Java: \$SOURCE_FILE"
javac -d /tmp/collabhub/build "\$SOURCE_FILE"

# Run
echo "🚀 Running Java: \$MAIN_CLASS \$ARGS"
cd /tmp/collabhub/build
java "\$MAIN_CLASS" \$ARGS
`;

      // Create Node.js execution script
      const nodeScript = `#!/bin/bash
# Node.js Execution Script
set -e

SOURCE_FILE="$1"
ARGS="\${@:2}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: run-node <source-file> [arguments...]"
    exit 1
fi

echo "🟢 Running Node.js: \$SOURCE_FILE \$ARGS"
node "\$SOURCE_FILE" \$ARGS
`;

      // Create React app creation script
      const createReactScript = `#!/bin/bash
# Create React App Script
set -e

APP_NAME="$1"
TEMPLATE="$2"

if [ -z "$APP_NAME" ]; then
    echo "Usage: create-react-app <app-name> [template]"
    echo "Templates: typescript, redux, redux-typescript"
    exit 1
fi

# Ensure we're in the workspace directory
cd /workspace

echo "⚛️ Creating React app: \$APP_NAME"
if [ -n "$TEMPLATE" ]; then
    echo "📋 Using template: \$TEMPLATE"
    npx create-react-app "\$APP_NAME" --template "\$TEMPLATE"
else
    npx create-react-app "\$APP_NAME"
fi

echo "✅ React app created successfully!"
echo "📁 Location: /workspace/\$APP_NAME"
echo "🚀 To start development server:"
echo "   cd \$APP_NAME && npm start"
`;

      // Create npm helper script
      const npmScript = `#!/bin/bash
# NPM Helper Script with proper permissions
set -e

COMMAND="$1"
shift
ARGS="$@"

if [ -z "$COMMAND" ]; then
    echo "Usage: npm-helper <command> [arguments...]"
    echo "Commands: install, start, build, test, create-react-app, etc."
    exit 1
fi

echo "📦 Running npm \$COMMAND \$ARGS"

case "\$COMMAND" in
    "create-react-app")
        APP_NAME="$1"
        TEMPLATE="$2"
        if [ -z "$APP_NAME" ]; then
            echo "Usage: npm-helper create-react-app <app-name> [template]"
            exit 1
        fi
        cd /workspace
        if [ -n "$TEMPLATE" ]; then
            npx create-react-app "\$APP_NAME" --template "\$TEMPLATE"
        else
            npx create-react-app "\$APP_NAME"
        fi
        ;;
    "init")
        npm init \$ARGS
        ;;
    "install"|"i")
        npm install \$ARGS
        ;;
    "start")
        npm start \$ARGS
        ;;
    "build")
        npm run build \$ARGS
        ;;
    "test")
        npm test \$ARGS
        ;;
    *)
        npm \$COMMAND \$ARGS
        ;;
esac
`;

      // Create Vite project creation script  
      const createViteScript = `#!/bin/bash
# Create Vite Project Script
set -e

APP_NAME="$1"
TEMPLATE="$2"

if [ -z "$APP_NAME" ]; then
    echo "Usage: create-vite-app <app-name> [template]"
    echo "Templates: vanilla, vanilla-ts, react, react-ts, vue, vue-ts, svelte, svelte-ts"
    exit 1
fi

# Ensure we're in the workspace directory
cd /workspace

echo "⚡ Creating Vite app: \$APP_NAME"
if [ -n "$TEMPLATE" ]; then
    echo "📋 Using template: \$TEMPLATE"
    npm create vite@latest "\$APP_NAME" -- --template "\$TEMPLATE"
else
    npm create vite@latest "\$APP_NAME" -- --template react
fi

echo "✅ Vite app created successfully!"
echo "📁 Location: /workspace/\$APP_NAME"
echo "🚀 To start development server:"
echo "   cd \$APP_NAME && npm install && npm run dev"
`;

      // Create Go compilation and execution script
      const goScript = `#!/bin/bash
# Go Compilation and Execution Script
set -e

SOURCE_FILE="$1"
OUTPUT_NAME="$2"
ARGS="\${@:3}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: run-go <source-file> [output-name] [arguments...]"
    exit 1
fi

if [ -z "$OUTPUT_NAME" ]; then
    OUTPUT_NAME="/tmp/collabhub/bin/\$(basename "\${SOURCE_FILE%.*}")"
fi

echo "🐹 Compiling Go: \$SOURCE_FILE"
go build -o "\$OUTPUT_NAME" "\$SOURCE_FILE"

echo "🚀 Running Go: \$OUTPUT_NAME \$ARGS"
"\$OUTPUT_NAME" \$ARGS
`;

      // Create Rust compilation and execution script
      const rustScript = `#!/bin/bash
# Rust Compilation and Execution Script
set -e

SOURCE_FILE="$1"
OUTPUT_NAME="$2"
ARGS="\${@:3}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: run-rust <source-file> [output-name] [arguments...]"
    exit 1
fi

if [ -z "$OUTPUT_NAME" ]; then
    OUTPUT_NAME="/tmp/collabhub/bin/\$(basename "\${SOURCE_FILE%.*}")"
fi

echo "🦀 Compiling Rust: \$SOURCE_FILE"
rustc "\$SOURCE_FILE" -o "\$OUTPUT_NAME"

echo "🚀 Running Rust: \$OUTPUT_NAME \$ARGS"
"\$OUTPUT_NAME" \$ARGS
`;

      // Write all scripts to the container
      const scripts = [
        { name: 'compile-cpp', content: cppScript },
        { name: 'run-python', content: pythonScript },
        { name: 'run-java', content: javaScript },
        { name: 'run-node', content: nodeScript },
        { name: 'run-go', content: goScript },
        { name: 'run-rust', content: rustScript },
        { name: 'create-react-app', content: createReactScript },
        { name: 'npm-helper', content: npmScript },
        { name: 'create-vite-app', content: createViteScript }
      ];

      for (const script of scripts) {
        const base64Content = Buffer.from(script.content, 'utf8').toString('base64');
        await this.executeInContainer(container, [
          'sh', '-c', `echo '${base64Content}' | base64 -d > /usr/local/bin/${script.name}`
        ]);
        await this.executeInContainer(container, [
          'chmod', '+x', `/usr/local/bin/${script.name}`
        ]);
        console.log(`📝 Created ${script.name} script`);
      }

      // Create a general compilation helper
      const generalScript = `#!/bin/bash
# General compilation helper - detects language and runs appropriate script
set -e

SOURCE_FILE="$1"
ARGS="\${@:2}"

if [ -z "$SOURCE_FILE" ]; then
    echo "Usage: compile-and-run <source-file> [arguments...]"
    echo ""
    echo "Supported languages:"
    echo "  C/C++: .c, .cpp, .cc, .cxx"
    echo "  Python: .py"
    echo "  Java: .java"
    echo "  JavaScript: .js"
    echo "  Go: .go"
    echo "  Rust: .rs"
    exit 1
fi

# Get file extension
EXT="\${SOURCE_FILE##*.}"

case "\$EXT" in
    "cpp"|"cc"|"cxx"|"C")
        compile-cpp "\$SOURCE_FILE" "" "cpp" && /tmp/collabhub/bin/\$(basename "\${SOURCE_FILE%.*}") \$ARGS
        ;;
    "c")
        compile-cpp "\$SOURCE_FILE" "" "c" && /tmp/collabhub/bin/\$(basename "\${SOURCE_FILE%.*}") \$ARGS
        ;;
    "py")
        run-python "\$SOURCE_FILE" \$ARGS
        ;;
    "java")
        run-java "\$SOURCE_FILE" "" \$ARGS
        ;;
    "js")
        run-node "\$SOURCE_FILE" \$ARGS
        ;;
    "go")
        run-go "\$SOURCE_FILE" "" \$ARGS
        ;;
    "rs")
        run-rust "\$SOURCE_FILE" "" \$ARGS
        ;;
    *)
        echo "❌ Unsupported file type: .\$EXT"
        echo "Supported: .c, .cpp, .py, .java, .js, .go, .rs"
        exit 1
        ;;
esac
`;

      const generalBase64 = Buffer.from(generalScript, 'utf8').toString('base64');
      await this.executeInContainer(container, [
        'sh', '-c', `echo '${generalBase64}' | base64 -d > /usr/local/bin/compile-and-run`
      ]);
      await this.executeInContainer(container, [
        'chmod', '+x', '/usr/local/bin/compile-and-run'
      ]);

              // Create a workspace sync script
        const syncScript = `#!/bin/bash
# Workspace Sync Script - Syncs changes back to database
set -e

echo "🔄 Syncing workspace changes to database..."

# Get project ID from environment or parameter
PROJECT_ID="\${1:-\$PROJECT_ID}"

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID not found. Usage: sync-workspace [project-id]"
    echo "Or set PROJECT_ID environment variable"
    exit 1
fi

# Call the sync API endpoint
curl -X POST "http://host.docker.internal:5000/api/projects/\$PROJECT_ID/sync" \\
     -H "Content-Type: application/json" \\
     -w "\\nHTTP Status: %{http_code}\\n" \\
     -s

echo "✅ Sync request completed!"
echo "📁 Check your file explorer to see the updated files"
`;

        // Create a comprehensive permission fix script
        const fixPermissionsScript = `#!/bin/bash
# Comprehensive Permissions Fix Script
set -e

echo "🔧 Fixing all permissions for maximum compatibility..."

# Fix workspace permissions
chmod -R 777 /workspace
find /workspace -type d -exec chmod 777 {} +
find /workspace -type f -exec chmod 666 {} +

# Fix npm and node permissions
chmod -R 777 /tmp/.npm /root/.npm /usr/local/lib/node_modules
chmod 777 /usr/bin/npm /usr/bin/npx /usr/bin/node

# Fix temporary directories
chmod -R 777 /tmp/collabhub

# Set umask for current session
umask 000

echo "✅ All permissions fixed!"
`;

        const fixPermissionsBase64 = Buffer.from(fixPermissionsScript, 'utf8').toString('base64');
        await this.executeInContainer(container, [
          'sh', '-c', `echo '${fixPermissionsBase64}' | base64 -d > /usr/local/bin/fix-permissions`
        ]);
        await this.executeInContainer(container, [
          'chmod', '+x', '/usr/local/bin/fix-permissions'
        ]);

        // Add sync script
        const syncBase64 = Buffer.from(syncScript, 'utf8').toString('base64');
        await this.executeInContainer(container, [
          'sh', '-c', `echo '${syncBase64}' | base64 -d > /usr/local/bin/sync-workspace`
        ]);
        await this.executeInContainer(container, [
          'chmod', '+x', '/usr/local/bin/sync-workspace'
        ]);

        // Run the permissions fix immediately
        await this.executeInContainer(container, [
          '/usr/local/bin/fix-permissions'
        ]);

        console.log(`✅ All compilation environments setup complete`);
        console.log(`🎯 Available commands: compile-cpp, run-python, run-java, run-node, run-go, run-rust, compile-and-run`);
        console.log(`⚛️ React commands: create-react-app, npm-helper, create-vite-app`);
        console.log(`🔧 Utility commands: fix-permissions`);

    } catch (error) {
      console.error(`❌ Failed to setup compilation environment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute command in container
   */
  async executeInContainer(container, command) {
    if (!container) {
      throw new Error('Container is undefined');
    }

    return new Promise((resolve, reject) => {
      // Ensure command is properly formatted
      const cmd = Array.isArray(command) ? command : [command];
      
      const options = {
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true
      };

      container.exec(options, (err, exec) => {
        if (err) {
          console.error(`❌ Docker exec error:`, err);
          return reject(err);
        }

        exec.start({ hijack: true, stdin: false }, (err, stream) => {
          if (err) {
            console.error(`❌ Docker exec start error:`, err);
            return reject(err);
          }

          let output = '';
          let error = '';

          stream.on('data', (chunk) => {
            // Handle Docker exec stream format properly
            if (chunk.length > 0) {
              const streamType = chunk[0];
              const data = chunk.toString();
              
              if (streamType === 1) { // stdout
                output += data.slice(8);
              } else if (streamType === 2) { // stderr
                error += data.slice(8);
              } else {
                // Fallback for non-stream data
                output += data;
              }
            }
          });

          stream.on('end', () => {
            if (error && error.trim()) {
              reject(new Error(error.trim()));
            } else {
              resolve({ output: output.trim(), error: error.trim() });
            }
          });

          stream.on('error', (err) => {
            console.error(`❌ Docker exec stream error:`, err);
            reject(err);
          });
        });
      });
    });
  }



  /**
   * Sync changes from Docker workspace back to database
   */
  async syncWorkspaceToDatabase(projectId) {
    try {
      console.log(`🔄 Starting workspace-to-database sync for project: ${projectId}`);
      
      // Import models dynamically to avoid circular dependencies
      const { default: Folder } = await import('../models/Folder.js');
      const { default: File } = await import('../models/file.js');
      const { default: Project } = await import('../models/Project.js');
      
      // Get project information to determine owner
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Determine a valid owner for created folders/files
      const projectOwnerId = project.owner || project.creatorId;
      
      // Get all files currently in the Docker workspace (recursively)
      const containerFiles = await this.listFilesInContainer(projectId);
      console.log(`📄 Found ${containerFiles.length} files in workspace`);
      
      // Get all files currently in database for this project
      const dbFiles = await File.find({ project: projectId }).populate('folder', 'name path');
      const dbFileMap = new Map();
      
      // Map by canonical full path; prefer stored file.path when available
      for (const file of dbFiles) {
        let fullPath = file.path || file.name;
        if (!fullPath) {
          if (file.folder && file.folder.path && file.folder.path !== 'Root') {
            fullPath = `${file.folder.path}/${file.name}`;
          } else if (file.folder && file.folder.name && file.folder.name !== 'Root') {
            fullPath = `${file.folder.name}/${file.name}`;
          } else {
            fullPath = file.name;
          }
        }
        // Normalize path to ensure consistency
        fullPath = fullPath.replace(/^\/+/, ''); // Remove leading slashes
        dbFileMap.set(fullPath, file);
      }
      
      // Track changes
      const newFiles = [];
      const updatedFiles = [];
      const filesToDelete = new Set(dbFiles.map(f => (f.path || f.name)));
      
      // Process each file found in workspace
      for (const filePath of containerFiles) {
        // Normalize the file path to ensure consistency
        const normalizedPath = filePath.replace(/^\/+/, ''); // Remove leading slashes
        filesToDelete.delete(normalizedPath);
        
        try {
          // Read file content from container
          const content = await this.readFileFromContainer(projectId, normalizedPath);
          if (content === null) continue;
          
          const fileName = normalizedPath.split('/').pop();
          const folderPath = normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : '';
          
          console.log(`🔍 Processing file: ${normalizedPath}, fileName: ${fileName}, folderPath: "${folderPath}"`);
          
          // Link to existing folder if present; do not create new folders here to avoid duplicates
          let folder = null;
          if (folderPath) {
            const folderName = folderPath.split('/').pop();
            
            // First, try to find folder by exact path match
            folder = await Folder.findOne({ 
              project: projectId, 
              path: folderPath,
              name: folderName
            });
            
            // If not found, try to find by name only (for root level folders)
            if (!folder) {
              folder = await Folder.findOne({ 
                project: projectId, 
                name: folderName,
                path: '' // Root level folders have empty path
              });
            }
            
            // If still not found, try to find by name in any path
            if (!folder) {
              folder = await Folder.findOne({ 
                project: projectId, 
                name: folderName
              });
            }
            
            if (folder) {
              console.log(`✅ Found folder for ${folderPath}: ${folder.name} (path: "${folder.path}")`);
            } else {
              console.log(`⚠️ No folder found for path: ${folderPath}`);
            }
          }
          
          const existingFile = dbFileMap.get(normalizedPath);
          
          if (existingFile) {
            // Check if content has changed
            if (existingFile.content !== content) {
              updatedFiles.push({
                id: existingFile._id,
                content,
                lastModified: new Date()
              });
            }
          } else {
            // Enhanced duplicate detection for new files
            const duplicateChecks = await File.find({
              project: projectId,
              $or: [
                { name: fileName, folder: folder?._id || null },
                { path: normalizedPath },
                { name: fileName, path: normalizedPath }
              ]
            });
            
            if (duplicateChecks.length > 0) {
              console.log(`⚠️ Skipping duplicate file: ${normalizedPath} (found ${duplicateChecks.length} existing files)`);
              continue;
            }
            
            // Additional check: prevent files with same name in same folder path
            const duplicateInSamePath = await File.findOne({
              project: projectId,
              name: fileName,
              $or: [
                { folder: folder?._id || null },
                { path: { $regex: `^${folderPath}/?$` } }
              ]
            });
            
            if (duplicateInSamePath) {
              console.log(`⚠️ Skipping duplicate file in same path: ${fileName} in ${folderPath}`);
              continue;
            }
            
            // New file found in workspace
            newFiles.push({
              name: fileName,
              path: normalizedPath,
              content,
              project: projectId,
              owner: projectOwnerId,
              folder: folder?._id || null,
              size: Buffer.byteLength(content, 'utf8'),
              createdAt: new Date(),
              lastModified: new Date()
            });
          }
        } catch (fileError) {
          console.warn(`⚠️ Error processing file ${filePath}: ${fileError.message}`);
        }
      }
      
      // Create new files in database
      if (newFiles.length > 0) {
        try {
          await File.insertMany(newFiles);
          console.log(`✅ Created ${newFiles.length} new files in database`);
        } catch (insertError) {
          if (insertError.code === 11000) {
            console.warn(`⚠️ Some files already exist, skipping duplicates`);
            // Try to insert files one by one to handle partial duplicates
            let successCount = 0;
            for (const fileData of newFiles) {
              try {
                await File.create(fileData);
                successCount++;
              } catch (singleError) {
                if (singleError.code !== 11000) {
                  console.error(`❌ Error creating file ${fileData.name}: ${singleError.message}`);
                }
              }
            }
            console.log(`✅ Created ${successCount} new files (skipped duplicates)`);
          } else {
            throw insertError;
          }
        }
      }
      
      // Update modified files in database
      for (const update of updatedFiles) {
        await File.findByIdAndUpdate(update.id, {
          content: update.content,
          lastModified: update.lastModified
        });
      }
      if (updatedFiles.length > 0) {
        console.log(`✅ Updated ${updatedFiles.length} files in database`);
      }
      
      // Note: We don't delete files that are missing from workspace
      // as they might have been temporarily moved or the sync might be partial
      
      console.log(`✅ Workspace-to-database sync completed`);
      return {
        newFiles: newFiles.length,
        updatedFiles: updatedFiles.length,
        totalProcessed: containerFiles.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to sync workspace to database: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync all project data (folders and files) to Docker workspace
   */
  async syncProjectToWorkspace(projectId) {
    try {
      console.log(`🔄 Starting full project sync for: ${projectId}`);
      
      // Import models dynamically to avoid circular dependencies
      const { default: Folder } = await import('../models/Folder.js');
      const { default: File } = await import('../models/file.js');
      
      // Get all folders for this project
      const folders = await Folder.find({ project: projectId }).sort({ path: 1 });
      
      // Create all folders in Docker workspace
      for (const folder of folders) {
        const folderPath = folder.path || folder.name;
        if (folderPath && folderPath !== 'Root') {
          await this.createFolderInContainer(projectId, folderPath);
        }
      }
      
      // Get all files for this project
      const files = await File.find({ project: projectId }).populate('folder', 'name path');
      
      // Create all files in Docker workspace
      for (const file of files) {
        let filePath = file.name;
        if (file.folder && file.folder.path && file.folder.path !== 'Root') {
          // Use folder path directly since it should be relative to workspace root
          filePath = `${file.folder.path}/${file.name}`;
        } else if (file.folder && file.folder.name && file.folder.name !== 'Root') {
          // Fallback to folder name if no path
          filePath = `${file.folder.name}/${file.name}`;
        }
        
        console.log(`📄 Syncing file: ${filePath}`);
        await this.writeFileToContainer(projectId, filePath, file.content || '');
      }
      
      console.log(`✅ Project sync completed: ${folders.length} folders, ${files.length} files`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to sync project to workspace: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up project workspace
   */
  async cleanupProjectWorkspace(projectId) {
    try {
      const containerInfo = this.containers.get(projectId);
      
      if (containerInfo) {
        // Stop and remove container
        await containerInfo.container.stop();
        await containerInfo.container.remove();
        
        this.containers.delete(projectId);
        console.log(`✅ Cleaned up Docker workspace for project ${projectId}`);
      }

    } catch (error) {
      console.error(`❌ Failed to cleanup workspace for project ${projectId}:`, error);
    }
  }

  /**
   * Manual sync trigger - can be called from API or terminal
   */
  async triggerSync(projectId) {
    try {
      console.log(`🔄 Manual sync triggered for project: ${projectId}`);
      
      // Sync workspace changes back to database
      const syncResult = await this.syncWorkspaceToDatabase(projectId);
      
      if (syncResult) {
        console.log(`✅ Manual sync completed: ${syncResult.newFiles} new, ${syncResult.updatedFiles} updated`);
        return syncResult;
      } else {
        console.log(`❌ Manual sync failed`);
        return { error: 'Sync failed' };
      }
    } catch (error) {
      console.error(`❌ Manual sync error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get workspace stats
   */
  async getWorkspaceStats(projectId) {
    try {
      const containerInfo = await this.getProjectContainer(projectId);
      
      const result = await this.executeInContainer(containerInfo.container, [
        'du', '-sh', '/workspace'
      ]);

      const sizeMatch = result.output.match(/^(\S+)/);
      const size = sizeMatch ? sizeMatch[1] : 'Unknown';

      const fileCount = await this.listFiles(projectId);

      return {
        size,
        fileCount: fileCount.length,
        containerStatus: 'running'
      };

    } catch (error) {
      console.error(`❌ Failed to get workspace stats:`, error);
      return {
        size: 'Unknown',
        fileCount: 0,
        containerStatus: 'error'
      };
    }
  }
}

// Singleton instance
let dockerWorkspaceInstance = null;

export const getDockerWorkspaceManager = () => {
  if (!dockerWorkspaceInstance) {
    dockerWorkspaceInstance = new DockerWorkspaceManager();
  }
  return dockerWorkspaceInstance;
};

export default DockerWorkspaceManager;
