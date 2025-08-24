import { createClient } from 'redis';
import { promisify } from 'util';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    this.defaultTTL = 3600; // 1 hour default
  }

  async connect() {
    try {
      // Use Redis if available, otherwise create in-memory cache
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 5) return new Error('Too many retries');
            return Math.min(retries * 50, 500);
          }
        },
        database: process.env.REDIS_DB || 0
      });

      this.client.on('error', (err) => {
        console.warn('⚠️  Redis connection error, falling back to memory cache:', err.message);
        this.isConnected = false;
        this.cacheStats.errors++;
        this.fallbackToMemoryCache();
      });

      this.client.on('connect', () => {
        console.log('🔗 Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready for operations');
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      console.log('🚀 Redis cache service initialized');
      
    } catch (error) {
      console.warn('⚠️  Redis not available, using in-memory cache:', error.message);
      this.fallbackToMemoryCache();
    }
  }

  fallbackToMemoryCache() {
    // Fallback to in-memory cache
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
    this.isConnected = false;
    console.log('🧠 Using in-memory cache as fallback');
  }

  async get(key) {
    try {
      const startTime = Date.now();
      let value;

      if (this.isConnected && this.client) {
        value = await this.client.get(key);
      } else {
        // Memory cache fallback
        const cached = this.memoryCache?.get(key);
        value = cached ? JSON.stringify(cached) : null;
      }

      const responseTime = Date.now() - startTime;
      
      if (value) {
        this.cacheStats.hits++;
        console.log(`🎯 Cache HIT for key: ${key} (${responseTime}ms)`);
        return JSON.parse(value);
      } else {
        this.cacheStats.misses++;
        console.log(`❌ Cache MISS for key: ${key} (${responseTime}ms)`);
        return null;
      }
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache get error:', error.message);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const startTime = Date.now();
      const serializedValue = JSON.stringify(value);

      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        // Memory cache fallback
        if (this.memoryCache) {
          this.memoryCache.set(key, value);
          
          // Set timer for TTL
          if (this.cacheTimers?.has(key)) {
            clearTimeout(this.cacheTimers.get(key));
          }
          
          const timer = setTimeout(() => {
            this.memoryCache?.delete(key);
            this.cacheTimers?.delete(key);
          }, ttl * 1000);
          
          this.cacheTimers?.set(key, timer);
        }
      }

      this.cacheStats.sets++;
      const responseTime = Date.now() - startTime;
      console.log(`💾 Cache SET for key: ${key} (${responseTime}ms, TTL: ${ttl}s)`);
      
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache set error:', error.message);
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        // Memory cache fallback
        if (this.memoryCache?.has(key)) {
          this.memoryCache.delete(key);
          if (this.cacheTimers?.has(key)) {
            clearTimeout(this.cacheTimers.get(key));
            this.cacheTimers.delete(key);
          }
        }
      }

      this.cacheStats.deletes++;
      console.log(`🗑️  Cache DELETE for key: ${key}`);
      
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache delete error:', error.message);
    }
  }

  async mget(keys) {
    try {
      if (this.isConnected && this.client) {
        const values = await this.client.mGet(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      } else {
        // Memory cache fallback
        return keys.map(key => this.memoryCache?.get(key) || null);
      }
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache mget error:', error.message);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      if (this.isConnected && this.client) {
        const pipeline = this.client.multi();
        
        for (const [key, value] of keyValuePairs) {
          pipeline.setEx(key, ttl, JSON.stringify(value));
        }
        
        await pipeline.exec();
      } else {
        // Memory cache fallback
        for (const [key, value] of keyValuePairs) {
          await this.set(key, value, ttl);
        }
      }

      this.cacheStats.sets += keyValuePairs.length;
      
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache mset error:', error.message);
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          console.log(`🧹 Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        }
      } else {
        // Memory cache fallback - simple pattern matching
        const keysToDelete = [];
        if (this.memoryCache) {
          for (const key of this.memoryCache.keys()) {
            if (key.includes(pattern.replace('*', ''))) {
              keysToDelete.push(key);
            }
          }
          
          for (const key of keysToDelete) {
            await this.del(key);
          }
        }
      }
    } catch (error) {
      this.cacheStats.errors++;
      console.error('❌ Cache pattern invalidation error:', error.message);
    }
  }

  // Cache key generators for different data types
  generateKey = {
    project: (projectId, userId = null) => {
      return userId ? `project:${projectId}:user:${userId}` : `project:${projectId}`;
    },
    
    projectList: (userId) => `projects:user:${userId}`,
    
    file: (fileId, projectId = null) => {
      return projectId ? `file:${fileId}:project:${projectId}` : `file:${fileId}`;
    },
    
    fileList: (projectId, folderId = null) => {
      return folderId ? `files:project:${projectId}:folder:${folderId}` : `files:project:${projectId}`;
    },
    
    folder: (folderId, projectId = null) => {
      return projectId ? `folder:${folderId}:project:${projectId}` : `folder:${folderId}`;
    },
    
    folderTree: (projectId) => `folderTree:project:${projectId}`,
    
    user: (userId) => `user:${userId}`,
    
    userProjects: (userId) => `userProjects:${userId}`,
    
    search: (query, type, projectId = null) => {
      return projectId ? `search:${type}:${query}:project:${projectId}` : `search:${type}:${query}`;
    },
    
    stats: (projectId) => `stats:project:${projectId}`
  };

  // High-level caching methods
  async cacheProject(project, ttl = 1800) { // 30 minutes
    const key = this.generateKey.project(project._id);
    await this.set(key, project, ttl);
  }

  async getCachedProject(projectId) {
    const key = this.generateKey.project(projectId);
    return await this.get(key);
  }

  async cacheFileList(files, projectId, folderId = null, ttl = 600) { // 10 minutes
    const key = this.generateKey.fileList(projectId, folderId);
    await this.set(key, files, ttl);
  }

  async getCachedFileList(projectId, folderId = null) {
    const key = this.generateKey.fileList(projectId, folderId);
    return await this.get(key);
  }

  async cacheSearchResults(query, type, results, projectId = null, ttl = 300) { // 5 minutes
    const key = this.generateKey.search(query, type, projectId);
    await this.set(key, results, ttl);
  }

  async getCachedSearchResults(query, type, projectId = null) {
    const key = this.generateKey.search(query, type, projectId);
    return await this.get(key);
  }

  // Cache invalidation helpers
  async invalidateProject(projectId) {
    await this.invalidatePattern(`*project:${projectId}*`);
  }

  async invalidateUser(userId) {
    await this.invalidatePattern(`*user:${userId}*`);
  }

  async invalidateFile(fileId) {
    await this.invalidatePattern(`*file:${fileId}*`);
  }

  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      memoryCache: this.memoryCache ? {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()).slice(0, 10) // First 10 keys for debugging
      } : null
    };
  }

  async healthCheck() {
    try {
      if (this.isConnected && this.client) {
        const start = Date.now();
        await this.client.ping();
        return {
          healthy: true,
          type: 'redis',
          responseTime: Date.now() - start,
          stats: this.getStats()
        };
      } else {
        return {
          healthy: true,
          type: 'memory',
          cacheSize: this.memoryCache?.size || 0,
          stats: this.getStats()
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        stats: this.getStats()
      };
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        console.log('📴 Redis connection closed');
      }
      
      // Clear memory cache
      if (this.memoryCache) {
        this.memoryCache.clear();
      }
      
      if (this.cacheTimers) {
        for (const timer of this.cacheTimers.values()) {
          clearTimeout(timer);
        }
        this.cacheTimers.clear();
      }
      
    } catch (error) {
      console.error('❌ Error disconnecting cache:', error.message);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
