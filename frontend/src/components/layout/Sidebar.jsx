import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, PlusCircle, User, LogIn, FolderKanban, Settings, Code2, X } from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, login } = useAuth();
  const location = useLocation();
  const { projectId } = useParams();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const isActive = (path) => location.pathname === path;
  const isProjectRoute = () => location.pathname.includes('/editor/') || location.pathname.includes('/project/');

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Code2 size={28} strokeWidth={2.2} />
            <span>CollabHub</span>
          </div>
        </div>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Projects</h3>
              <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/new-project" className={`nav-item ${isActive('/new-project') ? 'active' : ''}`}>
                <PlusCircle size={18} />
                <span>New Project</span>
              </Link>
            </div>
            {isProjectRoute() && projectId && (
              <div className="nav-section">
                <h3>Project</h3>
                <Link to={`/editor/${projectId}`} className={`nav-item ${location.pathname.includes('/editor/') ? 'active' : ''}`}>
                  <FolderKanban size={18} />
                  <span>Editor</span>
                </Link>
                <Link to={`/project/${projectId}/collaboration`} className={`nav-item ${location.pathname.includes('/collaboration') ? 'active' : ''}`}>
                  <User size={18} />
                  <span>Collaboration</span>
                </Link>
                <Link to={`/project/${projectId}/settings`} className={`nav-item ${location.pathname.includes('/settings') ? 'active' : ''}`}>
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              </div>
            )}
            <div className="nav-section">
              <h3>Account</h3>
              <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                <User size={18} />
                <span>Profile</span>
              </Link>
            </div>
          </nav>
        </div>
        <div className="sidebar-footer">
          {!user && (
            <button onClick={handleLogin} className="logout-btn">
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      </aside>
      {/* Mobile sidebar overlay */}
      <aside className={`sidebar mobile-sidebar${sidebarOpen ? ' open' : ''}`} style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <div className="sidebar-logo">
            <Code2 size={28} strokeWidth={2.2} />
            <span>CollabHub</span>
          </div>
          <button className="menu-button" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Projects</h3>
              <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/new-project" className={`nav-item ${isActive('/new-project') ? 'active' : ''}`}>
                <PlusCircle size={18} />
                <span>New Project</span>
              </Link>
            </div>
            {isProjectRoute() && projectId && (
              <div className="nav-section">
                <h3>Project</h3>
                <Link to={`/editor/${projectId}`} className={`nav-item ${location.pathname.includes('/editor/') ? 'active' : ''}`}>
                  <FolderKanban size={18} />
                  <span>Editor</span>
                </Link>
                <Link to={`/project/${projectId}/collaboration`} className={`nav-item ${location.pathname.includes('/collaboration') ? 'active' : ''}`}>
                  <User size={18} />
                  <span>Collaboration</span>
                </Link>
                <Link to={`/project/${projectId}/settings`} className={`nav-item ${location.pathname.includes('/settings') ? 'active' : ''}`}>
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              </div>
            )}
            <div className="nav-section">
              <h3>Account</h3>
              <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                <User size={18} />
                <span>Profile</span>
              </Link>
            </div>
          </nav>
        </div>
        <div className="sidebar-footer">
          {!user && (
            <button onClick={handleLogin} className="logout-btn">
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 