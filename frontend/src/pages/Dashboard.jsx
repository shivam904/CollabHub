import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjectManager } from '../hooks/useProjectManager';
import Select from 'react-select';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);

  const {
    projects,
    loading,
    error,
    filters,
    searchResults,
    loadProjects,
    createProject,
    searchProjects,
    updateFilters,
    clearError,
  } = useProjectManager(user?.uid);

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'completed', label: 'Completed' },
  ], []);
  const visibilityOptions = useMemo(() => [
    { value: 'all', label: 'All Visibility' },
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
  ], []);
  const sortByOptions = useMemo(() => [
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'name', label: 'Name' },
  ], []);
  const selectStyles = useMemo(() => ({
    control: (base, state) => ({
      ...base,
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderColor: state.isFocused ? 'var(--border-glow)' : 'var(--border)',
      boxShadow: state.isFocused ? 'var(--shadow-glow)' : 'var(--shadow-glass)',
      minWidth: 140,
      fontSize: '0.9rem',
      color: 'var(--text-primary)',
      borderRadius: '12px',
      padding: '4px 8px',
      '&:hover': {
        borderColor: 'var(--border-accent)',
        background: 'rgba(255, 255, 255, 0.15)'
      }
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected 
        ? 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)' 
        : state.isFocused 
          ? 'rgba(168, 85, 247, 0.2)' 
          : 'transparent',
      color: state.isSelected ? '#ffffff' : '#f8fafc',
      fontWeight: state.isSelected ? 600 : 500,
      fontSize: '0.9rem',
      padding: '12px 16px',
      cursor: 'pointer',
      '&:hover': {
        background: state.isSelected 
          ? 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)' 
          : 'rgba(168, 85, 247, 0.15)'
      }
    }),
    menu: (base) => ({
      ...base,
      background: '#2a2d3e',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      zIndex: 99999,
      overflow: 'hidden'
    }),
    menuList: (base) => ({
      ...base,
      padding: '8px',
      maxHeight: '200px'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-primary)',
      fontWeight: 600
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      fontStyle: 'italic'
    }),
    input: (base) => ({
      ...base,
      color: 'var(--text-primary)',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      '&:hover': {
        color: 'var(--accent)'
      }
    }),
    indicatorSeparator: () => ({
      display: 'none'
    })
  }), []);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchProjects({ query: searchQuery });
    }
  };
  const handleFilterChange = useCallback((filterType, value) => {
    console.log('handleFilterChange called:', { filterType, value, currentFilters: filters });
    updateFilters({ [filterType]: value, page: 1 });
  }, [updateFilters, filters]);

  const displayProjects = searchQuery ? searchResults : projects;
  const visibleProjects = showAllProjects ? displayProjects : displayProjects.slice(0, 8);

  // Debug: Log current filter values
  console.log('Current filters:', filters);
  console.log('Status options:', statusOptions);
  console.log('Visibility options:', visibilityOptions);
  console.log('SortBy options:', sortByOptions);

  // Collect unique collaborators from visible projects
  const collaboratorsMap = {};
  visibleProjects.forEach(project => {
    if (project.members && Array.isArray(project.members)) {
      project.members.forEach(member => {
        if (member.userId && member.userId !== user?.uid) {
          // Use populated user info if available, otherwise fallback
          const userInfo = member.user || { displayName: member.userId, email: member.userId };
          collaboratorsMap[member.userId] = {
            ...member,
            name: userInfo.displayName || member.userId,
            email: userInfo.email || member.userId
          };
        }
      });
    }
  });
  const collaborators = Object.values(collaboratorsMap);

  // Minimal skeleton loader for project cards
  const ProjectSkeleton = () => (
    <div className="minimal-project-card minimal-project-skeleton">
      <div className="minimal-project-title-row skeleton-box" style={{ width: '70%', height: '1.1rem', marginBottom: '0.5rem' }} />
      <div className="skeleton-box" style={{ width: '90%', height: '0.9rem', marginBottom: '0.4rem' }} />
      <div className="skeleton-box" style={{ width: '50%', height: '0.7rem', marginBottom: '0.3rem' }} />
      <div className="skeleton-box" style={{ width: '60%', height: '0.7rem' }} />
    </div>
  );

  if (loading && projects.length === 0) {
    return (
      <div className="dashboard-ultra-modern">
        <div className="loader-center">
          <LoadingSpinner type="matrix" text="Loading Dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-ultra-modern">
      {/* Floating Hero Section */}
      <div className="hero-floating-container">
        <div className="hero-content">
          <div className="hero-greeting">
            <div className="greeting-icon">👋</div>
            <h1 className="hero-title">
              Welcome back,<br />
              <span className="hero-name">{user?.displayName || 'Developer'}!</span>
            </h1>
          </div>
          <div className="hero-actions">
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/new-project')}
            >
              <span className="btn-icon">✨</span>
              Create Magic
            </button>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{projects.length}</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{collaborators.length}</span>
                <span className="stat-label">Collaborators</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Search Hub */}
      <div className="search-hub-floating">
        <div className="search-container">
          <div className="search-input-wrapper">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search your universe of projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input-modern"
            />
            <button onClick={handleSearch} className="search-btn-floating">
              Search
            </button>
          </div>
          <div className="filters-floating">
            {/* Temporary HTML Select for testing */}
            <div className="filter-test-container">
              <label>Status:</label>
              <select 
                value={filters.status || 'all'} 
                onChange={(e) => {
                  console.log('Native status changed:', e.target.value);
                  handleFilterChange('status', e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.9rem'
                }}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ color: '#000' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-test-container">
              <label>Visibility:</label>
              <select 
                value={filters.visibility || 'all'} 
                onChange={(e) => {
                  console.log('Native visibility changed:', e.target.value);
                  handleFilterChange('visibility', e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.9rem'
                }}
              >
                {visibilityOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ color: '#000' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-test-container">
              <label>Sort By:</label>
              <select 
                value={filters.sortBy || 'updatedAt'} 
                onChange={(e) => {
                  console.log('Native sortBy changed:', e.target.value);
                  handleFilterChange('sortBy', e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.9rem'
                }}
              >
                {sortByOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ color: '#000' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="dashboard-modern-layout">
        {/* Left Panel - Team & Stats */}
        <div className="left-panel-floating">
          <div className="collaborators-modern">
            <div className="section-header">
              <div className="section-icon">👥</div>
              <h3 className="section-title">Your Squad</h3>
            </div>
            {collaborators.length === 0 ? (
              <div className="empty-collaborators">
                <div className="empty-illustration">🚀</div>
                <p>Your team awaits!<br />Invite collaborators to start building together.</p>
              </div>
            ) : (
              <div className="collaborators-grid">
                {collaborators.map((collab, idx) => (
                  <div key={collab.userId || idx} className="collaborator-card">
                    <div className="collaborator-avatar">
                      {collab.name?.charAt(0) || '👤'}
                    </div>
                    <div className="collaborator-info">
                      <div className="collaborator-name">{collab.name || collab.userId}</div>
                      <div className="collaborator-role">{collab.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Projects */}
        <div className="right-panel-projects">
          <div className="projects-header">
            <div className="projects-title-section">
              <div className="projects-icon">🎯</div>
              <h2 className="projects-title">Your Projects</h2>
            </div>
          </div>
          
          <div className="projects-masonry">
            {loading && projects.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => <ProjectSkeleton key={i} />)
            ) : visibleProjects.length === 0 ? (
              <div className="empty-projects">
                <div className="empty-graphic">
                  <div className="empty-circle"></div>
                  <div className="empty-text">
                    <h3>Ready to create?</h3>
                    <p>Your next amazing project starts here!</p>
                    <button 
                      className="btn-create-first"
                      onClick={() => navigate('/new-project')}
                    >
                      🚀 Start Building
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              visibleProjects.map((project, index) => (
                <div
                  key={project._id}
                  className={`project-card-modern ${index % 2 === 0 ? 'tall' : 'short'}`}
                  onClick={() => {
                    if (user?.uid && project._id) {
                      localStorage.setItem('projectId', project._id);
                      localStorage.setItem('userId', user.uid);
                      navigate(`/editor/${project._id}`);
                    } else {
                      alert('User or Project ID missing!');
                    }
                  }}
                >
                  <div className="project-header">
                    <div className="project-icon">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="project-meta-top">
                      <span className={`visibility-badge-modern ${project.visibility}`}>
                        {project.visibility === 'public' ? '🌍' : '🔒'} {project.visibility}
                      </span>
                    </div>
                  </div>
                  
                  <div className="project-content">
                    <h3 className="project-title-modern">{project.name}</h3>
                    <p className="project-desc-modern">{project.description || 'No description provided'}</p>
                    
                    {project.tags && project.tags.length > 0 && (
                      <div className="project-tags-modern">
                        {project.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="tag-modern">{tag}</span>
                        ))}
                        {project.tags.length > 3 && (
                          <span className="tag-more">+{project.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="project-footer">
                    <div className="project-stats">
                      <div className="stat-mini">
                        <span className="stat-icon">👥</span>
                        <span>{project.members?.length || 1}</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-icon">📁</span>
                        <span>{project.fileCount || 0}</span>
                      </div>
                    </div>
                    <div className="project-action">
                      <span className="action-text">Open →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More */}
          {displayProjects.length > 8 && (
            <div className="load-more-section">
              {!showAllProjects ? (
                <button 
                  className="btn-load-more" 
                  onClick={() => setShowAllProjects(true)}
                >
                  ✨ Show All Projects ({displayProjects.length - 8} more)
                </button>
              ) : (
                <button 
                  className="btn-load-more" 
                  onClick={() => setShowAllProjects(false)}
                >
                  📦 Show Less
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 