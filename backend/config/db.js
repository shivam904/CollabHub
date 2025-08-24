import mongoose from 'mongoose';
import { EventEmitter } from 'events';

// Connection event emitter for monitoring
const dbEventEmitter = new EventEmitter();

// Connection statistics
const connectionStats = {
  connectionsCreated: 0,
  connectionsDestroyed: 0,
  activeConnections: 0,
  queriesExecuted: 0,
  queryErrors: 0,
  lastConnectionTime: null,
  averageResponseTime: 0,
  responseTimes: []
};

// Performance monitoring
class DatabaseMonitor {
  static trackQuery(startTime, error = null) {
    const responseTime = Date.now() - startTime;
    connectionStats.queriesExecuted++;
    
    if (error) {
      connectionStats.queryErrors++;
    }
    
    // Track response times (keep last 100)
    connectionStats.responseTimes.push(responseTime);
    if (connectionStats.responseTimes.length > 100) {
      connectionStats.responseTimes.shift();
    }
    
    // Calculate average response time
    connectionStats.averageResponseTime = 
      connectionStats.responseTimes.reduce((a, b) => a + b, 0) / 
      connectionStats.responseTimes.length;
      
    dbEventEmitter.emit('queryCompleted', { responseTime, error });
  }
  
  static getStats() {
    return {
      ...connectionStats,
      poolStats: {
        available: mongoose.connection?.db?.serverConfig?.s?.pool?.availableConnections || 0,
        inUse: mongoose.connection?.db?.serverConfig?.s?.pool?.inUseConnections || 0,
        created: mongoose.connection?.db?.serverConfig?.s?.pool?.totalConnectionsCreated || 0
      },
      readyState: mongoose.connection.readyState,
      readyStateText: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[mongoose.connection.readyState]
    };
  }
}

const connectDB = async () => {
  try {
    // Configure mongoose for optimal performance
    mongoose.set('strictQuery', false);
    // Keep buffering enabled to prevent connection timing issues
    mongoose.set('bufferCommands', true);
    
    const mongoOptions = {
      // Connection timeouts
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 10000,
      
      // Connection pool for high performance
      maxPoolSize: 25,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Read/Write preferences
      readPreference: 'primary',
      
      // Other options
      family: 4,
      appName: 'CollabHub-Backend'
    };

    const startTime = Date.now();
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/collabhub',
      mongoOptions
    );
    
    connectionStats.lastConnectionTime = new Date();
    connectionStats.connectionsCreated++;
    connectionStats.activeConnections++;
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`⚡ Connection time: ${Date.now() - startTime}ms`);
    console.log(`🔗 Pool size: ${mongoOptions.maxPoolSize} (min: ${mongoOptions.minPoolSize})`);
    console.log(`📊 Read preference: ${mongoOptions.readPreference}`);
    
    // Advanced connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
      connectionStats.queryErrors++;
      dbEventEmitter.emit('connectionError', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      connectionStats.activeConnections--;
      connectionStats.connectionsDestroyed++;
      dbEventEmitter.emit('disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully');
      connectionStats.activeConnections++;
      dbEventEmitter.emit('reconnected');
    });
    
    mongoose.connection.on('fullsetup', () => {
      console.log('🎯 MongoDB replica set fully connected');
    });
    
    // Add query monitoring
    mongoose.connection.on('command', (command) => {
      const startTime = Date.now();
      dbEventEmitter.emit('queryStarted', { command, startTime });
    });
    
    // Initialize connection optimizations
    optimizeConnection();
    
    // Handle app termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Retry connection after 5 seconds, but limit retries
    if (!global.mongoRetryCount) {
      global.mongoRetryCount = 0;
    }
    
    if (global.mongoRetryCount < 3) {
      global.mongoRetryCount++;
      setTimeout(() => {
        console.log(`🔄 Retrying MongoDB connection (attempt ${global.mongoRetryCount}/3)...`);
        connectDB();
      }, 5000);
    } else {
      console.error('❌ Maximum retry attempts reached. Please check your MongoDB connection.');
    }
  }
};

// Enhanced health check with detailed metrics
export const checkDBHealth = async () => {
  try {
    const startTime = Date.now();
    
    if (mongoose.connection.readyState === 1) {
      // Ping database
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - startTime;
      
      // Get database stats
      const dbStats = await mongoose.connection.db.stats();
      
      // Get server status
      const serverStatus = await mongoose.connection.db.admin().serverStatus();
      
      return {
        healthy: true,
        state: 'connected',
        pingTime: `${pingTime}ms`,
        stats: DatabaseMonitor.getStats(),
        database: {
          collections: dbStats.collections,
          dataSize: `${Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100} MB`,
          storageSize: `${Math.round(dbStats.storageSize / 1024 / 1024 * 100) / 100} MB`,
          indexes: dbStats.indexes,
          objects: dbStats.objects
        },
        server: {
          version: serverStatus.version,
          uptime: `${Math.round(serverStatus.uptime / 3600)} hours`,
          connections: serverStatus.connections,
          opcounters: serverStatus.opcounters
        }
      };
    } else {
      return {
        healthy: false,
        state: mongoose.connection.readyState,
        stats: DatabaseMonitor.getStats()
      };
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      stats: DatabaseMonitor.getStats()
    };
  }
};

// Connection pool optimization
export const optimizeConnection = () => {
  // Warm up the connection pool
  const warmUpPool = async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        const promises = [];
        for (let i = 0; i < 5; i++) { // Use fixed number instead of mongoOptions
          promises.push(mongoose.connection.db.admin().ping());
        }
        await Promise.all(promises);
        console.log('🔥 Connection pool warmed up successfully');
      }
    } catch (error) {
      console.warn('⚠️  Pool warm-up failed:', error.message);
    }
  };
  
  // Delay warmup to ensure connection is established
  setTimeout(warmUpPool, 2000);
  
  // Regular health checks
  setInterval(async () => {
    try {
      const health = await checkDBHealth();
      if (!health.healthy) {
        console.warn('⚠️  Database health check failed:', health);
      }
    } catch (error) {
      console.error('❌ Health check error:', error.message);
    }
  }, 30000); // Every 30 seconds
};

// Performance monitoring export
export const getPerformanceStats = () => DatabaseMonitor.getStats();
export const trackQueryPerformance = (startTime, error) => DatabaseMonitor.trackQuery(startTime, error);
export { dbEventEmitter };

export default connectDB;
