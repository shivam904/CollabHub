import { getDockerWorkspaceManager } from './dockerWorkspace.js';
import { EventEmitter } from 'events';

/**
 * Terminal File Watcher Service
 * 
 * Monitors file changes in Docker containers and syncs them to the database.
 * Provides real-time file synchronization for terminal-based file operations.
 */
class TerminalFileWatcher extends EventEmitter {
  constructor() {
    super();
    
    // Active watchers for each project
    this.activeWatchers = new Map(); // projectId -> watcher info
    
    // File state tracking for detecting changes
    this.lastFileStates = new Map(); // projectId -> Map<filePath, {content, mtime}>
    
    // Error tracking and retry logic
    this.errorCounts = new Map(); // projectId -> error count
    this.maxRetries = 3;
    
    // Performance tracking
    this.syncStats = new Map(); // projectId -> {lastSync, syncCount, avgSyncTime}
    
    // Configuration
    this.scanInterval = 2000; // 2 seconds for faster detection
    this.immediateSyncDelay = 1000; // 1 second delay for immediate sync
    
    // Common subdirectories to scan
    this.commonSubdirs = [
      'src', 'lib', 'app', 'components', 'pages', 'utils', 
      'config', 'public', 'assets', 'styles', 'scripts',
      'models', 'controllers', 'routes', 'middleware',
      'tests', 'test', '__tests__', 'spec', 'docs'
    ];
    
    console.log('🔍 Terminal File Watcher initialized');
  }

  /**
   * Start watching a project for file changes
   */
  async startWatching(projectId, userId) {
    try {
      // Check if already watching
      if (this.activeWatchers.has(projectId)) {
        console.log(`📡 Already watching project: ${projectId}`);
        return true;
      }

      console.log(`🔍 Starting file watcher for project: ${projectId}`);

      // Initialize watcher state
      const watcherInfo = {
        projectId,
        userId,
        isActive: true,
        startTime: Date.now(),
        lastScan: null,
        scanCount: 0,
        errorCount: 0,
        intervalId: null
      };

      this.activeWatchers.set(projectId, watcherInfo);
      this.errorCounts.set(projectId, 0);
      this.syncStats.set(projectId, {
        lastSync: null,
        syncCount: 0,
        avgSyncTime: 0
      });

      // Initialize file states
      await this.initializeFileStates(projectId);

      // Start periodic scanning
      const intervalId = setInterval(async () => {
        await this.scanProjectFiles(projectId);
      }, this.scanInterval);

      watcherInfo.intervalId = intervalId;

      // Emit watcher started event
      this.emit('watcher:started', { projectId, userId });

      console.log(`✅ File watcher started for project: ${projectId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to start file watcher for project ${projectId}:`, error);
      this.cleanupWatcher(projectId);
      return false;
    }
  }

  /**
   * Stop watching a specific project
   */
  async stopWatching(projectId) {
    try {
      const watcherInfo = this.activeWatchers.get(projectId);
      
      if (!watcherInfo) {
        console.log(`📡 No active watcher for project: ${projectId}`);
        return true;
      }

      console.log(`🛑 Stopping file watcher for project: ${projectId}`);

      // Clear interval
      if (watcherInfo.intervalId) {
        clearInterval(watcherInfo.intervalId);
      }

      // Cleanup watcher
      this.cleanupWatcher(projectId);

      // Emit watcher stopped event
      this.emit('watcher:stopped', { projectId });

      console.log(`✅ File watcher stopped for project: ${projectId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to stop file watcher for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Emergency stop all watchers
   */
  emergencyStop() {
    console.log('🚨 Emergency stopping all file watchers');
    
    for (const [projectId, watcherInfo] of this.activeWatchers) {
      if (watcherInfo.intervalId) {
        clearInterval(watcherInfo.intervalId);
      }
    }
    
    this.activeWatchers.clear();
    this.errorCounts.clear();
    this.syncStats.clear();
    this.lastFileStates.clear();
    
    console.log('✅ All file watchers emergency stopped');
  }

  /**
   * Stop all watchers gracefully
   */
  async stopAll() {
    console.log('🛑 Stopping all file watchers gracefully');
    
    const stopPromises = Array.from(this.activeWatchers.keys()).map(projectId => 
      this.stopWatching(projectId)
    );
    
    await Promise.allSettled(stopPromises);
    console.log('✅ All file watchers stopped gracefully');
  }

  /**
   * Force sync files for a project
   */
  async forcSync(projectId, userId) {
    try {
      console.log(`🔄 Force syncing files for project: ${projectId}`);
      
      const startTime = Date.now();
      
      // Get Docker workspace manager
      const dockerManager = getDockerWorkspaceManager();
      
      // Trigger manual sync
      const syncResult = await dockerManager.triggerSync(projectId);
      
      // Update sync stats
      const syncTime = Date.now() - startTime;
      const stats = this.syncStats.get(projectId) || { syncCount: 0, avgSyncTime: 0 };
      stats.lastSync = new Date();
      stats.syncCount++;
      stats.avgSyncTime = (stats.avgSyncTime * (stats.syncCount - 1) + syncTime) / stats.syncCount;
      this.syncStats.set(projectId, stats);
      
      // Reset error count on successful sync
      this.errorCounts.set(projectId, 0);
      
      // Emit sync completed event
      this.emit('sync:completed', { 
        projectId, 
        userId, 
        result: syncResult,
        syncTime 
      });
      
      console.log(`✅ Force sync completed for project: ${projectId}`);
      return {
        success: true,
        result: syncResult,
        syncTime
      };

    } catch (error) {
      console.error(`❌ Force sync failed for project ${projectId}:`, error);
      
      // Increment error count
      const errorCount = (this.errorCounts.get(projectId) || 0) + 1;
      this.errorCounts.set(projectId, errorCount);
      
      // Emit sync error event
      this.emit('sync:error', { 
        projectId, 
        userId, 
        error: error.message,
        errorCount 
      });
      
      return {
        success: false,
        error: error.message,
        errorCount
      };
    }
  }

  /**
   * Get watcher status for a project
   */
  getWatcherStatus(projectId) {
    const watcherInfo = this.activeWatchers.get(projectId);
    const errorCount = this.errorCounts.get(projectId) || 0;
    const stats = this.syncStats.get(projectId);
    
    if (!watcherInfo) {
      return {
        isActive: false,
        projectId,
        errorCount: 0,
        lastSync: null,
        syncCount: 0
      };
    }
    
    return {
      isActive: watcherInfo.isActive,
      projectId,
      startTime: watcherInfo.startTime,
      lastScan: watcherInfo.lastScan,
      scanCount: watcherInfo.scanCount,
      errorCount,
      lastSync: stats?.lastSync || null,
      syncCount: stats?.syncCount || 0,
      avgSyncTime: stats?.avgSyncTime || 0
    };
  }

  /**
   * Get all watcher statuses
   */
  getAllWatcherStatuses() {
    const statuses = {};
    
    for (const [projectId] of this.activeWatchers) {
      statuses[projectId] = this.getWatcherStatus(projectId);
    }
    
    return statuses;
  }

  /**
   * Initialize file states for a project
   */
  async initializeFileStates(projectId) {
    try {
      const dockerManager = getDockerWorkspaceManager();
      const containerFiles = await dockerManager.listFilesInContainer(projectId);
      
      const fileStates = new Map();
      
      for (const filePath of containerFiles) {
        try {
          const fileContent = await dockerManager.readFileFromContainer(projectId, filePath);
          if (fileContent) {
            fileStates.set(filePath, {
              content: fileContent,
              mtime: Date.now()
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to read file state for ${filePath}: ${error.message}`);
        }
      }
      
      this.lastFileStates.set(projectId, fileStates);
      console.log(`📊 Initialized file states for ${fileStates.size} files in project: ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize file states for project ${projectId}:`, error);
    }
  }

  /**
   * Scan project files for changes
   */
  async scanProjectFiles(projectId) {
    const watcherInfo = this.activeWatchers.get(projectId);
    if (!watcherInfo || !watcherInfo.isActive) {
      return;
    }

    try {
      watcherInfo.lastScan = new Date();
      watcherInfo.scanCount++;
      
      const dockerManager = getDockerWorkspaceManager();
      
      // Get current files from container
      const currentFiles = await this.getAllContainerFiles(projectId);
      const lastStates = this.lastFileStates.get(projectId) || new Map();
      
      // Check for changes
      const changes = [];
      
      for (const filePath of currentFiles) {
        try {
          const currentContent = await dockerManager.readFileFromContainer(projectId, filePath);
          const lastState = lastStates.get(filePath);
          
          if (!lastState || lastState.content !== currentContent) {
            changes.push({
              filePath,
              action: lastState ? 'modified' : 'created',
              content: currentContent
            });
            
            // Update file state
            lastStates.set(filePath, {
              content: currentContent,
              mtime: Date.now()
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to check file ${filePath}: ${error.message}`);
        }
      }
      
      // Check for deleted files
      for (const [filePath] of lastStates) {
        if (!currentFiles.includes(filePath)) {
          changes.push({
            filePath,
            action: 'deleted'
          });
          lastStates.delete(filePath);
        }
      }
      
      // Update file states
      this.lastFileStates.set(projectId, lastStates);
      
      // Trigger sync if changes detected
      if (changes.length > 0) {
        console.log(`🔄 Detected ${changes.length} file changes in project: ${projectId}`);
        
        // Emit changes detected event
        this.emit('changes:detected', { 
          projectId, 
          changes,
          userId: watcherInfo.userId 
        });
        
        // Trigger immediate sync
        setTimeout(async () => {
          await this.forcSync(projectId, watcherInfo.userId);
        }, this.immediateSyncDelay);
      }
      
    } catch (error) {
      console.error(`❌ File scan failed for project ${projectId}:`, error);
      
      // Increment error count
      const errorCount = (this.errorCounts.get(projectId) || 0) + 1;
      this.errorCounts.set(projectId, errorCount);
      
      // Stop watcher if too many errors
      if (errorCount >= this.maxRetries) {
        console.warn(`⚠️ Too many errors for project ${projectId}, stopping watcher`);
        await this.stopWatching(projectId);
      }
    }
  }

  /**
   * Get all container files including subdirectories
   */
  async getAllContainerFiles(projectId) {
    try {
      const dockerManager = getDockerWorkspaceManager();
      
      // Get ALL files recursively from the workspace using find command
      const containerInfo = await dockerManager.getProjectContainer(projectId);
      
      const result = await dockerManager.executeInContainer(containerInfo.container, [
        'find', '/workspace', '-type', 'f', '-not', '-path', '*/node_modules/*', 
        '-not', '-path', '*/.git/*', '-not', '-path', '*/.tmp/*', 
        '-not', '-path', '*/.temp/*', '-printf', '%P\n'
      ]);

      if (!result.output) {
        return [];
      }

      const allFiles = result.output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(file => {
          // Additional filtering
          if (file.includes('\\') || file.match(/[<>:"|?*]/)) return false;
          if (file.endsWith('~') || file.endsWith('.tmp') || file.endsWith('.temp')) return false;
          if (file.startsWith('.') && !file.includes('/')) return false; // Skip hidden files in root
          return true;
        });

      return allFiles;
      
    } catch (error) {
      console.error(`❌ Failed to get container files for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Cleanup watcher resources
   */
  cleanupWatcher(projectId) {
    this.activeWatchers.delete(projectId);
    this.errorCounts.delete(projectId);
    this.syncStats.delete(projectId);
    this.lastFileStates.delete(projectId);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      activeWatchers: this.activeWatchers.size,
      totalErrorCount: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      totalSyncCount: Array.from(this.syncStats.values()).reduce((sum, stats) => sum + stats.syncCount, 0),
      avgSyncTime: 0
    };
    
    // Calculate average sync time
    const syncTimes = Array.from(this.syncStats.values())
      .filter(stats => stats.avgSyncTime > 0)
      .map(stats => stats.avgSyncTime);
    
    if (syncTimes.length > 0) {
      metrics.avgSyncTime = syncTimes.reduce((sum, time) => sum + time, 0) / syncTimes.length;
    }
    
    return metrics;
  }

  /**
   * Reset error counts for a project
   */
  resetErrorCount(projectId) {
    this.errorCounts.set(projectId, 0);
    console.log(`🔄 Reset error count for project: ${projectId}`);
  }

  /**
   * Update scan interval
   */
  updateScanInterval(newInterval) {
    if (newInterval >= 500 && newInterval <= 10000) {
      this.scanInterval = newInterval;
      console.log(`⏱️ Updated scan interval to ${newInterval}ms`);
      
      // Restart all active watchers with new interval
      for (const [projectId, watcherInfo] of this.activeWatchers) {
        if (watcherInfo.intervalId) {
          clearInterval(watcherInfo.intervalId);
          
          const newIntervalId = setInterval(async () => {
            await this.scanProjectFiles(projectId);
          }, this.scanInterval);
          
          watcherInfo.intervalId = newIntervalId;
        }
      }
    } else {
      console.warn(`⚠️ Invalid scan interval: ${newInterval}ms (must be between 500-10000ms)`);
    }
  }
}

// Singleton instance
let terminalFileWatcherInstance = null;

const getTerminalFileWatcher = () => {
  if (!terminalFileWatcherInstance) {
    terminalFileWatcherInstance = new TerminalFileWatcher();
  }
  return terminalFileWatcherInstance;
};

export default getTerminalFileWatcher();
