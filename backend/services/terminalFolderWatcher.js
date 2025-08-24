import { getDockerWorkspaceManager } from './dockerWorkspace.js';
import { EventEmitter } from 'events';

/**
 * Terminal Folder Watcher Service
 * Monitors folder changes in Docker containers and syncs them to the database.
 */
class TerminalFolderWatcher extends EventEmitter {
  constructor() {
    super();
    
    this.activeWatchers = new Map();
    this.lastFolderStates = new Map();
    this.errorCounts = new Map();
    this.syncStats = new Map();
    this.maxRetries = 3;
    this.scanInterval = 3000;
    this.immediateSyncDelay = 1500;
    
    this.commonSubdirs = [
      'src', 'lib', 'app', 'components', 'pages', 'utils', 
      'config', 'public', 'assets', 'styles', 'scripts',
      'models', 'controllers', 'routes', 'middleware',
      'tests', 'test', '__tests__', 'spec', 'docs'
    ];
    
    console.log('📁 Terminal Folder Watcher initialized');
  }

  async startWatching(projectId, userId) {
    try {
      if (this.activeWatchers.has(projectId)) {
        console.log(`📡 Already watching folders for project: ${projectId}`);
        return true;
      }

      console.log(`📁 Starting folder watcher for project: ${projectId}`);

      const watcherInfo = {
        projectId, userId, isActive: true, startTime: Date.now(),
        lastScan: null, scanCount: 0, errorCount: 0, intervalId: null
      };

      this.activeWatchers.set(projectId, watcherInfo);
      this.errorCounts.set(projectId, 0);
      this.syncStats.set(projectId, { lastSync: null, syncCount: 0, avgSyncTime: 0 });

      await this.initializeFolderStates(projectId);

      const intervalId = setInterval(async () => {
        await this.scanProjectFolders(projectId);
      }, this.scanInterval);

      watcherInfo.intervalId = intervalId;
      this.emit('folderWatcher:started', { projectId, userId });

      console.log(`✅ Folder watcher started for project: ${projectId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to start folder watcher for project ${projectId}:`, error);
      this.cleanupWatcher(projectId);
      return false;
    }
  }

  async stopWatching(projectId) {
    try {
      const watcherInfo = this.activeWatchers.get(projectId);
      
      if (!watcherInfo) {
        console.log(`📡 No active folder watcher for project: ${projectId}`);
        return true;
      }

      console.log(`🛑 Stopping folder watcher for project: ${projectId}`);

      if (watcherInfo.intervalId) {
        clearInterval(watcherInfo.intervalId);
      }

      this.cleanupWatcher(projectId);
      this.emit('folderWatcher:stopped', { projectId });

      console.log(`✅ Folder watcher stopped for project: ${projectId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to stop folder watcher for project ${projectId}:`, error);
      return false;
    }
  }

  emergencyStop() {
    console.log('🚨 Emergency stopping all folder watchers');
    
    for (const [projectId, watcherInfo] of this.activeWatchers) {
      if (watcherInfo.intervalId) {
        clearInterval(watcherInfo.intervalId);
      }
    }
    
    this.activeWatchers.clear();
    this.errorCounts.clear();
    this.syncStats.clear();
    this.lastFolderStates.clear();
    
    console.log('✅ All folder watchers emergency stopped');
  }

  async stopAll() {
    console.log('🛑 Stopping all folder watchers gracefully');
    
    const stopPromises = Array.from(this.activeWatchers.keys()).map(projectId => 
      this.stopWatching(projectId)
    );
    
    await Promise.allSettled(stopPromises);
    console.log('✅ All folder watchers stopped gracefully');
  }

  async forcSync(projectId, userId) {
    try {
      console.log(`🔄 Force syncing folders for project: ${projectId}`);
      
      const startTime = Date.now();
      const dockerManager = getDockerWorkspaceManager();
      const syncResult = await this.syncFoldersToDatabase(projectId);
      
      const syncTime = Date.now() - startTime;
      const stats = this.syncStats.get(projectId) || { syncCount: 0, avgSyncTime: 0 };
      stats.lastSync = new Date();
      stats.syncCount++;
      stats.avgSyncTime = (stats.avgSyncTime * (stats.syncCount - 1) + syncTime) / stats.syncCount;
      this.syncStats.set(projectId, stats);
      
      this.errorCounts.set(projectId, 0);
      
      this.emit('folderSync:completed', { projectId, userId, result: syncResult, syncTime });
      
      console.log(`✅ Force folder sync completed for project: ${projectId}`);
      return { success: true, result: syncResult, syncTime };

    } catch (error) {
      console.error(`❌ Force folder sync failed for project ${projectId}:`, error);
      
      const errorCount = (this.errorCounts.get(projectId) || 0) + 1;
      this.errorCounts.set(projectId, errorCount);
      
      this.emit('folderSync:error', { projectId, userId, error: error.message, errorCount });
      
      return { success: false, error: error.message, errorCount };
    }
  }

  getWatcherStatus(projectId) {
    const watcherInfo = this.activeWatchers.get(projectId);
    const errorCount = this.errorCounts.get(projectId) || 0;
    const stats = this.syncStats.get(projectId);
    
    if (!watcherInfo) {
      return { isActive: false, projectId, errorCount: 0, lastSync: null, syncCount: 0 };
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

  getAllWatcherStatuses() {
    const statuses = {};
    for (const [projectId] of this.activeWatchers) {
      statuses[projectId] = this.getWatcherStatus(projectId);
    }
    return statuses;
  }

  async initializeFolderStates(projectId) {
    try {
      const dockerManager = getDockerWorkspaceManager();
      const containerFolders = await this.getAllContainerFolders(projectId);
      
      const folderStates = new Map();
      
      for (const folderPath of containerFolders) {
        try {
          const folderInfo = await this.getFolderInfo(projectId, folderPath);
          if (folderInfo) {
            folderStates.set(folderPath, {
              exists: true,
              mtime: folderInfo.mtime,
              fileCount: folderInfo.fileCount,
              subfolderCount: folderInfo.subfolderCount
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to read folder state for ${folderPath}: ${error.message}`);
        }
      }
      
      this.lastFolderStates.set(projectId, folderStates);
      console.log(`📊 Initialized folder states for ${folderStates.size} folders in project: ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize folder states for project ${projectId}:`, error);
    }
  }

  async scanProjectFolders(projectId) {
    const watcherInfo = this.activeWatchers.get(projectId);
    if (!watcherInfo || !watcherInfo.isActive) return;

    try {
      watcherInfo.lastScan = new Date();
      watcherInfo.scanCount++;
      
      const currentFolders = await this.getAllContainerFolders(projectId);
      const lastStates = this.lastFolderStates.get(projectId) || new Map();
      
      const changes = [];
      
      for (const folderPath of currentFolders) {
        try {
          const currentInfo = await this.getFolderInfo(projectId, folderPath);
          const lastState = lastStates.get(folderPath);
          
          if (!lastState || 
              lastState.fileCount !== currentInfo.fileCount ||
              lastState.subfolderCount !== currentInfo.subfolderCount) {
            changes.push({
              folderPath,
              action: lastState ? 'modified' : 'created',
              info: currentInfo
            });
            
            lastStates.set(folderPath, {
              exists: true,
              mtime: currentInfo.mtime,
              fileCount: currentInfo.fileCount,
              subfolderCount: currentInfo.subfolderCount
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to check folder ${folderPath}: ${error.message}`);
        }
      }
      
      for (const [folderPath] of lastStates) {
        if (!currentFolders.includes(folderPath)) {
          changes.push({ folderPath, action: 'deleted' });
          lastStates.delete(folderPath);
        }
      }
      
      this.lastFolderStates.set(projectId, lastStates);
      
      if (changes.length > 0) {
        console.log(`🔄 Detected ${changes.length} folder changes in project: ${projectId}`);
        
        this.emit('folderChanges:detected', { projectId, changes, userId: watcherInfo.userId });
        
        setTimeout(async () => {
          await this.forcSync(projectId, watcherInfo.userId);
        }, this.immediateSyncDelay);
      }
      
    } catch (error) {
      console.error(`❌ Folder scan failed for project ${projectId}:`, error);
      
      const errorCount = (this.errorCounts.get(projectId) || 0) + 1;
      this.errorCounts.set(projectId, errorCount);
      
      if (errorCount >= this.maxRetries) {
        console.warn(`⚠️ Too many errors for project ${projectId}, stopping folder watcher`);
        await this.stopWatching(projectId);
      }
    }
  }

  async getAllContainerFolders(projectId) {
    try {
      const dockerManager = getDockerWorkspaceManager();
      
      const rootFolders = await this.listFoldersInContainer(projectId);
      const subdirFolders = [];
      
      for (const subdir of this.commonSubdirs) {
        try {
          const folders = await this.listFoldersInContainer(projectId, subdir);
          subdirFolders.push(...folders.map(folder => `${subdir}/${folder}`));
        } catch (error) {
          // Subdirectory might not exist, which is fine
        }
      }
      
      const allFolders = [...new Set([...rootFolders, ...subdirFolders])];
      
      return allFolders.filter(folder => {
        if (folder.includes('\\') || folder.match(/[<>:"|?*]/)) return false;
        if (folder.startsWith('.') && !folder.includes('/')) return false;
        if (folder.includes('/.git/') || folder.includes('/node_modules/')) return false;
        return true;
      });
      
    } catch (error) {
      console.error(`❌ Failed to get container folders for project ${projectId}:`, error);
      return [];
    }
  }

  async listFoldersInContainer(projectId, directoryPath = '') {
    try {
      const dockerManager = getDockerWorkspaceManager();
      const containerInfo = await dockerManager.getProjectContainer(projectId);
      
      const findPath = directoryPath ? `/workspace/${directoryPath}` : '/workspace';
      
      const result = await dockerManager.executeInContainer(containerInfo.container, [
        'find', findPath, '-type', 'd', '-not', '-path', '*/node_modules/*', 
        '-not', '-path', '*/.git/*', '-not', '-path', '*/.tmp/*', 
        '-not', '-path', '*/.temp/*', '-printf', '%P\n'
      ]);

      if (!result.output) return [];

      const folders = result.output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(folder => {
          if (folder.includes('\\') || folder.match(/[<>:"|?*]/)) return false;
          if (folder.endsWith('~') || folder.endsWith('.tmp') || folder.endsWith('.temp')) return false;
          return true;
        });

      return folders;

    } catch (error) {
      console.warn(`⚠️ Failed to list folders in container directory: ${directoryPath} - ${error.message}`);
      return [];
    }
  }

  async getFolderInfo(projectId, folderPath) {
    try {
      const dockerManager = getDockerWorkspaceManager();
      const containerInfo = await dockerManager.getProjectContainer(projectId);
      
      const fullPath = `/workspace/${folderPath}`;
      
      const fileCountResult = await dockerManager.executeInContainer(containerInfo.container, [
        'find', fullPath, '-maxdepth', '1', '-type', 'f', '|', 'wc', '-l'
      ]);
      
      const subfolderCountResult = await dockerManager.executeInContainer(containerInfo.container, [
        'find', fullPath, '-maxdepth', '1', '-type', 'd', '|', 'wc', '-l'
      ]);
      
      const mtimeResult = await dockerManager.executeInContainer(containerInfo.container, [
        'stat', '-c', '%Y', fullPath
      ]);
      
      const fileCount = parseInt(fileCountResult.output?.trim() || '0', 10);
      const subfolderCount = parseInt(subfolderCountResult.output?.trim() || '0', 10) - 1;
      const mtime = parseInt(mtimeResult.output?.trim() || '0', 10) * 1000;
      
      return {
        fileCount: Math.max(0, fileCount),
        subfolderCount: Math.max(0, subfolderCount),
        mtime: mtime || Date.now()
      };
      
    } catch (error) {
      console.warn(`⚠️ Failed to get folder info for ${folderPath}: ${error.message}`);
      return null;
    }
  }

  async syncFoldersToDatabase(projectId) {
    try {
      console.log(`🔄 Syncing folders to database for project: ${projectId}`);
      
      const { default: Folder } = await import('../models/Folder.js');
      
      const containerFolders = await this.getAllContainerFolders(projectId);
      const existingFolders = await Folder.find({ project: projectId });
      
      const newFolders = [];
      const updatedFolders = [];
      
      for (const folderPath of containerFolders) {
        try {
          const folderName = folderPath.split('/').pop() || folderPath;
          const parentPath = folderPath.split('/').slice(0, -1).join('/');
          
          let existingFolder = existingFolders.find(f => 
            f.path === parentPath && f.name === folderName
          );
          
          if (!existingFolder) {
            const folderData = {
              name: folderName,
              path: parentPath || '',
              project: projectId,
              owner: 'system',
              level: folderPath.split('/').length - 1,
              isRoot: parentPath === ''
            };
            
            if (parentPath) {
              const parentFolder = existingFolders.find(f => f.path === parentPath);
              if (parentFolder) {
                folderData.parent = parentFolder._id;
              }
            }
            
            newFolders.push(folderData);
          } else {
            const folderInfo = await this.getFolderInfo(projectId, folderPath);
            if (folderInfo) {
              updatedFolders.push({
                id: existingFolder._id,
                fileCount: folderInfo.fileCount,
                subfolderCount: folderInfo.subfolderCount
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process folder ${folderPath}: ${error.message}`);
        }
      }
      
      if (newFolders.length > 0) {
        try {
          const createdFolders = await Folder.insertMany(newFolders);
          console.log(`✅ Created ${createdFolders.length} new folders in database`);
        } catch (insertError) {
          if (insertError.code === 11000) {
            console.log(`📝 Some folders already exist, skipping duplicates`);
          } else {
            throw insertError;
          }
        }
      }
      
      for (const update of updatedFolders) {
        await Folder.findByIdAndUpdate(update.id, {
          $set: {
            fileCount: update.fileCount,
            subfolderCount: update.subfolderCount
          }
        });
      }
      
      if (updatedFolders.length > 0) {
        console.log(`✅ Updated ${updatedFolders.length} folders in database`);
      }
      
      console.log(`✅ Folder sync completed: ${newFolders.length} new, ${updatedFolders.length} updated`);
      return {
        newFolders: newFolders.length,
        updatedFolders: updatedFolders.length,
        totalProcessed: containerFolders.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to sync folders to database: ${error.message}`);
      return false;
    }
  }

  cleanupWatcher(projectId) {
    this.activeWatchers.delete(projectId);
    this.errorCounts.delete(projectId);
    this.syncStats.delete(projectId);
    this.lastFolderStates.delete(projectId);
  }

  getPerformanceMetrics() {
    const metrics = {
      activeWatchers: this.activeWatchers.size,
      totalErrorCount: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      totalSyncCount: Array.from(this.syncStats.values()).reduce((sum, stats) => sum + stats.syncCount, 0),
      avgSyncTime: 0
    };
    
    const syncTimes = Array.from(this.syncStats.values())
      .filter(stats => stats.avgSyncTime > 0)
      .map(stats => stats.avgSyncTime);
    
    if (syncTimes.length > 0) {
      metrics.avgSyncTime = syncTimes.reduce((sum, time) => sum + time, 0) / syncTimes.length;
    }
    
    return metrics;
  }

  resetErrorCount(projectId) {
    this.errorCounts.set(projectId, 0);
    console.log(`🔄 Reset error count for project: ${projectId}`);
  }

  updateScanInterval(newInterval) {
    if (newInterval >= 1000 && newInterval <= 15000) {
      this.scanInterval = newInterval;
      console.log(`⏱️ Updated folder scan interval to ${newInterval}ms`);
      
      for (const [projectId, watcherInfo] of this.activeWatchers) {
        if (watcherInfo.intervalId) {
          clearInterval(watcherInfo.intervalId);
          
          const newIntervalId = setInterval(async () => {
            await this.scanProjectFolders(projectId);
          }, this.scanInterval);
          
          watcherInfo.intervalId = newIntervalId;
        }
      }
    } else {
      console.warn(`⚠️ Invalid scan interval: ${newInterval}ms (must be between 1000-15000ms)`);
    }
  }

  isFolderCreationCommand(command) {
    const folderCreationPatterns = [
      /^mkdir\s+/i, /^mkdir\s+-p\s+/i, /^cp\s+-r\s+/i,
      /^mv\s+.*\/.*\s+.*\/.*/i, /^git\s+clone/i, /^npm\s+init/i,
      /^yarn\s+init/i, /^pnpm\s+init/i, /^create-react-app/i,
      /^npx\s+create/i, /^vue\s+create/i, /^ng\s+new/i,
      /^nest\s+new/i, /^rails\s+new/i, /^django-admin\s+startproject/i,
      /^flutter\s+create/i, /^cargo\s+new/i, /^go\s+mod\s+init/i,
      /^dotnet\s+new/i
    ];
    
    return folderCreationPatterns.some(pattern => pattern.test(command));
  }
}

// Singleton instance
let terminalFolderWatcherInstance = null;

const getTerminalFolderWatcher = () => {
  if (!terminalFolderWatcherInstance) {
    terminalFolderWatcherInstance = new TerminalFolderWatcher();
  }
  return terminalFolderWatcherInstance;
};

export default getTerminalFolderWatcher();
