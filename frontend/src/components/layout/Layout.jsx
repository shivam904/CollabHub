import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useLocation, matchPath } from 'react-router-dom';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Detect if we are on the editor route for fullscreen mode
  const isFullscreen = !!matchPath('/editor/:projectId', location.pathname);

  return (
    <div className={`layout h-full w-full min-h-0 min-w-0 flex flex-row${isFullscreen ? ' fullscreen' : ''}`}>
      {/* Sidebar: always visible on desktop, toggled on mobile, except in fullscreen mode */}
      {!isFullscreen && (
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      )}
      <div className="main-content h-full w-full min-h-0 min-w-0 flex flex-col flex-1">
        <main className="content h-full w-full min-h-0 min-w-0 flex-1 p-0">
          {children}
        </main>
      </div>
      {/* Mobile sidebar overlay */}
      {!isFullscreen && sidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout; 