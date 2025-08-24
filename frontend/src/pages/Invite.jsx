import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('pending'); // 'pending', 'success', 'error', 'login'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link.');
      return;
    }
    if (!user) {
      // Not logged in, redirect to login with redirect back to this invite
      setStatus('login');
      setTimeout(() => {
        navigate(`/login?redirect=/invite/${token}`);
      }, 1200);
      return;
    }
    // Accept invite
    const accept = async () => {
      try {
        const res = await fetch('/api/projects/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userId: user.uid })
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('You have joined the project! Redirecting...');
          setTimeout(() => {
            navigate(`/editor/${data.projectId}`);
          }, 1800);
        } else {
          setStatus('error');
          setMessage(data.message || 'Failed to join project.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Failed to join project.');
      }
    };
    accept();
  }, [token, user, authLoading, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#23272e', color: '#fff', flexDirection: 'column' }}>
      <div style={{ background: '#181e29', padding: 32, borderRadius: 12, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #0008', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Project Invitation</h2>
        {status === 'pending' && <div>Processing your invite...</div>}
        {status === 'login' && <div>Please login to accept the invite...</div>}
        {status === 'success' && <div style={{ color: '#4FC3F7', fontWeight: 600 }}>{message}</div>}
        {status === 'error' && <div style={{ color: '#FF6B6B', fontWeight: 600 }}>{message}</div>}
      </div>
    </div>
  );
} 