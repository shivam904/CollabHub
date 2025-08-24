import queryOptimizer from '../services/queryOptimizer.js';
import cacheService from '../services/cache.js';
import mongoose from 'mongoose';

/**
 * Optimized Controller for Ultra-Fast Database Operations
 * 
 * This controller demonstrates how to use the query optimizer and caching
 * for maximum performance in real-world scenarios.
 */

/**
 * Get project with optimized caching and queries
 */
export const getOptimizedProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.uid;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const project = await queryOptimizer.getProject(projectId, userId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    if (userId && !project.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      project,
      cached: !!req.headers['x-from-cache']
    });

  } catch (error) {
    console.error('❌ Optimized project fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
};

/**
 * Get user projects with advanced filtering and caching
 */
export const getOptimizedUserProjects = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const {
      status = 'active',
      limit = 20,
      page = 1,
      includeStats = false,
      category,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const options = {
      status,
      limit: Math.min(parseInt(limit), 100), // Cap at 100
      includeStats: includeStats === 'true',
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    };

    // Create cache key that includes all parameters
    const cacheKey = `userProjects:${userId}:${JSON.stringify(options)}`;
    
    const projects = await queryOptimizer.executeQuery(
      cacheKey,
      async () => {
        const Project = mongoose.model('Project');
        let query = Project.findByUserOptimized(userId, options);
        
        // Add category filter if specified
        if (category) {
          query = query.find({ category });
        }
        
        return await query;
      },
      { ttl: 300 } // 5 minutes cache
    );

    res.status(200).json({
      success: true,
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: projects.length
      }
    });

  } catch (error) {
    console.error('❌ Optimized user projects fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user projects',
      error: error.message
    });
  }
};

/**
 * Get project files with advanced filtering and caching
 */
export const getOptimizedProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      folderId,
      fileType,
      limit = 50,
      sortBy = 'updatedAt',
      includeContent = false,
      search
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    let files;
    
    if (search) {
      // Use search with optimized indexing
      const searchOptions = {
        limit: Math.min(parseInt(limit), 100),
        includeContent: includeContent === 'true',
        fileTypes: fileType ? [fileType] : null,
        userId: req.user?.uid
      };
      
      files = await queryOptimizer.searchFiles(projectId, search, searchOptions);
    } else {
      // Use regular file listing
      const listOptions = {
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder: -1,
        includeStats: false
      };
      
      files = await queryOptimizer.getProjectFiles(projectId, folderId, listOptions);
    }

    res.status(200).json({
      success: true,
      files,
      count: files.length,
      projectId,
      folderId: folderId || null
    });

  } catch (error) {
    console.error('❌ Optimized project files fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project files',
      error: error.message
    });
  }
};

/**
 * Get folder tree with optimized caching
 */
export const getOptimizedFolderTree = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { maxDepth = 5 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const folderTree = await queryOptimizer.getFolderTree(projectId);

    res.status(200).json({
      success: true,
      folderTree,
      projectId,
      maxDepth: parseInt(maxDepth)
    });

  } catch (error) {
    console.error('❌ Optimized folder tree fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folder tree',
      error: error.message
    });
  }
};

/**
 * Get project analytics with comprehensive caching
 */
export const getOptimizedProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { days = 7 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const analytics = await queryOptimizer.getProjectAnalytics(projectId);

    res.status(200).json({
      success: true,
      analytics,
      projectId,
      period: `${days} days`
    });

  } catch (error) {
    console.error('❌ Optimized project analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project analytics',
      error: error.message
    });
  }
};

/**
 * Bulk operations with optimization
 */
export const bulkUpdateFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { updates } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates array'
      });
    }

    // Limit bulk operations to prevent abuse
    if (updates.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Bulk update limited to 100 files at once'
      });
    }

    const result = await queryOptimizer.bulkUpdateFiles(projectId, updates);

    res.status(200).json({
      success: true,
      message: 'Bulk update completed',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });

  } catch (error) {
    console.error('❌ Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk update failed',
      error: error.message
    });
  }
};

/**
 * Get performance dashboard data
 */
export const getPerformanceDashboard = async (req, res) => {
  try {
    const [queryStats, cacheStats, dbPerformance] = await Promise.all([
      queryOptimizer.getPerformanceStats(),
      cacheService.getStats(),
      queryOptimizer.analyzeDatabasePerformance()
    ]);

    const dashboard = {
      overview: {
        totalQueries: queryStats.totalQueries,
        cacheHitRate: queryStats.cacheHitRate,
        averageResponseTime: queryStats.averageResponseTime,
        slowQueriesCount: queryStats.recentSlowQueries.length
      },
      cache: {
        ...cacheStats,
        efficiency: `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
      },
      database: {
        collections: dbPerformance.collections,
        recommendations: dbPerformance.recommendations
      },
      recentSlowQueries: queryStats.recentSlowQueries.slice(-5)
    };

    res.status(200).json({
      success: true,
      dashboard,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Performance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance dashboard',
      error: error.message
    });
  }
};

/**
 * Advanced search across all data types
 */
export const globalSearch = async (req, res) => {
  try {
    const { query, type = 'all', limit = 20 } = req.query;
    const userId = req.user?.uid;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchPromises = [];
    const results = {};

    // Search projects if requested
    if (type === 'all' || type === 'projects') {
      searchPromises.push(
        queryOptimizer.executeQuery(
          `globalSearch:projects:${query}:${userId}`,
          async () => {
            const Project = mongoose.model('Project');
            return await Project.search(query, userId, Math.min(limit, 10));
          },
          { ttl: 180 } // 3 minutes cache
        ).then(projects => { results.projects = projects; })
      );
    }

    // Search files if requested
    if (type === 'all' || type === 'files') {
      // Get user's projects first
      const userProjects = await queryOptimizer.getUserProjects(userId, { limit: 50 });
      
      for (const project of userProjects.slice(0, 5)) { // Limit to 5 most recent projects
        searchPromises.push(
          queryOptimizer.searchFiles(project._id, query, { limit: 5 })
        );
      }
    }

    await Promise.all(searchPromises);

    // Flatten file results if they exist
    if (results.files) {
      results.files = results.files.flat();
    }

    res.status(200).json({
      success: true,
      query,
      results,
      totalResults: Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    });

  } catch (error) {
    console.error('❌ Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

/**
 * Get trending projects based on activity
 */
export const getTrendingProjects = async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    const cacheKey = `trending:projects:${days}:${limit}`;
    
    const trendingProjects = await queryOptimizer.executeQuery(
      cacheKey,
      async () => {
        const Project = mongoose.model('Project');
        return await Project.getTrending(parseInt(limit), parseInt(days));
      },
      { ttl: 1800 } // 30 minutes cache
    );

    res.status(200).json({
      success: true,
      trendingProjects,
      period: `${days} days`,
      count: trendingProjects.length
    });

  } catch (error) {
    console.error('❌ Trending projects fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending projects',
      error: error.message
    });
  }
};
