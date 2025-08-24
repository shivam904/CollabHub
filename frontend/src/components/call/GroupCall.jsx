import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../contexts/RealtimeContext';
import toast from 'react-hot-toast';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import './GroupCall.css';

const GroupCall = ({ projectId }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useRealtime();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  
  const localAudioRef = useRef(null);
  const remoteAudiosRef = useRef({});
  const peerConnectionsRef = useRef({});

  // WebRTC configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Join call
  const joinCall = async () => {
    try {
      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      
      // Emit join call event
      socket.emit('join-call', { projectId, userId: user?.uid, userName: user?.displayName || user?.email });
      
      toast.success('Joined call successfully');
    } catch (error) {
      console.error('Error joining call:', error);
      toast.error('Failed to access microphone');
    }
  };

  // Leave call
  const leaveCall = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    // Clear remote audios
    Object.values(remoteAudiosRef.current).forEach(audio => {
      if (audio.srcObject) {
        audio.srcObject.getTracks().forEach(track => track.stop());
      }
    });
    remoteAudiosRef.current = {};

    setIsInCall(false);
    setParticipants([]);
    
    // Emit leave call event
    socket.emit('leave-call', { projectId, userId: user?.uid });
    
    toast.success('Left call');
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        // Notify others about mute status
        socket.emit('call-mute-toggle', { 
          projectId, 
          userId: user?.uid, 
          isMuted: !isMuted 
        });
      }
    }
  };

  // Toggle deafen (mute output)
  const toggleDeafen = () => {
    Object.values(remoteAudiosRef.current).forEach(audio => {
      audio.volume = isDeafened ? 1 : 0;
    });
    setIsDeafened(!isDeafened);
  };

  // Create peer connection
  const createPeerConnection = (remoteUserId) => {
    const pc = new RTCPeerConnection(iceServers);
    
    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const audioElement = document.createElement('audio');
      audioElement.srcObject = remoteStream;
      audioElement.autoplay = true;
      audioElement.volume = isDeafened ? 0 : 1;
      remoteAudiosRef.current[remoteUserId] = audioElement;
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call-ice-candidate', {
          projectId,
          to: remoteUserId,
          candidate: event.candidate
        });
      }
    };

    peerConnectionsRef.current[remoteUserId] = pc;
    return pc;
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Receive initial participants list when joining
    socket.on('call-participants-list', ({ participants }) => {
      console.log('📞 Received participants list:', participants);
      setParticipants(participants);
      
      // Create peer connections for existing participants if we're in call
      if (isInCall && localStream) {
        participants.forEach(async (participant) => {
          if (participant.userId !== user?.uid) {
            const pc = createPeerConnection(participant.userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            socket.emit('call-offer', {
              projectId,
              to: participant.userId,
              offer
            });
          }
        });
      }
    });

    // User joined call
    socket.on('user-joined-call', async ({ userId, userName }) => {
      if (userId === user?.uid) return;
      
      console.log('📞 User joined call:', { userId, userName });
      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, userName, isMuted: false }]);
      
      if (isInCall && localStream) {
        // Create offer for new user
        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('call-offer', {
          projectId,
          to: userId,
          offer
        });
      }
    });

    // User left call
    socket.on('user-left-call', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      
      // Close peer connection
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      
      // Remove remote audio
      if (remoteAudiosRef.current[userId]) {
        delete remoteAudiosRef.current[userId];
      }
    });

    // Receive call offer
    socket.on('call-offer', async ({ from, offer }) => {
      if (!isInCall) return;
      
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('call-answer', {
        projectId,
        to: from,
        answer
      });
    });

    // Receive call answer
    socket.on('call-answer', async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    });

    // Receive ICE candidate
    socket.on('call-ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.addIceCandidate(candidate);
      }
    });

    // Mute status update
    socket.on('call-mute-update', ({ userId, isMuted }) => {
      setParticipants(prev => 
        prev.map(p => p.userId === userId ? { ...p, isMuted } : p)
      );
    });

    return () => {
      socket.off('call-participants-list');
      socket.off('user-joined-call');
      socket.off('user-left-call');
      socket.off('call-offer');
      socket.off('call-answer');
      socket.off('call-ice-candidate');
      socket.off('call-mute-update');
    };
  }, [socket, isConnected, isInCall, localStream, user?.uid, projectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInCall) {
        leaveCall();
      }
    };
  }, []);

  // Early return if user is not loaded yet (after all hooks)
  if (!user) {
    return (
      <div className="group-call">
        <div className="call-placeholder">
          Please log in to access group call
        </div>
      </div>
    );
  }

  return (
    <div className="group-call">
      <div className="call-header">
        <h3>Group Call</h3>
        <span className="connection-status">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      <div className="call-content">
        {!isInCall ? (
          <div className="call-join">
            <div className="call-icon">
              <Phone size={48} />
            </div>
            <h4>Join Group Call</h4>
            <p>Start or join a voice call with your collaborators</p>
            <button 
              className="join-button"
              onClick={joinCall}
              disabled={!isConnected}
            >
              <Phone size={20} />
              Join Call
            </button>
          </div>
        ) : (
          <div className="call-active">
            <div className="participants">
              <h4>Participants ({participants.length + 1})</h4>
              
              {/* Current user */}
              <div className="participant self">
                <div className="participant-info">
                  <span className="name">You</span>
                  {isMuted && <MicOff size={16} className="mute-icon" />}
                </div>
              </div>

              {/* Other participants */}
              {participants.map(participant => (
                <div key={participant.userId} className="participant">
                  <div className="participant-info">
                    <span className="name">{participant.userName}</span>
                    {participant.isMuted && <MicOff size={16} className="mute-icon" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="call-controls">
              <button 
                className={`control-button ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button 
                className={`control-button ${isDeafened ? 'active' : ''}`}
                onClick={toggleDeafen}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <button 
                className="control-button leave-button"
                onClick={leaveCall}
                title="Leave Call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element for local stream */}
      <audio ref={localAudioRef} muted={true} />
    </div>
  );
};

export default GroupCall;
