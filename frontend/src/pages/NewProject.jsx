import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjectManager } from '../hooks/useProjectManager';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Select from 'react-select';

const NewProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createProject, loading, error, clearError } = useProjectManager(user?.uid);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private',
    tags: []
  });
  const [selectedTag, setSelectedTag] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Project name must be at least 3 characters long';
    } else if (formData.name.length > 100) {
      errors.name = 'Project name must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    if (formData.tags.length > 10) {
      errors.tags = 'Maximum 10 tags allowed';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;
    
    console.log('Creating project with data:', {
      ...formData,
      tags: formData.tags.filter(tag => tag.trim())
    });
    
    const project = await createProject({
      ...formData,
      tags: formData.tags.filter(tag => tag.trim())
    });
    
    console.log('Project creation response:', project);
    
    if (project && project._id) {
      console.log('Navigating to editor with project ID:', project._id);
      navigate(`/editor/${project._id}`);
    } else {
      console.error('Project creation failed - no project ID returned');
      setError('Failed to create project. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const addTag = () => {
    const tag = selectedTag.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setSelectedTag('');
      if (validationErrors.tags) {
        setValidationErrors(prev => ({ ...prev, tags: null }));
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Memoized options for react-select
  const visibilityOptions = useMemo(() => [
    { value: 'private', label: 'Private - Only you and invited members' },
    { value: 'public', label: 'Public - Anyone can view' },
  ], []);

  // Memoized select styles
  const selectStyles = useMemo(() => ({
    control: (base, state) => ({
      ...base,
      background: '#fff',
      borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
      boxShadow: state.isFocused ? '0 0 0 2px #cf942133' : 'none',
      fontSize: '1rem',
      color: 'var(--primary)',
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected ? 'var(--accent)' : state.isFocused ? '#f3e7c6' : '#fff',
      color: state.isSelected ? '#fff' : 'var(--primary)',
      fontWeight: state.isSelected ? 700 : 500,
      fontSize: '1rem',
    }),
  }), []);

  if (loading) {
    return <LoadingSpinner type="orbit" text="Preparing your workspace..." />;
  }

  return (
    <div className="new-project-ultra-modern">
      {/* Floating Hero Header */}
      <div className="new-project-hero">
        <div className="hero-content-new">
          <div className="hero-icon">✨</div>
          <h1 className="hero-title-new">
            Create Your <span className="hero-accent">Masterpiece</span>
          </h1>
          <p className="hero-subtitle">Transform your ideas into reality with our collaborative platform</p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="new-project-container">
        <div className="form-glass-card">
          {error && (
            <div className="error-floating">
              <div className="error-icon">⚠️</div>
              <span>{error}</span>
              <button onClick={clearError} className="error-close">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="project-form">
            {/* Project Name Section */}
            <div className="form-section">
              <div className="section-icon">🎯</div>
              <div className="section-content">
                <label className="form-label-modern">
                  Project Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Give your project an awesome name..."
                  className={`form-input-modern ${validationErrors.name ? 'error' : ''}`}
                  maxLength={100}
                />
                {validationErrors.name && (
                  <div className="error-message-inline">
                    <span className="error-icon-small">⚠️</span>
                    {validationErrors.name}
                  </div>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="form-section">
              <div className="section-icon">📝</div>
              <div className="section-content">
                <label className="form-label-modern">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell the world about your amazing project..."
                  rows="4"
                  maxLength={500}
                  className={`form-textarea-modern ${validationErrors.description ? 'error' : ''}`}
                />
                <div className="char-counter">
                  <span className={formData.description.length > 450 ? 'warning' : ''}>
                    {formData.description.length}/500
                  </span>
                </div>
                {validationErrors.description && (
                  <div className="error-message-inline">
                    <span className="error-icon-small">⚠️</span>
                    {validationErrors.description}
                  </div>
                )}
              </div>
            </div>

            {/* Visibility Section */}
            <div className="form-section">
              <div className="section-icon">
                {formData.visibility === 'public' ? '🌍' : '🔒'}
              </div>
              <div className="section-content">
                <label className="form-label-modern">Project Visibility</label>
                <div className="visibility-options">
                  <div 
                    className={`visibility-option ${formData.visibility === 'private' ? 'selected' : ''}`}
                    onClick={() => handleInputChange('visibility', 'private')}
                  >
                    <div className="option-icon">🔒</div>
                    <div className="option-content">
                      <h4>Private</h4>
                      <p>Only you and invited members</p>
                    </div>
                    <div className="option-radio">
                      {formData.visibility === 'private' && <span>✓</span>}
                    </div>
                  </div>
                  <div 
                    className={`visibility-option ${formData.visibility === 'public' ? 'selected' : ''}`}
                    onClick={() => handleInputChange('visibility', 'public')}
                  >
                    <div className="option-icon">🌍</div>
                    <div className="option-content">
                      <h4>Public</h4>
                      <p>Anyone can discover and view</p>
                    </div>
                    <div className="option-radio">
                      {formData.visibility === 'public' && <span>✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="form-section">
              <div className="section-icon">🏷️</div>
              <div className="section-content">
                <label className="form-label-modern">
                  Tags <span className="tag-count">({formData.tags.length}/10)</span>
                </label>
                <div className="tags-input-modern">
                  <input
                    type="text"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add tags to organize your project..."
                    className="tag-input"
                  />
                  <button 
                    type="button" 
                    onClick={addTag}
                    className="tag-add-btn"
                    disabled={!selectedTag.trim() || formData.tags.length >= 10}
                  >
                    ✨ Add
                  </button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="tags-display">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="tag-modern">
                        {tag}
                        <button 
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="tag-remove-modern"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {validationErrors.tags && (
                  <div className="error-message-inline">
                    <span className="error-icon-small">⚠️</span>
                    {validationErrors.tags}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions-modern">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="btn-cancel-modern"
              >
                <span className="btn-icon">🔙</span>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-create-modern"
                disabled={!formData.name.trim()}
              >
                <span className="btn-icon">🚀</span>
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProject; 