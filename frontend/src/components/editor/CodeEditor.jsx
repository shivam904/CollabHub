import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Play } from 'lucide-react';
import './CodeEditor.css';

const CodeEditor = ({ file, onSave, onCodeChange, userRole = 'editor' }) => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [lastSaved, setLastSaved] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Get programming language from file extension
  const getLanguageFromFileName = useCallback((fileName) => {
    if (!fileName) return 'plaintext';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte'
    };

    return languageMap[extension] || 'plaintext';
  }, []);

  // Load file content when file changes
  useEffect(() => {
    if (file) {
      console.log(`📄 Loading file: ${file.name}`);
      const fileContent = file.content || '';
      setCode(fileContent);
      setOriginalCode(fileContent);
      setHasUnsavedChanges(false);
      setLanguage(getLanguageFromFileName(file.name));
      setSaveStatus('');
      setLastSaved(file.lastModified ? new Date(file.lastModified) : null);
      
      // Check if file type is supported for compilation
      checkFileSupport(file.name);
      
      // Focus editor after loading
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 100);
    }
  }, [file, getLanguageFromFileName]);

  // Check if file type is supported for compilation
  const checkFileSupport = async (fileName) => {
    try {
      const response = await fetch(`/api/compiler/support/${encodeURIComponent(fileName)}`);
      const data = await response.json();
      setIsSupported(data.isSupported);
    } catch (error) {
      console.error('Failed to check file support:', error);
      setIsSupported(false);
    }
  };

  // Handle code changes
  const handleCodeChange = useCallback((newCode) => {
    if (newCode !== code) {
      setCode(newCode);
      setHasUnsavedChanges(newCode !== originalCode);
      
      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Update save status
      if (newCode !== originalCode) {
        setSaveStatus('Unsaved changes');
      } else {
        setSaveStatus('');
      }

      // Send code change to real-time collaboration
      if (onCodeChange && file) {
        onCodeChange(file._id, newCode);
      }
    }
  }, [code, originalCode, onCodeChange, file]);

  // Save file function
  const saveFile = useCallback(async () => {
    if (!file || !hasUnsavedChanges || isSaving) {
      return false;
    }

    console.log(`💾 [CodeEditor] Saving file: ${file.name}`);
    console.log(`📝 Content length: ${code.length} characters`);
    console.log(`🔍 Content preview: ${code.substring(0, 100)}...`);

    try {
      setIsSaving(true);
      setSaveStatus('Saving...');

      const success = await onSave(file._id, code);
      
      if (success) {
        setOriginalCode(code);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setSaveStatus('Saved successfully!');
        
        // Clear status after 2 seconds
        setTimeout(() => {
          setSaveStatus('');
        }, 2000);
        
        console.log(`✅ File saved successfully: ${file.name}`);
        return true;
      } else {
        setSaveStatus('Save failed');
        toast.error('Failed to save file');
        console.error(`❌ Save failed for file: ${file.name}`);
        return false;
      }
    } catch (error) {
      setSaveStatus('Save failed');
      toast.error('Error saving file');
      console.error(`💥 Error saving file: ${file.name}`, error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [file, hasUnsavedChanges, isSaving, code, onSave]);

  // Run code function
  const runCode = useCallback(async () => {
    if (!file || isRunning || !isSupported) {
      return;
    }

    console.log(`🚀 Running code: ${file.name}`);
    
    try {
      setIsRunning(true);
      
      const response = await fetch('/api/compiler/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          code: code,
          input: '',
          userId: user?.uid || 'anonymous',
          projectId: file.projectId || 'default'
        })
      });

      const data = await response.json();
      
      if (data.success && data.result) {
        const result = data.result;
        
        // Emit the result to the terminal via socket
        if (window.runCodeResult) {
          window.runCodeResult({
            fileName: file.name,
            success: result.success,
            output: result.output,
            error: result.error,
            language: result.language,
            memory: result.memory,
            cpuTime: result.cpuTime
          });
        }
        
        if (result.success) {
          toast.success(`Code executed successfully! (${result.cpuTime}ms)`);
        } else {
          toast.error(`Execution failed: ${result.error}`);
        }
      } else {
        toast.error(data.message || 'Failed to execute code');
      }
    } catch (error) {
      console.error('Run code error:', error);
      toast.error('Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  }, [file, code, isRunning, isSupported, user?.uid]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveFile();
      }
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        if (isSupported && !isRunning) {
          runCode();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveFile, runCode, isSupported, isRunning]);

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure Monaco Editor theme with custom cursor and dark theme
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'd4d4d4', background: '1e1e1e' },
      ],
      colors: {
        'editorCursor.foreground': '#ffffff',
        'editorCursor.background': '#000000',
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#bfbfbf66'
      }
    });
    monaco.editor.setTheme('customDark');
    
    // Enhanced editor configuration - only non-conflicting settings
    editor.updateOptions({
      // Additional cursor settings not in main options
      tabCompletion: 'on',
      wordBasedSuggestions: 'allDocuments',
      
      // Hover and tooltips
      hover: {
        enabled: true,
        delay: 300,
        sticky: true
      },
      
      // Formatting and indentation
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      
      // Visual improvements
      smoothScrolling: true,
      mouseWheelZoom: true,
      fontLigatures: true,
      
      // Bracket matching and colorization
      matchBrackets: 'always',
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true
      },
      
      // Selection and highlighting
      selectionHighlight: true,
      occurrencesHighlight: true,
      
      // Folding settings
      foldingHighlight: true
    });
    
    // Add save keyboard shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
      saveFile();
    });

    // Configure language-specific settings
    if (language === 'html') {
      monaco.languages.html.htmlDefaults.setOptions({
        format: {
          tabSize: 2,
          insertSpaces: true,
          wrapLineLength: 120,
          preserveNewLines: true,
          maxPreserveNewLines: 2,
          indentInnerHtml: false,
          wrapAttributes: 'auto'
        }
      });
      
      // Additional HTML-specific options
      editor.updateOptions({
        renderWhitespace: 'boundary',
        renderControlCharacters: true
      });
    }

    // Auto-resize editor
    const resizeObserver = new ResizeObserver(() => {
      editor.layout();
    });
    resizeObserver.observe(editor.getContainerDomNode());

    // Ensure editor has focus for proper cursor display
    setTimeout(() => {
      editor.focus();
      // Force cursor to be visible
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.revealLine(1);
    }, 100);

    // Add click handler to ensure focus
    editor.onDidFocusEditorText(() => {
      console.log('Editor focused - cursor should be visible');
    });

    // Force cursor visibility on any content change
    editor.onDidChangeModelContent(() => {
      if (!editor.hasTextFocus()) {
        editor.focus();
      }
    });

    console.log(`🎯 Monaco Editor initialized for ${language} file: ${file?.name}`);
  };

  // Format last saved time
  const formatLastSaved = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  // Don't render if no file is selected
  if (!file) {
    return (
      <div className="code-editor-placeholder">
        <div className="placeholder-content">
          <h3>📝 No File Selected</h3>
          <p>Select a file from the file explorer to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="code-editor-container">
      {/* Editor Header */}
      <div className="editor-header">
        <div className="file-info">
          <span className="file-name">{file.name}</span>
          <span className="file-language">{language}</span>
          {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}
        </div>
        
        <div className="editor-actions">
          <div className="save-status">
            {saveStatus && (
              <span className={`status ${isSaving ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved'}`}>
                {saveStatus}
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="last-saved">
                Saved {formatLastSaved(lastSaved)}
              </span>
            )}
          </div>
          
          {isSupported && (
            <button
              className={`run-button ${isRunning ? 'running' : ''}`}
              onClick={runCode}
              disabled={isRunning || userRole === 'viewer'}
              title="Run code (Ctrl+R)"
            >
              <Play size={14} />
              {isRunning ? ' Running...' : ' Run'}
            </button>
          )}
          
          <button
            className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={saveFile}
            disabled={!hasUnsavedChanges || isSaving || userRole === 'viewer'}
            title="Save file (Ctrl+S)"
          >
            {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save' : '✅ Saved'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="editor-content">
          <MonacoEditor
          value={code}
            language={language}
            theme="customDark"
          onChange={userRole === 'viewer' ? undefined : handleCodeChange}
          onMount={handleEditorDidMount}
            options={{
            automaticLayout: true,
              fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            lineNumbers: 'on',
            minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              detectIndentation: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderWhitespace: 'none',
            renderControlCharacters: false,
            unicodeHighlight: {
              ambiguousCharacters: false,
              invisibleCharacters: false
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            accessibilitySupport: 'auto',
            // CURSOR SETTINGS - Critical for visibility
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: 'on',
            cursorStyle: 'line',
            cursorWidth: 2,
            hideCursorInOverviewRuler: false,
              readOnly: userRole === 'viewer'
            }}
          width="100%"
            height="100%"
        />
      </div>

      {/* File Stats */}
      <div className="editor-footer">
        <div className="file-stats">
          <span>Lines: {code.split('\n').length}</span>
          <span>Characters: {code.length}</span>
          <span>Size: {(new Blob([code]).size / 1024).toFixed(1)} KB</span>
          {userRole === 'viewer' && <span className="viewer-mode">👁️ Read-only</span>}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
