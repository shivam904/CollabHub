// Minimal health check for CollabHub Backend
import fetch from 'node-fetch';

async function quickHealthCheck() {
  try {
    console.log('🔍 Quick Health Check...');
    
    // Test server connection
    const response = await fetch('http://localhost:5000/health');
    if (response.ok) {
      console.log('✅ Server: Running');
    } else {
      console.log('❌ Server: Not responding');
      return false;
    }
    
    // Test database connection
    const dbResponse = await fetch('http://localhost:5000/health/db');
    if (dbResponse.ok) {
      console.log('✅ Database: Connected');
    } else {
      console.log('❌ Database: Connection issues');
      return false;
    }
    
    console.log('✅ All systems operational');
    return true;
    
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('💡 Make sure server is running: npm start');
    return false;
  }
}

quickHealthCheck(); 