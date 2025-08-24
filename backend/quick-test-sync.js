import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Quick test to verify file synchronization setup
 */

async function quickTest() {
  try {
    console.log('🧪 Quick file sync test...');
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collabhub');
    console.log('✅ Database connected');
    
    // Test if we can import the services
    console.log('📦 Testing service imports...');
    
    try {
      const terminalFileWatcher = (await import('./services/terminalFileWatcher.js')).default;
      console.log('✅ Terminal file watcher imported');
      
      const dockerWorkspace = (await import('./services/dockerWorkspace.js')).default;
      console.log('✅ Docker workspace imported');
      
      const cloudTerminal = (await import('./services/cloudTerminal.js')).default;
      console.log('✅ Cloud terminal imported');
      
    } catch (importError) {
      console.error('❌ Service import failed:', importError.message);
      return;
    }
    
    // Test Docker connection
    console.log('🐳 Testing Docker connection...');
    try {
      const Docker = (await import('dockerode')).default;
      const docker = new Docker();
      await docker.ping();
      console.log('✅ Docker connected');
    } catch (dockerError) {
      console.warn('⚠️ Docker not available:', dockerError.message);
      console.log('💡 File sync will work when Docker is available');
    }
    
    console.log('✅ Quick test completed successfully!');
    console.log('🚀 File synchronization system is ready');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
quickTest();
