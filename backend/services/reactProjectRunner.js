import { getDockerWorkspaceManager } from './dockerWorkspace.js';

/**
 * React Project Runner Service
 * Handles React project creation, setup, and execution within Docker containers
 */
class ReactProjectRunner {
  constructor() {
    this.dockerWorkspace = getDockerWorkspaceManager();
  }

  /**
   * Create a new React project
   */
  async createReactProject(projectId, projectName) {
    try {
      console.log(`⚛️ Creating React project: ${projectName} in project: ${projectId}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }

      // Create React project using create-react-app
      const createCommand = `npx create-react-app ${projectName} --yes`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, createCommand);
      
      if (result.success) {
        console.log(`✅ React project created successfully: ${projectName}`);
        return {
          success: true,
          projectName,
          message: `React project '${projectName}' created successfully!`,
          path: `/workspace/${projectName}`,
          nextSteps: [
            `cd ${projectName}`,
            'npm start'
          ]
        };
      } else {
        throw new Error(`Failed to create React project: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error creating React project:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Install dependencies for a React project
   */
  async installDependencies(projectId, projectPath) {
    try {
      console.log(`📦 Installing dependencies for React project: ${projectPath}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }
      
      const installCommand = `cd ${projectPath} && npm install`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, installCommand);
      
      if (result.success) {
        console.log(`✅ Dependencies installed successfully`);
        return {
          success: true,
          message: 'Dependencies installed successfully!'
        };
      } else {
        throw new Error(`Failed to install dependencies: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error installing dependencies:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start React development server
   */
  async startReactDevServer(projectId, projectPath, port = 3000) {
    try {
      console.log(`🌐 Starting React dev server for: ${projectPath} on port ${port}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }
      
      // Start the React development server in background
      const startCommand = `cd ${projectPath} && npm start -- --port ${port} --host 0.0.0.0`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, startCommand, true);
      
      if (result.success) {
        console.log(`✅ React dev server started successfully`);
        return {
          success: true,
          message: `React development server started on port ${port}`,
          port,
          url: `http://localhost:${port}`,
          processId: result.processId
        };
      } else {
        throw new Error(`Failed to start React dev server: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error starting React dev server:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build React project for production
   */
  async buildReactProject(projectId, projectPath) {
    try {
      console.log(`🏗️ Building React project for production: ${projectPath}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }
      
      const buildCommand = `cd ${projectPath} && npm run build`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, buildCommand);
      
      if (result.success) {
        console.log(`✅ React project built successfully`);
        return {
          success: true,
          message: 'React project built successfully!',
          buildPath: `${projectPath}/build`
        };
      } else {
        throw new Error(`Failed to build React project: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error building React project:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if React project exists and is valid
   */
  async checkReactProject(projectId, projectPath) {
    try {
      console.log(`🔍 Checking React project: ${projectPath}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }
      
      const checkCommand = `cd ${projectPath} && test -f package.json && echo "package.json exists"`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, checkCommand);
      
      if (result.success) {
        const packageCommand = `cd ${projectPath} && cat package.json | grep -q "react" && echo "React project detected"`;
        const packageResult = await this.dockerWorkspace.executeInContainer(containerInfo.container, packageCommand);
        
        return {
          success: true,
          exists: true,
          isReact: packageResult.success,
          message: packageResult.success ? 'Valid React project found' : 'Project exists but not a React project'
        };
      } else {
        return {
          success: true,
          exists: false,
          isReact: false,
          message: 'React project not found'
        };
      }
    } catch (error) {
      console.error(`❌ Error checking React project:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop React development server
   */
  async stopReactDevServer(projectId, projectPath) {
    try {
      console.log(`🛑 Stopping React dev server for: ${projectPath}`);
      
      const containerInfo = await this.dockerWorkspace.getProjectContainer(projectId);
      if (!containerInfo) {
        throw new Error('Project container not found');
      }
      
      const stopCommand = `cd ${projectPath} && pkill -f "npm start" || pkill -f "react-scripts" || echo "No React dev server running"`;
      const result = await this.dockerWorkspace.executeInContainer(containerInfo.container, stopCommand);
      
      if (result.success) {
        console.log(`✅ React dev server stopped successfully`);
        return {
          success: true,
          message: 'React development server stopped successfully!'
        };
      } else {
        throw new Error(`Failed to stop React dev server: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error stopping React dev server:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const reactProjectRunner = new ReactProjectRunner();

export default reactProjectRunner;
