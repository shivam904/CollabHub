import { useState, useEffect, useCallback } from 'react';
import { projectAPI, handleAPIError } from '../services/api';

export const useProjectManager = (userId) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [publicProjects, setPublicProjects] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    visibility: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Load user's projects
  const loadProjects = useCallback(async (params = {}) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const requestParams = {
        userId: userId, // fetch all projects where user is a member
        ...filters,
        ...params
      };
      const response = await projectAPI.getProjects(requestParams);
      // Extract projects from response object
      setProjects(response.projects || []);
      setLoadedOnce(true);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  // Only fetch projects when userId or filters change, and only if not already loaded
  useEffect(() => {
    if (userId && !loadedOnce) {
      loadProjects();
    }
  }, [userId, loadProjects, loadedOnce]);

  // If filters change after initial load, fetch again
  useEffect(() => {
    if (userId && loadedOnce) {
      loadProjects();
    }
    // eslint-disable-next-line
  }, [filters]);

  // Load specific project
  const loadProject = useCallback(async (projectId) => {
    if (!userId || !projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const project = await projectAPI.getProject(projectId, userId);
      setCurrentProject(project);
      return project;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error loading project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create new project
  const createProject = useCallback(async (projectData) => {
    if (!userId) {
      console.error('useProjectManager: No userId available for project creation');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const newProject = await projectAPI.createProject({
        ...projectData,
        creatorId: userId
      });
      
      if (!newProject || !newProject._id) {
        setError('Failed to create project. Invalid response from server.');
        return null;
      }
      
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error creating project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update project
  const updateProject = useCallback(async (projectId, projectData) => {
    if (!userId || !projectId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await projectAPI.updateProject(projectId, projectData, userId);
      
      setProjects(prev => 
        prev.map(project => 
          project._id === projectId ? updatedProject : project
        )
      );
      
      if (currentProject?._id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error updating project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, currentProject]);

  // Delete project
  const deleteProject = useCallback(async (projectId, force = false) => {
    if (!userId || !projectId) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await projectAPI.deleteProject(projectId, userId, force);
      
      setProjects(prev => prev.filter(project => project._id !== projectId));
      
      if (currentProject?._id === projectId) {
        setCurrentProject(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error deleting project:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, currentProject]);

  // Load project statistics
  const loadProjectStats = useCallback(async (projectId) => {
    if (!userId || !projectId) return;
    
    try {
      const projectStats = await projectAPI.getProjectStats(projectId, userId);
      setStats(projectStats);
      return projectStats;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error loading project stats:', err);
      return null;
    }
  }, [userId]);

  // Add member to project
  const addMember = useCallback(async (projectId, memberData) => {
    if (!projectId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await projectAPI.addMember(projectId, memberData);
      
      setProjects(prev => 
        prev.map(project => 
          project._id === projectId ? updatedProject : project
        )
      );
      
      if (currentProject?._id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error adding member:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Remove member from project
  const removeMember = useCallback(async (projectId, memberData) => {
    if (!projectId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await projectAPI.removeMember(projectId, memberData);
      
      setProjects(prev => 
        prev.map(project => 
          project._id === projectId ? updatedProject : project
        )
      );
      
      if (currentProject?._id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error removing member:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Search projects
  const searchProjects = useCallback(async (searchParams = {}) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectAPI.searchProjects({
        userId,
        ...searchParams
      });
      
      // Extract projects from response object
      setSearchResults(response.projects || []);
      return response.projects || [];
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error searching projects:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load public projects
  const loadPublicProjects = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectAPI.getPublicProjects(params);
      // Extract projects from response object
      setPublicProjects(response.projects || []);
      return response.projects || [];
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error loading public projects:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear search results
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    // State
    projects,
    currentProject,
    loading,
    error,
    stats,
    searchResults,
    publicProjects,
    filters,
    loadProjects,
    
    // Actions
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    loadProjectStats,
    addMember,
    removeMember,
    searchProjects,
    loadPublicProjects,
    updateFilters,
    clearError,
    clearSearchResults,
    setCurrentProject
  };
}; 