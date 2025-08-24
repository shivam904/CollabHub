import externalCompilerService from '../services/externalCompiler.js';

/**
 * Compile and execute code
 */
const compileAndExecute = async (req, res) => {
  try {
    const { fileName, code, input, userId, projectId } = req.body;

    console.log(`🚀 [Compiler] Compilation request for ${fileName}`);
    console.log(`👤 User: ${userId}`);
    console.log(`📁 Project: ${projectId || 'default'}`);
    console.log(`📝 Code length: ${code?.length || 0} characters`);

    // Validate input
    if (!fileName || !code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'FileName, code, and userId are required'
      });
    }

    // Check if file type is supported
    if (!externalCompilerService.isSupported(fileName)) {
      return res.status(400).json({
        success: false,
        message: `File type not supported: ${fileName}. Supported types: ${externalCompilerService.getSupportedLanguages().join(', ')}`
      });
    }

    // Compile and execute the code
    const result = await externalCompilerService.compileAndExecute(fileName, code, input || '', projectId);

    console.log(`✅ [Compiler] Execution completed for ${fileName}`);
    console.log(`📊 Success: ${result.success}`);
    console.log(`📤 Output length: ${result.output?.length || 0}`);
    console.log(`❌ Error length: ${result.error?.length || 0}`);

    // Return the result
    res.json({
      success: true,
      result: {
        ...result,
        fileName,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`💥 [Compiler] Error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to compile and execute code',
      error: error.message
    });
  }
};

/**
 * Get supported languages
 */
const getSupportedLanguages = async (req, res) => {
  try {
    const languages = externalCompilerService.getSupportedLanguages();
    
    res.json({
      success: true,
      languages,
      count: languages.length
    });
  } catch (error) {
    console.error(`💥 [Compiler] Error getting supported languages:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported languages',
      error: error.message
    });
  }
};

/**
 * Check if file type is supported
 */
const checkSupport = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'FileName is required'
      });
    }

    const isSupported = externalCompilerService.isSupported(fileName);
    const languageConfig = externalCompilerService.getLanguageConfig(fileName);

    res.json({
      success: true,
      isSupported,
      language: languageConfig?.language || null,
      extension: languageConfig?.extension || null
    });
  } catch (error) {
    console.error(`💥 [Compiler] Error checking support:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to check file support',
      error: error.message
    });
  }
};

export {
  compileAndExecute,
  getSupportedLanguages,
  checkSupport
};
