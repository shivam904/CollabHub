import reactProjectRunner from '../services/reactProjectRunner.js';

/**
 * Create a new React project
 */
const createReactProject = async (req, res) => {
  try {
    const { projectId, projectName, userId } = req.body;

    console.log(`🚀 [React] Creating React project: ${projectName} for user: ${userId}`);

    // Validate input
    if (!projectId || !projectName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectName, and userId are required'
      });
    }

    // Create React project
    const result = await reactProjectRunner.createReactProject(projectId, projectName);

    console.log(`✅ [React] Project creation result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error creating project:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to create React project',
      error: error.message
    });
  }
};

/**
 * Run a React project (create + install + start)
 */
const runReactProject = async (req, res) => {
  try {
    const { projectId, projectName, port, userId } = req.body;

    console.log(`🚀 [React] Running React project: ${projectName} for user: ${userId}`);

    // Validate input
    if (!projectId || !projectName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectName, and userId are required'
      });
    }

    // Run React project with full setup
    const result = await reactProjectRunner.runReactProject(projectId, projectName, port || 3000);

    console.log(`✅ [React] Project run result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error running project:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to run React project',
      error: error.message
    });
  }
};

/**
 * Start React development server
 */
const startReactDevServer = async (req, res) => {
  try {
    const { projectId, projectPath, port, userId } = req.body;

    console.log(`🌐 [React] Starting dev server for: ${projectPath} on port ${port}`);

    // Validate input
    if (!projectId || !projectPath || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectPath, and userId are required'
      });
    }

    // Start React development server
    const result = await reactProjectRunner.startReactDevServer(projectId, projectPath, port || 3000);

    console.log(`✅ [React] Dev server start result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error starting dev server:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to start React development server',
      error: error.message
    });
  }
};

/**
 * Build React project for production
 */
const buildReactProject = async (req, res) => {
  try {
    const { projectId, projectPath, userId } = req.body;

    console.log(`🏗️ [React] Building project for production: ${projectPath}`);

    // Validate input
    if (!projectId || !projectPath || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectPath, and userId are required'
      });
    }

    // Build React project
    const result = await reactProjectRunner.buildReactProject(projectId, projectPath);

    console.log(`✅ [React] Build result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error building project:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to build React project',
      error: error.message
    });
  }
};

/**
 * Get React project status
 */
const getProjectStatus = async (req, res) => {
  try {
    const { projectId, projectPath, userId } = req.body;

    console.log(`📊 [React] Getting project status: ${projectPath}`);

    // Validate input
    if (!projectId || !projectPath || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectPath, and userId are required'
      });
    }

    // Get project status
    const result = await reactProjectRunner.getProjectStatus(projectId, projectPath);

    console.log(`✅ [React] Status result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error getting project status:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get React project status',
      error: error.message
    });
  }
};

/**
 * Stop React development server
 */
const stopReactDevServer = async (req, res) => {
  try {
    const { projectId, processId, userId } = req.body;

    console.log(`🛑 [React] Stopping dev server: ${processId}`);

    // Validate input
    if (!projectId || !processId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, processId, and userId are required'
      });
    }

    // Stop React development server
    const result = await reactProjectRunner.stopReactDevServer(projectId, processId);

    console.log(`✅ [React] Stop server result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error stopping dev server:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop React development server',
      error: error.message
    });
  }
};

/**
 * Install dependencies for React project
 */
const installDependencies = async (req, res) => {
  try {
    const { projectId, projectPath, userId } = req.body;

    console.log(`📦 [React] Installing dependencies for: ${projectPath}`);

    // Validate input
    if (!projectId || !projectPath || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ProjectId, projectPath, and userId are required'
      });
    }

    // Install dependencies
    const result = await reactProjectRunner.installDependencies(projectId, projectPath);

    console.log(`✅ [React] Install dependencies result:`, result.success);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error(`💥 [React] Error installing dependencies:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to install dependencies',
      error: error.message
    });
  }
};

export {
  createReactProject,
  runReactProject,
  startReactDevServer,
  buildReactProject,
  getProjectStatus,
  stopReactDevServer,
  installDependencies
};
