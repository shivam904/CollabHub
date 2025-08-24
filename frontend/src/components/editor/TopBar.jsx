import React from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './TopBar.css';

export default function TopBar({ collaborators, openFiles, activeFile, onFileClose, onFileSelect, rightExtra }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      {/* Back Button */}
      <button className="topbar-back-btn" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
        <ArrowLeft size={18} />
        <span className="back-label">Back</span>
      </button>
      {/* File Tabs */}
      <div className="topbar-tabs">
        {openFiles.map((file) => (
          <div
            key={file._id}
            className={`topbar-tab ${activeFile?._id === file._id ? 'active' : ''}`}
            onClick={() => onFileSelect(file)}
          >
            <span className="tab-name">{file.name}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onFileClose(file._id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {/* Collaborators and rightExtra */}
      <div className="topbar-collaborators">
        {collaborators.map((collaborator) => (
          <div key={collaborator.userId} className="collaborator-avatar" title={collaborator.user?.displayName || collaborator.userId}>
            {collaborator.user?.profilePhoto ? (
              <img src={collaborator.user.profilePhoto} alt={collaborator.user.displayName || collaborator.userId} />
            ) : (
              <div className="avatar-fallback">
                {(collaborator.user?.displayName || collaborator.userId)[0].toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {rightExtra}
      </div>
    </div>
  );
} 