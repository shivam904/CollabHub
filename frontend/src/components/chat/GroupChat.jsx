import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../contexts/RealtimeContext';
import { createAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './GroupChat.css';

const GroupChat = ({ projectId }) => {
  const { user, token } = useAuth();
  const { socket, isConnected } = useRealtime();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Get the messages container
      const messagesContainer = messagesEndRef.current.parentElement;
      
      if (messagesContainer) {
        // Force scroll to bottom immediately
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Also use scrollIntoView for better compatibility
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest'
        });
      }
    }
  };

  // Load messages from API
  const loadMessages = async () => {
    if (!projectId || !token) {
      console.log('💬 Skipping loadMessages - missing projectId or token');
      return;
    }
    
    console.log('📖 Loading messages for project:', projectId);
    setLoading(true);
    
    try {
      const api = createAPI(token);
      const response = await api.get(`/messages/project/${projectId}`);
      
      if (response.success && response.data.messages) {
        console.log(`✅ Loaded ${response.data.messages.length} messages`);
        setMessages(response.data.messages);
        // Auto-scroll will be handled by the useEffect
      } else {
        console.warn('⚠️ Invalid response structure:', response);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      
      // Don't show error toast for network issues during initial load
      if (error.message.includes('fetch')) {
        console.log('📡 Network error, will retry when connection improves');
      } else {
        toast.error('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !token) return;

    try {
      const api = createAPI(token);
      const response = await api.post(`/messages/project/${projectId}`, {
        message: newMessage.trim()
      });

      if (response.success) {
        // Broadcast message via socket
        socket.emit('new-message', {
          projectId,
          message: response.data.message
        });
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Join chat room when component mounts
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    console.log('💬 Joining project chat:', projectId);
    socket.emit('join-project-chat', { projectId });
    
    return () => {
      console.log('💬 Leaving project chat:', projectId);
      socket.emit('leave-project-chat', { projectId });
    };
  }, [socket, isConnected, projectId]);

  // Load messages when connected and project changes
  useEffect(() => {
    if (!isConnected || !projectId || !token) return;
    
    console.log('📖 Loading messages for project:', projectId);
    loadMessages();
  }, [isConnected, projectId, token]);

  // Auto-scroll when messages change
  useEffect(() => {
    // Scroll immediately
    scrollToBottom();
    
    // Use multiple timeouts to ensure scrolling works reliably across different scenarios
    const timeouts = [
      setTimeout(scrollToBottom, 0),
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 200),
      setTimeout(scrollToBottom, 500)
    ];
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [messages]);

  // Listen for new messages and connection changes
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log('💬 New message received:', message);
      setMessages(prev => [...prev, message]);
    };

    const handleConnect = () => {
      console.log('🔄 Socket reconnected, reloading messages');
      // Reload messages when reconnected to get any missed messages
      if (projectId && token) {
        setTimeout(() => loadMessages(), 500);
      }
    };

    socket.on('message-received', handleNewMessage);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('message-received', handleNewMessage);
      socket.off('connect', handleConnect);
    };
  }, [socket, projectId, token]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="group-chat">
        <div className="chat-placeholder">
          Please log in to access chat
        </div>
      </div>
    );
  }

  return (
    <div className="group-chat">
      <div className="chat-header">
        <h3>Group Chat</h3>
        <span className="connection-status">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="loading">Loading messages...</div>
        ) : (
          messages.map((message) => (
            <div 
              key={message._id} 
              className={`message ${message.sender.userId === user.uid ? 'own-message' : ''}`}
            >
              <div className="message-header">
                <span className="sender">{message.sender.name}</span>
                <span className="timestamp">{formatTime(message.createdAt)}</span>
              </div>
              <div className="message-text">{message.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="chat-messages-end" />
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={!isConnected}
          maxLength={1000}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim() || !isConnected}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default GroupChat;
