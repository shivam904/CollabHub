import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../contexts/RealtimeContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import './CloudTerminal.css';
import { Plus, ChevronDown, X, Trash2, Settings } from 'lucide-react';

/**
 * Professional Cloud Terminal Component
 * Features:
 * - VS Code-like interface
 * - Multi-terminal support with tabs
 * - Robust backend integration
 * - Clean output handling
 * - Professional error handling
 */
const CloudTerminal = ({ projectId, userId, className = '' }) => {
  // Refs for terminal instances
  const terminalContainerRef = useRef(null);
  const terminalsRef = useRef(new Map()); // terminalId -> { terminal, socket, fitAddon, cleanup, sessionId }
  
  // Component state
  const [terminals, setTerminals] = useState([{ id: '1', title: 'Terminal', active: true }]);
  const [activeTerminalId, setActiveTerminalId] = useState('1');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Tab editing state
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');
  
  const { token } = useAuth();
  const { socket, isConnected } = useRealtime();

  /**
   * Initialize a single terminal instance
   */
  const createTerminalInstance = useCallback(async (terminalId) => {
    try {
      setIsLoading(true);
      
      // Dynamic import for XTerm
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');
        
      // Create terminal with proper scrolling configuration
      const terminal = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4'
        },
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        convertEol: true,
        disableStdin: false,
        scrollOnUserInput: true,
        altClickMovesCursor: false,
        allowProposedApi: true
      });

      // Create addons
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        
      // Get terminal container
      const terminalElement = terminalContainerRef.current?.querySelector(
        `[data-terminal-id="${terminalId}"]`
      );

      if (!terminalElement) {
        throw new Error(`Terminal container not found for ID: ${terminalId}`);
      }

      // Open terminal
      terminal.open(terminalElement);
      
      // Force proper positioning and sizing
      terminalElement.style.padding = '0';
      terminalElement.style.margin = '0';
      terminalElement.style.height = '100%';
      terminalElement.style.width = '100%';
      
      fitAddon.fit();
      
      // Ensure scrolling is at bottom after opening
      setTimeout(() => {
        // Fix any XTerm internal spacing issues
        const xtermViewport = terminalElement.querySelector('.xterm-viewport');
        const xtermScreen = terminalElement.querySelector('.xterm-screen');
        const xtermRows = terminalElement.querySelector('.xterm-rows');
        
        if (xtermViewport) {
          xtermViewport.style.top = '0';
          xtermViewport.style.margin = '0';
          xtermViewport.style.padding = '0';
        }
        
        if (xtermScreen) {
          xtermScreen.style.top = '0';
          xtermScreen.style.margin = '0';
          xtermScreen.style.padding = '0';
        }
        
        if (xtermRows) {
          xtermRows.style.top = '0';
          xtermRows.style.marginTop = '0';
          xtermRows.style.paddingTop = '0';
        }
        
        fitAddon.fit();
        ensureScrollToBottom(terminal);
      }, 100);

      // Use shared socket connection
      if (!socket || !isConnected) {
        terminal.writeln('❌ Socket not connected. Please check your connection.');
        setIsLoading(false);
        setConnectionStatus('error');
        return;
      }

      // Socket event handlers
      setupSocketHandlers(socket, terminal, terminalId);

      // Terminal event handlers
      const dataDisposable = terminal.onData((data) => {
        const terminalInstance = terminalsRef.current.get(terminalId);
        const sessionId = terminalInstance?.sessionId;
        socket.emit('terminal:input', { data, terminalId, sessionId });
      });

      const resizeDisposable = terminal.onResize(({ cols, rows }) => {
        const terminalInstance = terminalsRef.current.get(terminalId);
        const sessionId = terminalInstance?.sessionId;
        socket.emit('terminal:resize', { cols, rows, terminalId, sessionId });
      });

      // Resize handling
      const handleResize = () => {
        fitAddon.fit();
        ensureScrollToBottom(terminal);
      };

      window.addEventListener('resize', handleResize);
      
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          fitAddon.fit();
          ensureScrollToBottom(terminal);
        }, 10);
      });
      resizeObserver.observe(terminalElement);

      // Cleanup function
      const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        dataDisposable.dispose();
        resizeDisposable.dispose();
        terminal.dispose();
      };

      // Store terminal instance
      terminalsRef.current.set(terminalId, {
        terminal,
        socket,
        fitAddon,
        cleanup
      });

      // Initial welcome message
      terminal.writeln('🚀 Initializing CollabHub Cloud Terminal...');
      terminal.writeln('⏳ Connecting to container...');
      terminal.writeln(`🔧 Terminal ID: ${terminalId}`);
      terminal.writeln(`🔧 Project ID: ${projectId}`);
      terminal.writeln(`🔧 User ID: ${userId}`);

      console.log(`✅ Terminal ${terminalId} created successfully`);
      setIsLoading(false);

    } catch (error) {
      console.error(`❌ Failed to create terminal ${terminalId}:`, error);
      setIsLoading(false);
      setConnectionStatus('error');
    }
  }, [projectId, userId, token, socket, isConnected]);

  /**
   * Setup socket event handlers for a terminal
   */
  const setupSocketHandlers = (socket, terminal, terminalId) => {
    // Check if socket is already connected
    if (socket.connected) {
      console.log(`🔌 Terminal ${terminalId} using existing connection`);
      setConnectionStatus('connected');
      terminal.clear();
      terminal.writeln('✅ Connected to CollabHub Cloud Terminal');
      
      // Initialize container
      socket.emit('terminal:init', {
        projectId,
        userId,
        terminalId,
          cols: terminal.cols,
          rows: terminal.rows
      });
    } else {
      // Wait for connection
      socket.on('connect', () => {
        console.log(`🔌 Terminal ${terminalId} connected`);
        setConnectionStatus('connected');
        terminal.clear();
        terminal.writeln('✅ Connected to CollabHub Cloud Terminal');
        
        // Initialize container
        socket.emit('terminal:init', {
          projectId,
          userId,
          terminalId,
            cols: terminal.cols,
            rows: terminal.rows
        });
      });
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Terminal ${terminalId} disconnected`);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Terminal ${terminalId} connection error:`, error);
      setConnectionStatus('error');
      terminal.writeln(`\r\n❌ Connection failed: ${error.message}`);
    });

    socket.on('terminal:output', (data) => {
      // Always process output for this terminal, regardless of terminalId matching
      // The backend might not always send the correct terminalId
      const output = data.output || data;
      if (output && typeof output === 'string') {
        console.log(`📺 Terminal ${terminalId} received output:`, output.substring(0, 100));
        terminal.write(output);
        // Always scroll to bottom to show latest output
        ensureScrollToBottom(terminal);
      }
    });

    socket.on('terminal:ready', (data) => {
      // Always process ready event for this terminal
      setConnectionStatus('ready');
      terminal.clear();
      terminal.writeln('🎉 CollabHub Cloud Terminal Ready!');
      terminal.writeln(`📦 Container: ${data.containerId?.substring(0, 12)}`);
      terminal.writeln(`📁 Directory: ${data.workingDir}`);
      terminal.writeln(`🛠️  Languages: ${data.languages?.join(', ')}`);
      terminal.writeln('');
      
      // Store session ID for this terminal
      const terminalInstance = terminalsRef.current.get(terminalId);
      if (terminalInstance) {
        terminalInstance.sessionId = data.sessionId;
        terminalsRef.current.set(terminalId, terminalInstance);
      }
      
      ensureScrollToBottom(terminal);
      terminal.focus();
    });

    socket.on('terminal:error', (error) => {
      console.error(`❌ Terminal ${terminalId} error:`, error);
      setConnectionStatus('error');
      const errorMessage = typeof error === 'string' ? error : error.error || 'Unknown error';
      terminal.writeln(`\r\n❌ Error: ${errorMessage}`);
      ensureScrollToBottom(terminal);
    });

    socket.on('terminal:status', (status) => {
      setConnectionStatus(status);
    });
  };

  /**
   * Ensure terminal is scrolled to bottom
   */
  const ensureScrollToBottom = (terminal) => {
    terminal.scrollToBottom();
    // Double-check with a small delay
    setTimeout(() => {
      terminal.scrollToBottom();
    }, 10);
  };

  /**
   * Initialize first terminal when component mounts
   */
  useEffect(() => {
    if (!token || !terminalContainerRef.current) return;

    const firstTerminal = terminalContainerRef.current.querySelector('[data-terminal-id="1"]');
    if (firstTerminal && !terminalsRef.current.has('1')) {
      createTerminalInstance('1');
    }
  }, [token, createTerminalInstance]);

  /**
   * Handle run code results from external compiler
   */
  useEffect(() => {
    // Set up global handler for run code results
    window.runCodeResult = (result) => {
      const terminalInstance = terminalsRef.current.get(activeTerminalId);
      if (terminalInstance && terminalInstance.terminal) {
        const terminal = terminalInstance.terminal;
        
        // Display the execution result
        terminal.writeln('\r\n🚀 Code Execution Result:');
        terminal.writeln(`📁 File: ${result.fileName}`);
        terminal.writeln(`🔧 Language: ${result.language}`);
        terminal.writeln(`⏱️ Execution Time: ${result.cpuTime}ms`);
        terminal.writeln(`💾 Memory Used: ${result.memory}KB`);
        terminal.writeln('');
        
        if (result.success) {
          terminal.writeln('✅ Execution Successful!');
          if (result.output) {
            terminal.writeln('📤 Output:');
            terminal.writeln(result.output);
          }
        } else {
          terminal.writeln('❌ Execution Failed!');
          if (result.error) {
            terminal.writeln('❌ Error:');
            terminal.writeln(result.error);
          }
        }
        
        terminal.writeln('\r\n' + '─'.repeat(50));
        terminal.writeln('');
        
        // Ensure output is visible
        ensureScrollToBottom(terminal);
      }
    };

    // Cleanup on unmount
    return () => {
      delete window.runCodeResult;
    };
  }, [activeTerminalId]);

  /**
   * Terminal tab management
   */
  const addNewTerminal = () => {
    const newId = Date.now().toString();
    const newTerminal = {
      id: newId,
      title: `Terminal ${terminals.length + 1}`,
      active: false
    };
    
    setTerminals(prev => prev.map(t => ({ ...t, active: false })).concat({ ...newTerminal, active: true }));
    setActiveTerminalId(newId);

    // Create terminal instance after DOM update
    setTimeout(() => {
      createTerminalInstance(newId);
    }, 100);
  };

  const closeTerminal = (terminalId) => {
    if (terminals.length === 1) return;
    
    // Cleanup terminal instance
    const terminalInstance = terminalsRef.current.get(terminalId);
    if (terminalInstance) {
      terminalInstance.cleanup();
      terminalsRef.current.delete(terminalId);
    }
    
    const filteredTerminals = terminals.filter(t => t.id !== terminalId);
    setTerminals(filteredTerminals);
    
    if (activeTerminalId === terminalId) {
      const newActive = filteredTerminals[filteredTerminals.length - 1];
      setActiveTerminalId(newActive.id);
      setTerminals(prev => prev.map(t => 
        t.id === newActive.id ? { ...t, active: true } : { ...t, active: false }
      ));
    }
  };

  const switchTerminal = (terminalId) => {
    setActiveTerminalId(terminalId);
    setTerminals(prev => prev.map(t => 
      t.id === terminalId ? { ...t, active: true } : { ...t, active: false }
    ));

    // Focus the terminal
    setTimeout(() => {
      const terminalInstance = terminalsRef.current.get(terminalId);
      if (terminalInstance) {
        terminalInstance.terminal.focus();
        terminalInstance.fitAddon.fit();
      }
    }, 100);
  };

  const clearTerminal = () => {
    const terminalInstance = terminalsRef.current.get(activeTerminalId);
    if (terminalInstance) {
      terminalInstance.terminal.clear();
      terminalInstance.socket.emit('terminal:input', { 
        data: 'clear\r', 
        terminalId: activeTerminalId,
        sessionId: terminalInstance.sessionId 
      });
    }
  };

  // Tab editing functions
  const startRenameTab = (terminalId, currentTitle) => {
    setEditingTabId(terminalId);
    setEditingTabTitle(currentTitle);
  };

  const saveTabRename = () => {
    if (editingTabId && editingTabTitle.trim()) {
      setTerminals(prev => prev.map(t => 
        t.id === editingTabId ? { ...t, title: editingTabTitle.trim() } : t
      ));
    }
    setEditingTabId(null);
    setEditingTabTitle('');
  };

  const cancelTabRename = () => {
    setEditingTabId(null);
    setEditingTabTitle('');
  };

  // Status helpers
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ready': return '#0dbc79';
      case 'connected': return '#2472c8';
      case 'disconnected': return '#666666';
      case 'error': return '#cd3131';
      default: return '#e5e510';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'ready': return 'Ready';
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Initializing';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminalsRef.current.forEach(terminalInstance => {
        terminalInstance.cleanup();
      });
      terminalsRef.current.clear();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.terminal-dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className={`professional-terminal ${className}`}>
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="header-left">
          <div className="terminal-title">
            <span className="title-text">TERMINAL</span>
            <div className="status-indicator">
          <div 
                className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          />
              <span className="status-text">{getStatusText()}</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            className="header-btn"
            onClick={addNewTerminal}
            disabled={isLoading}
            title="New Terminal"
          >
            <Plus size={16} />
          </button>
          
          <div className="terminal-dropdown-container">
            <button 
              className="header-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Terminal Menu"
            >
              <ChevronDown size={16} />
            </button>
            
            {showDropdown && (
              <div className="terminal-dropdown">
                <div className="dropdown-item" onClick={clearTerminal}>
                  <Trash2 size={14} />
                  <span>Clear Terminal</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={async () => {
                    try {
                      setShowDropdown(false);
                      const activeTerminalInstance = terminalsRef.current.get(activeTerminalId);
                      if (activeTerminalInstance) {
                        activeTerminalInstance.terminal.writeln('🔨 Rebuilding terminal environment...');
                      }
                      
                      const response = await fetch('/api/terminal/rebuild', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      const result = await response.json();
                      
                      if (activeTerminalInstance) {
                        if (result.success) {
                          activeTerminalInstance.terminal.writeln('✅ Terminal environment rebuilt successfully!');
                          activeTerminalInstance.terminal.writeln('💡 Please refresh the page to use the updated terminal.');
                        } else {
                          activeTerminalInstance.terminal.writeln('❌ Failed to rebuild terminal environment.');
                        }
                      }
                    } catch (error) {
                      console.error('Failed to rebuild terminal:', error);
                      const activeTerminalInstance = terminalsRef.current.get(activeTerminalId);
                      if (activeTerminalInstance) {
                        activeTerminalInstance.terminal.writeln('❌ Failed to rebuild terminal environment.');
                      }
                    }
                  }}
                >
                  <Settings size={14} />
                  <span>Rebuild Terminal Environment</span>
                </div>
                <div className="dropdown-separator" />
                <div 
                  className="dropdown-item"
                  onClick={() => {
                    const activeTab = terminals.find(t => t.active);
                    if (activeTab) {
                      startRenameTab(activeTab.id, activeTab.title);
                      setShowDropdown(false);
                    }
                  }}
                >
                  <Settings size={14} />
                  <span>Rename Terminal</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Tabs */}
      <div className="terminal-tabs-bar">
        <div className="terminal-tabs">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              className={`terminal-tab ${terminal.active ? 'active' : ''}`}
              onClick={() => switchTerminal(terminal.id)}
            >
              {editingTabId === terminal.id ? (
                <input
                  type="text"
                  value={editingTabTitle}
                  onChange={(e) => setEditingTabTitle(e.target.value)}
                  onBlur={saveTabRename}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') saveTabRename();
                    if (e.key === 'Escape') cancelTabRename();
                  }}
                  className="tab-input"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="tab-title"
                  onDoubleClick={() => startRenameTab(terminal.id, terminal.title)}
                >
                  {terminal.title}
                </span>
              )}
              
              {terminals.length > 1 && (
                <button 
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(terminal.id);
                  }}
                  title="Close Terminal"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Content Area */}
      <div className="terminal-content" ref={terminalContainerRef}>
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            data-terminal-id={terminal.id}
            className={`terminal-instance ${terminal.active ? 'active' : 'hidden'}`}
          />
        ))}

        {/* Loading overlay */}
        {isLoading && (
          <div className="terminal-loading">
            <div className="loading-content">
              <LoadingSpinner type="wave" text="Initializing terminal..." />
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default CloudTerminal; 