import React from 'react';
import { Code2, Sparkles } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', type = 'default', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const renderLoader = () => {
    switch (type) {
      case 'branded':
        return (
          <div className="loader-branded">
            <div className="branded-logo">
              <Code2 className="branded-icon" />
              <div className="branded-sparkle">
                <Sparkles className="sparkle-icon" />
              </div>
            </div>
            <div className="branded-text">{text}</div>
            <div className="branded-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className="loader-pulse">
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
          </div>
        );
      
      case 'wave':
        return (
          <div className="loader-wave">
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>
        );
      
      case 'orbit':
        return (
          <div className="loader-orbit">
            <div className="orbit-center"></div>
            <div className="orbit-ring">
              <div className="orbit-dot"></div>
              <div className="orbit-dot"></div>
              <div className="orbit-dot"></div>
            </div>
          </div>
        );
      
      case 'matrix':
        return (
          <div className="loader-matrix">
            <div className="matrix-grid">
              {Array.from({ length: 16 }, (_, i) => (
                <div key={i} className="matrix-cell"></div>
              ))}
            </div>
            <div className="matrix-text">{text}</div>
          </div>
        );
      
      default:
        return (
          <div className="loader-modern">
            <div className="modern-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <div className="modern-text">{text}</div>
          </div>
        );
    }
  };

  return (
    <div className="loader-center">
      {renderLoader()}
    </div>
  );
};

export default LoadingSpinner; 