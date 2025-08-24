import React, { useState, useRef, useContext } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RealtimeContext } from '../../contexts/RealtimeContext.jsx';

const FILE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' }
];

export default function CollaborationPanel({ collaborators = [], projectId }) {
  const { user } = useAuth();
  
  // Use useContext directly with null check instead of useRealtime hook
  const realtimeContext = useContext(RealtimeContext);
  const fileUsers = realtimeContext?.fileUsers || new Map();
  
  // If realtime context is not available, show a basic version
  if (!realtimeContext) {
    console.log('⚠️ RealtimeContext not available, showing basic collaboration panel');
  }
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState(collaborators);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, member: null });
  const [assignModal, setAssignModal] = useState({ open: false, member: null });
  const [deassignModal, setDeassignModal] = useState({ open: false, member: null });
  const [files, setFiles] = useState([]);
  const [fileAssignments, setFileAssignments] = useState({});
  const [assignLoading, setAssignLoading] = useState(false);
  const [deassignLoading, setDeassignLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedFileRole, setSelectedFileRole] = useState('editor');
  const [selectedDeassignFile, setSelectedDeassignFile] = useState('');
  const [assignError, setAssignError] = useState('');
  const contextMenuRef = useRef(null);

  React.useEffect(() => {
    setMembers(collaborators);
  }, [collaborators]);

  // Close context menu on outside click
  React.useEffect(() => {
    if (!contextMenu.show) return;
    const handleClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ show: false, x: 0, y: 0, member: null });
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu.show]);

  // Fetch files when assign modal opens
  React.useEffect(() => {
    if (assignModal.open && projectId) {
      fetchFiles();
    }
  }, [assignModal.open, projectId]);

  // Fetch file assignments when deassign modal opens
  React.useEffect(() => {
    if (deassignModal.open && projectId && deassignModal.member) {
      fetchFileAssignments();
    }
  }, [deassignModal.open, projectId, deassignModal.member]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/files/project/${projectId}?userId=${user?.uid}`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        // Get current file assignments
        const assignments = {};
        data.files.forEach(file => {
          if (file.permissions && file.permissions.length > 0) {
            assignments[file._id] = file.permissions;
          }
        });
        setFileAssignments(assignments);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const fetchFileAssignments = async () => {
    try {
      const res = await fetch(`/api/files/project/${projectId}?userId=${user?.uid}`);
      const data = await res.json();
      if (data.files) {
        const assignments = {};
        data.files.forEach(file => {
          if (file.permissions && file.permissions.length > 0) {
            assignments[file._id] = file.permissions;
          }
        });
        setFileAssignments(assignments);
      }
    } catch (err) {
      console.error('Failed to fetch file assignments:', err);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return '#FF6B6B';
      case 'admin': return '#4ECDC4';
      case 'editor': return '#45B7D1';
      case 'viewer': return '#96CEB4';
      default: return '#95A5A6';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  const isOwner = members.find(m => m.userId === user?.uid)?.role === 'owner';

  const handleInvite = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer', userId: user?.uid })
      });
      const data = await res.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
        setInviteModal(true);
      } else {
        setError(data.message || 'Failed to generate invite link');
      }
    } catch (err) {
      setError('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  const handleWhatsAppShare = () => {
    if (inviteLink) {
      const text = encodeURIComponent(`Join my project on CollabHub: ${inviteLink}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleAssignFile = async () => {
    console.log('Assigning file:', selectedFile, 'Available files:', files);
    if (!selectedFile || !assignModal.member) {
      setAssignError('Missing required fields');
      return;
    }
    
    setAssignLoading(true);
    setAssignError('');
    try {
      const res = await fetch(`/api/files/${selectedFile}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: assignModal.member.userId, // The user to assign the file to
          role: selectedFileRole,            // 'admin' or 'editor'
          actingUserId: user?.uid            // The owner/assigner
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssignModal({ open: false, member: null });
        setSelectedFile('');
        setSelectedFileRole('editor');
        // Refresh files to show updated assignments
        await fetchFiles();
        setAssignError('');
      } else {
        setAssignError(data.message || 'Failed to assign file');
      }
    } catch (err) {
      setAssignError('Failed to assign file');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeassignFile = async () => {
    if (!selectedDeassignFile || !deassignModal.member) return;
    
    setDeassignLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/files/${selectedDeassignFile}/deassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.uid,
          targetUserId: deassignModal.member.userId
        })
      });
      const data = await res.json();
      if (data.success) {
        setDeassignModal({ open: false, member: null });
        setSelectedDeassignFile('');
        // Refresh files to show updated assignments
        await fetchFiles();
        setError('');
      } else {
        setError(data.message || 'Failed to deassign file');
      }
    } catch (err) {
      setError('Failed to deassign file');
    } finally {
      setDeassignLoading(false);
    }
  };

  // Get files that can be assigned (not already assigned as editor/admin)
  const getAvailableFiles = () => {
    return files.filter(file => {
      const permissions = fileAssignments[file._id] || [];
      // Check if file already has an editor or admin
      const hasEditorOrAdmin = permissions.some(p => p.role === 'editor' || p.role === 'admin');
      return !hasEditorOrAdmin;
    });
  };

  // Get files assigned to the current member
  const getMemberAssignedFiles = () => {
    if (!deassignModal.member) return [];
    
    return files.filter(file => {
      const permissions = fileAssignments[file._id] || [];
      return permissions.some(p => 
        p.userId === deassignModal.member.userId && 
        (p.role === 'editor' || p.role === 'admin')
      );
    });
  };

  // Get current assignment info for a file
  const getFileAssignmentInfo = (fileId) => {
    const permissions = fileAssignments[fileId] || [];
    const editorOrAdmin = permissions.find(p => p.role === 'editor' || p.role === 'admin');
    return editorOrAdmin;
  };

  return (
    <div style={{ minWidth: 340, maxWidth: 400, background: '#23272e', borderRadius: 12, boxShadow: '0 4px 32px #0008', padding: 24, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1, flex: 1 }}>Collaboration</span>
        <span style={{ fontSize: 13, color: '#4FC3F7', fontWeight: 500 }}>Connected</span>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleInvite}
          style={{ background: '#4FC3F7', color: '#181e29', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Invite via Link'}
        </button>
      </div>
      <div style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>Project Collaborators ({members.length})</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {members.map(collaborator => {
            const isOnline = fileUsers.has(collaborator.userId);
            return (
              <li
                key={collaborator.userId}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '8px 12px', background: '#2a2f3a', borderRadius: 8, position: 'relative' }}
                onContextMenu={isOwner && collaborator.role !== 'owner' ? (e) => {
                  e.preventDefault();
                  setContextMenu({ show: true, x: e.clientX, y: e.clientY, member: collaborator });
                } : undefined}
              >
                <div style={{ position: 'relative' }}>
                  <img 
                    src={collaborator.user?.profilePhoto || 'https://via.placeholder.com/36x36/444/fff?text=?'} 
                    alt={collaborator.user?.displayName || collaborator.userId} 
                    style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: '50%', 
                      objectFit: 'cover', 
                      background: '#444',
                      border: `2px solid ${getRoleColor(collaborator.role)}`
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: isOnline ? '#4CAF50' : '#888',
                    border: '2px solid #23272e'
                  }} title={isOnline ? 'Online' : 'Offline'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 2 }}>
                    {collaborator.user?.displayName || 'Unknown User'}
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {collaborator.user?.email || collaborator.userId}
                  </div>
                </div>
                {isOwner && collaborator.role !== 'owner' ? (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: getRoleColor(collaborator.role),
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {getRoleLabel(collaborator.role)}
                  </div>
                ) : (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: getRoleColor(collaborator.role),
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {getRoleLabel(collaborator.role)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {/* Context Menu */}
        {contextMenu.show && (
          <div
            ref={contextMenuRef}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#23272e',
              color: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 24px #0008',
              zIndex: 1500,
              minWidth: 160,
              padding: '8px 0'
            }}
          >
            <div
              style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                setAssignError('');
                setAssignModal({ open: true, member: contextMenu.member });
                setContextMenu({ show: false, x: 0, y: 0, member: null });
              }}
            >Assign File</div>
            <div
              style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                setDeassignModal({ open: true, member: contextMenu.member });
                setContextMenu({ show: false, x: 0, y: 0, member: null });
              }}
            >Deassign File</div>
          </div>
        )}
      </div>
      {/* Invite Link Modal */}
      {inviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272e', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #0008', color: '#fff', position: 'relative' }}>
            <button onClick={() => setInviteModal(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Invite Link</h3>
            <div style={{ marginBottom: 16, wordBreak: 'break-all', background: '#181e29', padding: 10, borderRadius: 6, fontSize: 15 }}>{inviteLink}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={handleCopy} style={{ flex: 1, background: '#4FC3F7', color: '#181e29', border: 'none', borderRadius: 6, padding: '8px 0', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Copy</button>
              <button onClick={handleWhatsAppShare} style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Share via WhatsApp</button>
            </div>
            {error && <div style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      )}
      {/* Assign File Modal */}
      {assignModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272e', borderRadius: 12, padding: 32, minWidth: 400, maxWidth: 500, boxShadow: '0 4px 32px #0008', color: '#fff', position: 'relative' }}>
            <button onClick={() => { setAssignError(''); setAssignModal({ open: false, member: null }); }} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
              Assign File to {assignModal.member?.user?.displayName || assignModal.member?.userId}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Select File:</label>
              <select
                value={selectedFile}
                onChange={(e) => {
                  setSelectedFile(e.target.value);
                  console.log('Selected file value:', e.target.value);
                  if (e.target.value && selectedFileRole) setAssignError('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#181e29',
                  color: '#fff',
                  border: '1px solid #444',
                  fontSize: 14
                }}
              >
                <option value="">Choose a file...</option>
                {getAvailableFiles().map(file => (
                  <option key={file._id} value={file._id}>{file.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Role:</label>
              <select
                value={selectedFileRole}
                onChange={(e) => {
                  setSelectedFileRole(e.target.value);
                  if (selectedFile && e.target.value) setAssignError('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#181e29',
                  color: '#fff',
                  border: '1px solid #444',
                  fontSize: 14
                }}
              >
                {FILE_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAssignFile}
                disabled={!selectedFile || assignLoading}
                style={{
                  flex: 1,
                  background: assignLoading ? '#666' : '#4FC3F7',
                  color: '#181e29',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: assignLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {assignLoading ? 'Assigning...' : 'Assign File'}
              </button>
              <button
                onClick={() => { setAssignError(''); setAssignModal({ open: false, member: null }); }}
                style={{
                  flex: 1,
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
            {assignError && <div style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{assignError}</div>}
          </div>
        </div>
      )}
      {/* Deassign File Modal */}
      {deassignModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272e', borderRadius: 12, padding: 32, minWidth: 400, maxWidth: 500, boxShadow: '0 4px 32px #0008', color: '#fff', position: 'relative' }}>
            <button onClick={() => setDeassignModal({ open: false, member: null })} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
              Deassign File from {deassignModal.member?.user?.displayName || deassignModal.member?.userId}
            </h3>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Select File to Deassign:</label>
              <select
                value={selectedDeassignFile}
                onChange={(e) => setSelectedDeassignFile(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#181e29',
                  color: '#fff',
                  border: '1px solid #444',
                  fontSize: 14
                }}
              >
                <option value="">Choose a file...</option>
                {getMemberAssignedFiles().map(file => {
                  const assignment = getFileAssignmentInfo(file._id);
                  return (
                    <option key={file._id} value={file._id}>
                      {file.name} ({assignment?.role || 'Unknown'})
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDeassignFile}
                disabled={!selectedDeassignFile || deassignLoading}
                style={{
                  flex: 1,
                  background: deassignLoading ? '#666' : '#FF6B6B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: deassignLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {deassignLoading ? 'Deassigning...' : 'Deassign File'}
              </button>
              <button
                onClick={() => setDeassignModal({ open: false, member: null })}
                style={{
                  flex: 1,
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
            {error && <div style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      )}
      {error && <div style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
} 