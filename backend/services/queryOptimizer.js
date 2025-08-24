import mongoose from 'mongoose';
import cacheService from './cache.js';

/**
 * Advanced Query Optimizer for Ultra-Fast Database Operations
 * 
 * This service provides optimized query patterns, caching strategies,
 * and performance monitoring for MongoDB operations.
 */
class QueryOptimizer {
  constructor() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      databaseQueries: 0,
      averageResponseTime: 0,
      slowQueries: []
    };
  }

  /**
   * Execute a query with automatic caching and performance monitoring
   * @param {string} cacheKey - Cache key for this query
   * @param {Function} queryFn - Function that returns the MongoDB query
   * @param {Object} options - Caching and optimization options
   */
  async executeQuery(cacheKey, queryFn, options = {}) {
    const {
      ttl = 600, // 10 minutes default cache
      skipCache = false,
      trackPerformance = true,
      useAggregation = false
    } = options;

    const startTime = Date.now();
    this.queryStats.totalQueries++;

    try {
      // Try cache first unless skipped
      if (!skipCache) {
        const cachedResult = await cacheService.get(cacheKey);
        if (cachedResult) {
          this.queryStats.cachedQueries++;
          const responseTime = Date.now() - startTime;
          
          if (trackPerformance) {
            this.updatePerformanceStats(responseTime, true);
          }
          
          console.log(`🎯 Query served from cache: ${cacheKey} (${responseTime}ms)`);
          return cachedResult;
        }
      }

      // Execute database query
      console.log(`🔍 Executing database query: ${cacheKey}`);
      const result = await queryFn();
      
      const responseTime = Date.now() - startTime;
      this.queryStats.databaseQueries++;

      // Cache the result
      if (!skipCache && result) {
        await cacheService.set(cacheKey, result, ttl);
      }

      if (trackPerformance) {
        this.updatePerformanceStats(responseTime, false);
        
        // Track slow queries
        if (responseTime > 1000) { // Queries taking more than 1 second
          this.queryStats.slowQueries.push({
            cacheKey,
            responseTime,
            timestamp: new Date(),
            fromCache: false
          });
          
          // Keep only last 50 slow queries
          if (this.queryStats.slowQueries.length > 50) {
            this.queryStats.slowQueries = this.queryStats.slowQueries.slice(-50);
          }
          
          console.warn(`🐌 Slow query detected: ${cacheKey} (${responseTime}ms)`);
        }
      }

      console.log(`✅ Database query completed: ${cacheKey} (${responseTime}ms)`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Query failed: ${cacheKey} (${responseTime}ms)`, error.message);
      
      if (trackPerformance) {
        this.updatePerformanceStats(responseTime, false, error);
      }
      
      throw error;
    }
  }

  /**
   * Optimized Project Queries
   */
  async getProject(projectId, userId = null) {
    const cacheKey = cacheService.generateKey.project(projectId, userId);
    
    return this.executeQuery(cacheKey, async () => {
      const Project = mongoose.model('Project');
      
      // Use aggregation for complex project data with permissions
      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(projectId) } },
        {
          $lookup: {
            from: 'folders',
            localField: 'rootFolders',
            foreignField: '_id',
            as: 'rootFolders',
            pipeline: [
              { $project: { name: 1, path: 1, files: 1, subfolders: 1 } }
            ]
          }
        },
        {
          $addFields: {
            memberCount: { $size: '$members' },
            hasAccess: userId ? {
              $or: [
                { $eq: ['$creatorId', userId] },
                { $in: [userId, '$members.userId'] }
              ]
            } : true
          }
        }
      ];

      const result = await Project.aggregate(pipeline);
      return result[0] || null;
    }, { ttl: 1800 }); // 30 minutes cache
  }

  async getUserProjects(userId, options = {}) {
    const { status = 'active', limit = 50, includeStats = false } = options;
    const cacheKey = cacheService.generateKey.userProjects(userId);
    
    return this.executeQuery(cacheKey, async () => {
      const Project = mongoose.model('Project');
      return await Project.findByUserOptimized(userId, {
        status,
        limit,
        includeStats
      });
    }, { ttl: 600 }); // 10 minutes cache
  }

  async getProjectFiles(projectId, folderId = null, options = {}) {
    const cacheKey = cacheService.generateKey.fileList(projectId, folderId);
    
    return this.executeQuery(cacheKey, async () => {
      const File = mongoose.model('File');
      return await File.listFiles(projectId, folderId, options);
    }, { ttl: 300 }); // 5 minutes cache
  }

  async searchFiles(projectId, query, options = {}) {
    const cacheKey = cacheService.generateKey.search(query, 'files', projectId);
    
    return this.executeQuery(cacheKey, async () => {
      const File = mongoose.model('File');
      return await File.search(projectId, query, options);
    }, { ttl: 300 }); // 5 minutes cache
  }

  async getFolderTree(projectId) {
    const cacheKey = cacheService.generateKey.folderTree(projectId);
    
    return this.executeQuery(cacheKey, async () => {
      const Folder = mongoose.model('Folder');
      return await Folder.getFolderTree(projectId);
    }, { ttl: 900 }); // 15 minutes cache
  }

  /**
   * Advanced Analytics Queries
   */
  async getProjectAnalytics(projectId) {
    const cacheKey = `analytics:project:${projectId}`;
    
    return this.executeQuery(cacheKey, async () => {
      const File = mongoose.model('File');
      const Folder = mongoose.model('Folder');
      
      // Use Promise.all for parallel execution
      const [fileStats, folderStats, recentActivity] = await Promise.all([
        File.getProjectFileStats(projectId),
        Folder.getFolderStats(projectId),
        this.getRecentActivity(projectId)
      ]);

      return {
        files: fileStats[0] || {},
        folders: folderStats[0] || {},
        recentActivity,
        generatedAt: new Date()
      };
    }, { ttl: 1800 }); // 30 minutes cache
  }

  async getRecentActivity(projectId, days = 7) {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const File = mongoose.model('File');
    
    return await File.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          updatedAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            user: '$lastModifiedBy'
          },
          fileCount: { $sum: 1 },
          files: { $push: { name: '$name', updatedAt: '$updatedAt' } }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          activities: {
            $push: {
              user: '$_id.user',
              fileCount: '$fileCount',
              files: '$files'
            }
          },
          totalFiles: { $sum: '$fileCount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: days }
    ]);
  }

  /**
   * Bulk Operations with Optimization
   */
  async bulkUpdateFiles(projectId, updates) {
    console.log(`🔄 Bulk updating ${updates.length} files in project ${projectId}`);
    
    const File = mongoose.model('File');
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.fileId, project: projectId },
        update: { $set: update.data }
      }
    }));

    const result = await File.bulkWrite(bulkOps, { ordered: false });
    
    // Invalidate related caches
    await cacheService.invalidateProject(projectId);
    
    console.log(`✅ Bulk update completed: ${result.modifiedCount} files updated`);
    return result;
  }

  async bulkCreateFiles(projectId, files) {
    console.log(`📁 Bulk creating ${files.length} files in project ${projectId}`);
    
    const File = mongoose.model('File');
    const filesToCreate = files.map(file => ({
      ...file,
      project: projectId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await File.insertMany(filesToCreate, { ordered: false });
    
    // Invalidate related caches
    await cacheService.invalidateProject(projectId);
    
    console.log(`✅ Bulk creation completed: ${result.length} files created`);
    return result;
  }

  /**
   * Performance Monitoring
   */
  updatePerformanceStats(responseTime, fromCache, error = null) {
    // Update average response time (rolling average of last 1000 queries)
    const currentAvg = this.queryStats.averageResponseTime;
    const totalQueries = this.queryStats.totalQueries;
    
    if (totalQueries <= 1000) {
      this.queryStats.averageResponseTime = (currentAvg * (totalQueries - 1) + responseTime) / totalQueries;
    } else {
      // Rolling average for large numbers
      this.queryStats.averageResponseTime = currentAvg * 0.999 + responseTime * 0.001;
    }
  }

  getPerformanceStats() {
    const cacheHitRate = this.queryStats.totalQueries > 0 
      ? (this.queryStats.cachedQueries / this.queryStats.totalQueries * 100).toFixed(2)
      : 0;

    return {
      ...this.queryStats,
      cacheHitRate: `${cacheHitRate}%`,
      averageResponseTime: `${Math.round(this.queryStats.averageResponseTime)}ms`,
      recentSlowQueries: this.queryStats.slowQueries.slice(-10)
    };
  }

  /**
   * Query Optimization Helpers
   */
  createOptimizedProjection(fields) {
    return fields.reduce((projection, field) => {
      projection[field] = 1;
      return projection;
    }, {});
  }

  createDateRangeQuery(field, days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return { [field]: { $gte: date } };
  }

  createPaginationPipeline(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return [
      { $skip: skip },
      { $limit: limit },
      {
        $facet: {
          data: [{ $skip: 0 }, { $limit: limit }],
          count: [{ $count: 'total' }]
        }
      },
      {
        $project: {
          data: 1,
          total: { $arrayElemAt: ['$count.total', 0] },
          page: { $literal: page },
          limit: { $literal: limit },
          hasNext: {
            $gt: [{ $arrayElemAt: ['$count.total', 0] }, skip + limit]
          }
        }
      }
    ];
  }

  /**
   * Database Health and Optimization
   */
  async analyzeDatabasePerformance() {
    try {
      const db = mongoose.connection.db;
      
      // Get collection stats
      const collections = ['users', 'projects', 'files', 'folders'];
      const stats = {};
      
      for (const collectionName of collections) {
        try {
          const collStats = await db.collection(collectionName).stats();
          stats[collectionName] = {
            count: collStats.count,
            size: Math.round(collStats.size / 1024 / 1024 * 100) / 100, // MB
            avgObjSize: Math.round(collStats.avgObjSize),
            indexes: collStats.nindexes,
            totalIndexSize: Math.round(collStats.totalIndexSize / 1024 / 1024 * 100) / 100 // MB
          };
        } catch (error) {
          stats[collectionName] = { error: error.message };
        }
      }
      
      return {
        collections: stats,
        queryOptimizer: this.getPerformanceStats(),
        cache: await cacheService.getStats(),
        recommendations: this.generateOptimizationRecommendations(stats)
      };
      
    } catch (error) {
      console.error('❌ Database performance analysis failed:', error);
      return { error: error.message };
    }
  }

  generateOptimizationRecommendations(stats) {
    const recommendations = [];
    
    Object.entries(stats).forEach(([collection, data]) => {
      if (data.error) return;
      
      // Check for large average object size
      if (data.avgObjSize > 10000) { // 10KB
        recommendations.push({
          type: 'warning',
          collection,
          message: `Large average document size (${data.avgObjSize} bytes). Consider document optimization.`,
          suggestion: 'Review document structure and remove unnecessary fields'
        });
      }
      
      // Check index to data ratio
      const indexRatio = data.totalIndexSize / data.size;
      if (indexRatio > 0.5) {
        recommendations.push({
          type: 'info',
          collection,
          message: `High index to data ratio (${Math.round(indexRatio * 100)}%). Consider index optimization.`,
          suggestion: 'Review and remove unused indexes'
        });
      }
      
      // Check for collections with low index usage
      if (data.nindexes < 3 && data.count > 1000) {
        recommendations.push({
          type: 'suggestion',
          collection,
          message: `Consider adding more indexes for better query performance`,
          suggestion: 'Analyze query patterns and add strategic indexes'
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Cache Management
   */
  async warmupCache(projectIds = []) {
    console.log(`🔥 Warming up cache for ${projectIds.length} projects...`);
    
    const warmupPromises = projectIds.map(async (projectId) => {
      try {
        // Warmup common queries
        await Promise.all([
          this.getProject(projectId),
          this.getProjectFiles(projectId),
          this.getFolderTree(projectId),
          this.getProjectAnalytics(projectId)
        ]);
        
        console.log(`✅ Cache warmed up for project: ${projectId}`);
      } catch (error) {
        console.error(`❌ Cache warmup failed for project ${projectId}:`, error.message);
      }
    });
    
    await Promise.all(warmupPromises);
    console.log(`🔥 Cache warmup completed for all projects`);
  }

  async invalidateProjectCache(projectId) {
    await cacheService.invalidateProject(projectId);
    console.log(`🧹 Cache invalidated for project: ${projectId}`);
  }

  async clearAllCache() {
    await cacheService.invalidatePattern('*');
    console.log(`🧹 All cache cleared`);
  }
}

// Singleton instance
const queryOptimizer = new QueryOptimizer();

export default queryOptimizer;
