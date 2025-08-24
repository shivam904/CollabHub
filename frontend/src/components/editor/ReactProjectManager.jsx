import React, { useState, useCallback } from 'react';
import { Play, Plus, Build, Stop, Package, ExternalLink } from 'lucide-react';
import './ReactProjectManager.css';

const ReactProjectManager = ({ projectId, userId, onOutput }) => {
  const [projectName, setProjectName] = useState('my-react-app');
  const [projectPath, setProjectPath] = useState('');
  const [port, setPort] = useState(3000);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);

  // API base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Helper function to make API calls
  const makeApiCall = useCallback(async (endpoint, data) => {
    try {
      const response = await fetch(`${API_BASE}/react/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          projectId,
          userId
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'API call failed');
      }

      return result.result;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }, [API_BASE, projectId, userId]);

  // Create a new React project
  const createReactProject = async () => {
    if (!projectName.trim()) {
      onOutput('❌ Please enter a project name');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`🚀 Creating React project: ${projectName}...`);
      
      const result = await makeApiCall('create', { projectName });
      
      if (result.success) {
        setProjectPath(projectName);
        onOutput(`✅ React project created successfully!\n📁 Path: ${result.path}\n\n💡 Next steps:\n${result.nextSteps.join('\n')}`);
      } else {
        onOutput(`❌ Failed to create React project: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error creating React project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run React project (create + install + start)
  const runReactProject = async () => {
    if (!projectName.trim()) {
      onOutput('❌ Please enter a project name');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`🚀 Running React project: ${projectName}...\n⏳ This may take a few minutes...`);
      
      const result = await makeApiCall('run', { projectName, port });
      
      if (result.success) {
        setCurrentProcess({
          projectName: result.projectName,
          port: result.port,
          url: result.url,
          processId: result.processId
        });
        setProjectPath(result.projectName);
        
        onOutput(`✅ React project is now running!\n🌐 URL: ${result.url}\n📁 Project: ${result.projectName}\n\n💡 Next steps:\n${result.nextSteps.join('\n')}`);
      } else {
        onOutput(`❌ Failed to run React project: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error running React project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start development server for existing project
  const startDevServer = async () => {
    if (!projectPath.trim()) {
      onOutput('❌ Please enter a project path');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`🌐 Starting React development server for: ${projectPath}...`);
      
      const result = await makeApiCall('start', { projectPath, port });
      
      if (result.success) {
        setCurrentProcess({
          projectName: projectPath,
          port: result.port,
          url: result.url,
          processId: result.processId
        });
        
        onOutput(`✅ React development server started!\n🌐 URL: ${result.url}\n📁 Project: ${projectPath}`);
      } else {
        onOutput(`❌ Failed to start development server: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error starting development server: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Build React project for production
  const buildProject = async () => {
    if (!projectPath.trim()) {
      onOutput('❌ Please enter a project path');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`🏗️ Building React project for production: ${projectPath}...`);
      
      const result = await makeApiCall('build', { projectPath });
      
      if (result.success) {
        onOutput(`✅ React project built successfully!\n📁 Build path: ${result.buildPath}\n\n🎯 Your app is ready for production deployment!`);
      } else {
        onOutput(`❌ Failed to build React project: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error building React project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop development server
  const stopDevServer = async () => {
    if (!currentProcess?.processId) {
      onOutput('❌ No running development server to stop');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`🛑 Stopping React development server...`);
      
      const result = await makeApiCall('stop', { processId: currentProcess.processId });
      
      if (result.success) {
        setCurrentProcess(null);
        onOutput(`✅ React development server stopped successfully!`);
      } else {
        onOutput(`❌ Failed to stop development server: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error stopping development server: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Install dependencies
  const installDependencies = async () => {
    if (!projectPath.trim()) {
      onOutput('❌ Please enter a project path');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`📦 Installing dependencies for: ${projectPath}...`);
      
      const result = await makeApiCall('install', { projectPath });
      
      if (result.success) {
        onOutput(`✅ Dependencies installed successfully!`);
      } else {
        onOutput(`❌ Failed to install dependencies: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error installing dependencies: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get project status
  const getProjectStatus = async () => {
    if (!projectPath.trim()) {
      onOutput('❌ Please enter a project path');
      return;
    }

    setIsLoading(true);
    try {
      onOutput(`📊 Getting project status: ${projectPath}...`);
      
      const result = await makeApiCall('status', { projectPath });
      
      if (result.success) {
        setProjectStatus(result);
        if (result.exists) {
          onOutput(`✅ React project found!\n📁 Path: ${projectPath}\n📦 React version: ${result.packageJson?.dependencies?.react || 'Unknown'}`);
        } else {
          onOutput(`❌ React project not found at: ${projectPath}`);
        }
      } else {
        onOutput(`❌ Failed to get project status: ${result.error}`);
      }
    } catch (error) {
      onOutput(`❌ Error getting project status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Open project URL in browser
  const openProjectUrl = () => {
    if (currentProcess?.url) {
      window.open(currentProcess.url, '_blank');
    }
  };

  return (
    <div className="react-project-manager">
      <div className="react-project-header">
        <h3>⚛️ React Project Manager</h3>
        <p>Create, run, and manage React applications</p>
      </div>

      <div className="react-project-controls">
        {/* Project Creation */}
        <div className="control-section">
          <h4>🚀 Create New Project</h4>
          <div className="input-group">
            <input
              type="text"
              placeholder="Project name (e.g., my-react-app)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isLoading}
            />
            <button
              onClick={createReactProject}
              disabled={isLoading || !projectName.trim()}
              className="btn-create"
            >
              <Plus size={16} />
              Create
            </button>
          </div>
        </div>

        {/* Project Execution */}
        <div className="control-section">
          <h4>▶️ Run Project</h4>
          <div className="input-group">
            <input
              type="text"
              placeholder="Project name or path"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="number"
              placeholder="Port"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 3000)}
              disabled={isLoading}
              min="3000"
              max="9999"
            />
            <button
              onClick={runReactProject}
              disabled={isLoading || !projectName.trim()}
              className="btn-run"
            >
              <Play size={16} />
              Run
            </button>
          </div>
        </div>

        {/* Development Server Controls */}
        <div className="control-section">
          <h4>🌐 Development Server</h4>
          <div className="button-group">
            <button
              onClick={startDevServer}
              disabled={isLoading || !projectPath.trim()}
              className="btn-start"
            >
              <Play size={16} />
              Start Server
            </button>
            <button
              onClick={stopDevServer}
              disabled={isLoading || !currentProcess}
              className="btn-stop"
            >
              <Stop size={16} />
              Stop Server
            </button>
            {currentProcess?.url && (
              <button
                onClick={openProjectUrl}
                className="btn-open"
              >
                <ExternalLink size={16} />
                Open App
              </button>
            )}
          </div>
        </div>

        {/* Project Management */}
        <div className="control-section">
          <h4>📦 Project Management</h4>
          <div className="button-group">
            <button
              onClick={installDependencies}
              disabled={isLoading || !projectPath.trim()}
              className="btn-install"
            >
              <Package size={16} />
              Install Dependencies
            </button>
            <button
              onClick={buildProject}
              disabled={isLoading || !projectPath.trim()}
              className="btn-build"
            >
              <Build size={16} />
              Build for Production
            </button>
            <button
              onClick={getProjectStatus}
              disabled={isLoading || !projectPath.trim()}
              className="btn-status"
            >
              📊 Status
            </button>
          </div>
        </div>
      </div>

      {/* Current Project Status */}
      {currentProcess && (
        <div className="current-project-status">
          <h4>🎯 Current Project</h4>
          <div className="status-info">
            <p><strong>Project:</strong> {currentProcess.projectName}</p>
            <p><strong>Port:</strong> {currentProcess.port}</p>
            <p><strong>URL:</strong> <a href={currentProcess.url} target="_blank" rel="noopener noreferrer">{currentProcess.url}</a></p>
            <p><strong>Status:</strong> <span className="status-running">🟢 Running</span></p>
          </div>
        </div>
      )}

      {/* Project Status Info */}
      {projectStatus && (
        <div className="project-status-info">
          <h4>📊 Project Status</h4>
          <div className="status-info">
            <p><strong>Exists:</strong> {projectStatus.exists ? '✅ Yes' : '❌ No'}</p>
            {projectStatus.packageJson && (
              <>
                <p><strong>React Version:</strong> {projectStatus.packageJson.dependencies?.react || 'Unknown'}</p>
                <p><strong>Project Name:</strong> {projectStatus.packageJson.name || 'Unknown'}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

export default ReactProjectManager;
