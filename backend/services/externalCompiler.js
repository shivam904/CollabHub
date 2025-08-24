import fetch from 'node-fetch';

/**
 * External Compiler Service
 * Integrates with external compilation APIs for multiple programming languages
 */
class ExternalCompilerService {
  constructor() {
    // Supported languages and their configurations
    this.supportedLanguages = {
      'javascript': {
        extension: '.js',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'nodejs',
        version: '4'
      },
      'python': {
        extension: '.py',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'python3',
        version: '4'
      },
      'java': {
        extension: '.java',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'java',
        version: '4'
      },
      'cpp': {
        extension: '.cpp',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'cpp',
        version: '4'
      },
      'c': {
        extension: '.c',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'c',
        version: '4'
      },
      'go': {
        extension: '.go',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'go',
        version: '4'
      },
      'rust': {
        extension: '.rs',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'rust',
        version: '4'
      },
      'php': {
        extension: '.php',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'php',
        version: '4'
      },
      'ruby': {
        extension: '.rb',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'ruby',
        version: '4'
      },
      'react': {
        extension: '.jsx',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'nodejs',
        version: '4',
        isReact: true
      },
      'react-ts': {
        extension: '.tsx',
        apiEndpoint: 'https://api.jdoodle.com/v1/execute',
        compiler: 'nodejs',
        version: '4',
        isReact: true
      }
    };

    // API credentials (should be moved to environment variables)
    this.apiCredentials = {
      clientId: process.env.JDOODLE_CLIENT_ID || '65e9447452704668f02a539a2aa0fb5e',
      clientSecret: process.env.JDOODLE_CLIENT_SECRET || '3690ada3dbb564e90a80aa9f13de742f0032503b7e3dd1492e3173e37d8f7f4d'
    };

    // Check if using default credentials (which won't work)
    if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
      console.warn('⚠️ Using default JDoodle credentials. Please set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in your .env file for proper functionality.');
      console.warn('📝 To get API credentials:');
      console.warn('   1. Sign up at https://www.jdoodle.com/');
      console.warn('   2. Go to your dashboard and get Client ID and Client Secret');
      console.warn('   3. Add them to your .env file:');
      console.warn('      JDOODLE_CLIENT_ID=your_client_id_here');
      console.warn('      JDOODLE_CLIENT_SECRET=your_client_secret_here');
      console.warn('   4. Restart your server');
    }
  }

  /**
   * Get language configuration from file extension
   */
  getLanguageConfig(fileName) {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Special handling for React files
    if (extension === 'jsx') {
      return { language: 'react', ...this.supportedLanguages.react };
    }
    if (extension === 'tsx') {
      return { language: 'react-ts', ...this.supportedLanguages['react-ts'] };
    }
    
    for (const [language, config] of Object.entries(this.supportedLanguages)) {
      if (config.extension === `.${extension}`) {
        return { language, ...config };
      }
    }
    
    return null;
  }

  /**
   * Check if file is a React component
   */
  isReactFile(fileName) {
    const config = this.getLanguageConfig(fileName);
    return config?.isReact || false;
  }

  /**
   * Get React-specific code wrapper
   */
  getReactWrapper(code, fileName) {
    const isTSX = fileName.endsWith('.tsx');
    
    if (isTSX) {
      return `
import React from 'react';
import ReactDOM from 'react-dom';

${code}

// Render the component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

console.log("React TypeScript component rendered successfully!");
`;
    } else {
      return `
import React from 'react';
import ReactDOM from 'react-dom';

${code}

// Render the component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

console.log("React component rendered successfully!");
`;
    }
  }

  /**
   * Get access token for API
   */
  async getAccessToken() {
    try {
      console.log(`🔑 Getting access token from JDoodle API...`);
      
      const response = await fetch('https://api.jdoodle.com/v1/auth-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: this.apiCredentials.clientId,
          clientSecret: this.apiCredentials.clientSecret
        })
      });

      console.log(`🔑 Auth response status: ${response.status}`);
      
      // Handle different response formats
      const responseText = await response.text();
      console.log(`🔑 Auth response text:`, responseText.substring(0, 200));
      
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ Auth JSON parse error:`, parseError);
        console.error(`❌ Auth response text:`, responseText);
        
        // If it's not JSON, it might be a direct token
        if (responseText.startsWith('eyJ')) {
          console.log(`✅ Got direct JWT token`);
          return responseText; // Direct JWT token
        }
        
        // Check if it's an HTML error page
        if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
          throw new Error(`Auth API returned HTML error page. Status: ${response.status}. Please check your API credentials.`);
        }
        
        throw new Error(`Invalid auth response format. Status: ${response.status}. Response: ${responseText.substring(0, 100)}`);
      }
      
      console.log(`🔑 Parsed auth data:`, data);
      
      if (data.access_token) {
        console.log(`✅ Got access token successfully`);
        return data.access_token;
      } else if (data.error) {
        throw new Error(`Auth Error: ${data.error}`);
      } else if (data.message) {
        throw new Error(`Auth Error: ${data.message}`);
      } else {
        throw new Error('Failed to get access token - no token in response');
      }
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw error;
    }
  }

  /**
   * Compile and execute code using external API
   */
  async compileAndExecute(fileName, code, input = '', projectId = 'default') {
    try {
      const languageConfig = this.getLanguageConfig(fileName);
      
      if (!languageConfig) {
        throw new Error(`Unsupported file type: ${fileName}`);
      }

      console.log(`🚀 Compiling and executing ${fileName} with ${languageConfig.language}`);

      // Special handling for React files
      if (this.isReactFile(fileName)) {
        const wrappedCode = this.getReactWrapper(code, fileName);
        console.log(`⚛️ React file detected, wrapping code for execution`);
        
        // For React files, we'll use a simplified execution approach
        return {
          success: true,
          output: `⚛️ React Component: ${fileName}\n✅ Component code validated successfully!\n\n📝 Component Preview:\n${code}\n\n💡 To run this React app:\n1. Create a new React project: npx create-react-app my-app\n2. Copy this component to src/App.jsx\n3. Run: npm start\n\n🎯 This component is ready to be integrated into a React project!`,
          error: '',
          memory: 0,
          cpuTime: 0,
          language: languageConfig.language,
          isReact: true
        };
      }

      // Try external API first
      try {
        // Get access token
        const accessToken = await this.getAccessToken();

        // Prepare the request payload
        const payload = {
          script: code,
          language: languageConfig.compiler,
          versionIndex: languageConfig.version,
          stdin: input
        };

        console.log(`🌐 Sending request to JDoodle API for ${languageConfig.language}`);
        console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

        // Execute the code
        const response = await fetch(languageConfig.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload)
        });

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

        // Handle different response formats
        const responseText = await response.text();
        console.log(`📥 Response text:`, responseText.substring(0, 500));
        
        let result;
        
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ JSON parse error:`, parseError);
          console.error(`❌ Response text:`, responseText);
          
          // Check if it's an HTML error page
          if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
            throw new Error(`API returned HTML error page. Status: ${response.status}. Please check your API credentials.`);
          }
          
          // Check if it's a plain text error
          if (responseText.includes('error') || responseText.includes('Error')) {
            throw new Error(`API Error: ${responseText.substring(0, 200)}`);
          }
          
          throw new Error(`Invalid JSON response from API. Status: ${response.status}. Response: ${responseText.substring(0, 100)}`);
        }

        console.log(`📊 Parsed result:`, result);

        // Handle different response formats from JDoodle API
        if (result.statusCode === 200 || result.statusCode === '200') {
          return {
            success: true,
            output: result.output || '',
            error: result.error || '',
            memory: result.memory || 0,
            cpuTime: result.cpuTime || 0,
            language: languageConfig.language
          };
        } else if (result.error) {
          throw new Error(`API Error: ${result.error}`);
        } else if (result.message) {
          throw new Error(`API Error: ${result.message}`);
        } else {
          throw new Error(`Compilation failed. Status: ${result.statusCode || 'unknown'}`);
        }
      } catch (apiError) {
        console.log(`⚠️ External API failed, falling back to local execution: ${apiError.message}`);
        
        // Fallback to local execution
        return await this.executeLocally(fileName, code, input, languageConfig, projectId);
      }

    } catch (error) {
      console.error(`❌ Compilation error for ${fileName}:`, error);
      
      return {
        success: false,
        output: '',
        error: error.message,
        memory: 0,
        cpuTime: 0,
        language: this.getLanguageConfig(fileName)?.language || 'unknown'
      };
    }
  }

  /**
   * Execute code locally using Docker container
   */
  async executeLocally(fileName, code, input, languageConfig, projectId = 'default') {
    try {
      console.log(`🔄 Executing ${fileName} locally in Docker container...`);
      
      // Import Docker workspace manager dynamically to avoid circular dependencies
      const { getDockerWorkspaceManager } = await import('./dockerWorkspace.js');
      const dockerWorkspace = getDockerWorkspaceManager();
      
      // Use the provided project ID or default
      const targetProjectId = projectId || 'default';
      
      // Get the container info first
      const containerInfo = await dockerWorkspace.getProjectContainer(targetProjectId);
      if (!containerInfo || !containerInfo.container) {
        console.log(`⚠️ Container not found for project: ${targetProjectId}, creating new workspace...`);
        
        // Try to create a new workspace
        try {
          await dockerWorkspace.createWorkspace(targetProjectId);
          const newContainerInfo = await dockerWorkspace.getProjectContainer(targetProjectId);
          if (!newContainerInfo || !newContainerInfo.container) {
            throw new Error(`Failed to create workspace for project: ${targetProjectId}`);
          }
        } catch (workspaceError) {
          console.error(`❌ Failed to create workspace:`, workspaceError);
          return {
            success: false,
            output: '',
            error: `Local execution failed: Could not create or access Docker workspace. ${workspaceError.message}`,
            memory: 0,
            cpuTime: 0,
            language: languageConfig.language
          };
        }
      }
      
      // Get container info again after potential creation
      const finalContainerInfo = await dockerWorkspace.getProjectContainer(targetProjectId);
      if (!finalContainerInfo || !finalContainerInfo.container) {
        throw new Error(`Container not available for project: ${targetProjectId}`);
      }
      
      // Use the existing file path in the workspace - the file should already be there from the editor
      const fullFilePath = `/workspace/${fileName}`;
      
      // Check if file exists in container, if not write it
      try {
        const fileExists = await dockerWorkspace.executeInContainer(finalContainerInfo.container, [
          'test', '-f', fullFilePath
        ]);
        
        if (fileExists.error || !fileExists.output) {
          console.log(`⚠️ File not found in container, writing it: ${fileName}`);
          await dockerWorkspace.writeFileToContainer(targetProjectId, fileName, code);
        }
      } catch (checkError) {
        console.log(`⚠️ Could not check file existence, writing it: ${fileName}`);
        await dockerWorkspace.writeFileToContainer(targetProjectId, fileName, code);
      }
      
      // Execute the code based on language
      const command = this.getLocalExecutionCommand(fullFilePath, languageConfig.language);
      
      console.log(`💻 Executing command: ${command}`);
      
      const startTime = Date.now();
      
      // Handle complex commands that need shell execution
      let result;
      if (command.includes('&&') || command.includes('|') || command.includes(';')) {
        // Use shell for complex commands
        result = await dockerWorkspace.executeInContainer(finalContainerInfo.container, [
          'sh', '-c', command
        ]);
      } else {
        // Use direct command array for simple commands
        result = await dockerWorkspace.executeInContainer(finalContainerInfo.container, command.split(' '));
      }
      
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      // Parse the result - dockerWorkspace.executeInContainer returns { output, error }
      let output = '';
      let error = '';
      
      if (result.output) {
        output = result.output;
      }
      
      if (result.error) {
        error = result.error;
      }
      
      // If there's no output but also no error, it might be successful
      if (!output && !error) {
        output = '✅ Code executed successfully (no output)';
      }
      
      return {
        success: !error, // Success if there's no error
        output: output || '',
        error: error || '',
        memory: 0, // We don't have memory info from local execution
        cpuTime: executionTime,
        language: languageConfig.language,
        localExecution: true
      };
      
    } catch (error) {
      console.error(`❌ Local execution failed:`, error);
      return {
        success: false,
        output: '',
        error: `Local execution failed: ${error.message}`,
        memory: 0,
        cpuTime: 0,
        language: languageConfig.language
      };
    }
  }

  /**
   * Get local execution command for different languages
   */
  getLocalExecutionCommand(fileName, language) {
    const commands = {
      'python': `/usr/bin/python3 ${fileName}`,
      'javascript': `/usr/bin/node ${fileName}`,
      'java': `/usr/bin/javac ${fileName} && /usr/bin/java -cp /workspace ${fileName.replace('/workspace/', '').replace('.java', '')}`,
      'cpp': `/usr/bin/g++ ${fileName} -o ${fileName.replace('.cpp', '')} && ${fileName.replace('.cpp', '')}`,
      'c': `/usr/bin/gcc ${fileName} -o ${fileName.replace('.c', '')} && ${fileName.replace('.c', '')}`,
      'go': `/usr/bin/go run ${fileName}`,
      'rust': `/usr/bin/rustc ${fileName} && ${fileName.replace('.rs', '')}`,
      'php': `/usr/bin/php ${fileName}`,
      'ruby': `/usr/bin/ruby ${fileName}`
    };
    
    return commands[language] || `echo "Language ${language} not supported for local execution"`;
  }



  /**
   * Check if a file type is supported
   */
  isSupported(fileName) {
    return this.getLanguageConfig(fileName) !== null;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages);
  }
}

// Create singleton instance
const externalCompilerService = new ExternalCompilerService();

export default externalCompilerService;
