import React, { createContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import { NoiseSuppressionManager } from '../utils/noiseSuppression';
import voiceDetectorWorklet from '../utils/voiceDetector.worklet.js?url';

const VoiceChatContext = createContext();

export const VoiceChatProvider = ({ children }) => {
  // --- OLD CONTEXT STATE ---
  const [voiceRoom, setVoiceRoom] = useState(null);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [showVoiceUI, setShowVoiceUI] = useState(false);

  // --- VOICE LOGIC STATE ---
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [useEarpiece, setUseEarpiece] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [peers, setPeers] = useState(new Map());
  const [error, setError] = useState('');
  const [volumes, setVolumes] = useState(new Map());
  const [speakingStates, setSpeakingStates] = useState(new Map());
  const [audioStates, setAudioStates] = useState(new Map());
  const [screenProducer, setScreenProducer] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreens, setRemoteScreens] = useState(new Map());
  const [videoProducer, setVideoProducer] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const [remoteVideos, setRemoteVideos] = useState(new Map());
  const [isNoiseSuppressed, setIsNoiseSuppressed] = useState(false);
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('rnnoise');
  const [noiseSuppressMenuAnchor, setNoiseSuppressMenuAnchor] = useState(null);
  const [fullscreenShare, setFullscreenShare] = useState(null);
  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

  // --- REFS ---
  const noiseSuppressionRef = useRef(null);
  const isAudioEnabledRef = useRef(isAudioEnabled);
  const individualMutedPeersRef = useRef(new Map());
  const socketRef = useRef();
  const deviceRef = useRef();
  const producerTransportRef = useRef();
  const consumerTransportsRef = useRef(new Map());
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const localStreamRef = useRef();
  const audioRef = useRef(new Map());
  const audioContextRef = useRef();
  const gainNodesRef = useRef(new Map());
  const analyserNodesRef = useRef(new Map());
  const animationFramesRef = useRef(new Map());

  // --- CLEANUP ---
  const cleanup = useCallback(() => {
    isAudioEnabledRef.current = true;
    setUseEarpiece(true);
    setIsMuted(false);
    // Close all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    try {
      if (screenProducer) {
        screenProducer.close();
        setScreenProducer(null);
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      setRemoteScreens(new Map());
      audioRef.current.forEach((peerAudio, peerId) => {
        if (peerAudio instanceof Map && peerAudio.has('voiceDetector')) {
          const voiceDetector = peerAudio.get('voiceDetector');
          if (voiceDetector) {
            voiceDetector.port.close();
            voiceDetector.disconnect();
          }
        }
      });
      analyserNodesRef.current.forEach(analyser => {
        if (analyser) analyser.disconnect();
      });
      analyserNodesRef.current.clear();
      animationFramesRef.current.forEach((frameId) => {
        cancelAnimationFrame(frameId);
      });
      animationFramesRef.current.clear();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }
      consumerTransportsRef.current.forEach(transport => {
        if (transport) transport.close();
      });
      consumerTransportsRef.current.clear();
      producersRef.current.forEach(producer => {
        if (producer) producer.close();
      });
      producersRef.current.clear();
      consumersRef.current.forEach(consumer => {
        if (consumer) consumer.close();
      });
      consumersRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      audioRef.current.forEach(audio => {
        if (audio instanceof HTMLAudioElement) {
          audio.pause();
          audio.srcObject = null;
          audio.remove();
        }
      });
      audioRef.current.clear();
      gainNodesRef.current.forEach(node => {
        if (node) node.disconnect();
      });
      gainNodesRef.current.clear();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      deviceRef.current = null;
      if (noiseSuppressionRef.current) {
        noiseSuppressionRef.current.cleanup();
        noiseSuppressionRef.current = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    setPeers(new Map());
    setAudioStates(new Map());
    setSpeakingStates(new Map());
    setVolumes(new Map());
    setRemoteVideos(new Map());
    setError('');
    setIsJoined(false);
  }, [screenProducer, screenStream]);

  // --- SOCKET & PEER EVENTS ---
  const initSocketAndEvents = useCallback(async (roomData) => {
    // roomData: { roomId, userName, userId, serverId }
    // --- SOCKET CONNECTION ---
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const socket = io('https://4931257-dv98943.twc1.net', {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      secure: true,
      rejectUnauthorized: false,
      query: { roomId: roomData.roomId }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsJoined(true);
      socket.emit('setUserInfo', { userId: roomData.userId, serverId: roomData.serverId });
      socket.emit('muteState', { isMuted: false });
      socket.emit('audioState', { isEnabled: isAudioEnabledRef.current });
    });

    socket.on('connect_error', (error) => {
      setError('Failed to connect to server: ' + error.message);
    });

    socket.on('disconnect', () => {
      setIsJoined(false);
      setPeers(new Map());
      cleanup();
    });

    socket.on('peerJoined', ({ peerId, name, isMuted, isAudioEnabled }) => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        if (!newPeers.has(peerId)) {
          newPeers.set(peerId, { id: peerId, name, isMuted: Boolean(isMuted) });
        }
        return newPeers;
      });
      setAudioStates(prev => {
        const newStates = new Map(prev);
        newStates.set(peerId, Boolean(isAudioEnabled));
        return newStates;
      });
      setVolumes(prev => {
        const newVolumes = new Map(prev);
        newVolumes.set(peerId, isMuted ? 0 : 100);
        return newVolumes;
      });
      setSpeakingStates(prev => {
        const newStates = new Map(prev);
        newStates.set(peerId, false);
        return newStates;
      });
      individualMutedPeersRef.current.set(peerId, Boolean(isMuted));
    });

    socket.on('peerLeft', ({ peerId }) => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
      setAudioStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(peerId);
        return newStates;
      });
    });

    socket.on('speakingStateChanged', ({ peerId, speaking }) => {
      setSpeakingStates(prev => {
        const newStates = new Map(prev);
        newStates.set(peerId, speaking);
        return newStates;
      });
    });

    socket.on('peerMuteStateChanged', ({ peerId, isMuted }) => {
      setVolumes(prev => {
        const newVolumes = new Map(prev);
        newVolumes.set(peerId, isMuted ? 0 : 100);
        return newVolumes;
      });
      if (isMuted) {
        setSpeakingStates(prev => {
          const newStates = new Map(prev);
          newStates.set(peerId, false);
          return newStates;
        });
      }
    });

    socket.on('peerAudioStateChanged', ({ peerId, isEnabled }) => {
      setAudioStates(prev => {
        const newStates = new Map(prev);
        newStates.set(peerId, isEnabled);
        return newStates;
      });
    });

    // TODO: Add all media, producer, consumer, stream, noise suppression, video, screen share logic here
    // (see VoiceChat.jsx for full implementation)
  }, []);

  // --- JOIN/LEAVE LOGIC ---
  const handleJoin = useCallback(async (roomData) => {
    // roomData: { roomId, userName, userId, serverId }
    cleanup();
    // TODO: implement full join logic here (socket, media, etc.)
    initSocketAndEvents(roomData);
    setIsJoined(true);
  }, [cleanup, initSocketAndEvents]);

  const handleLeaveCall = useCallback(() => {
    cleanup();
    setIsJoined(false);
  }, [cleanup]);

  // --- MUTE/UNMUTE ---
  const handleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // TODO: add socket and stream mute logic
  }, []);

  // --- AUDIO TOGGLE ---
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev) => !prev);
    // TODO: add socket and stream audio logic
  }, []);

  // --- EFFECTS: SOCKET, ROOM, ETC. ---
  useEffect(() => {
    // TODO: implement socket connection, event listeners, cleanup, etc.
  }, []);

  // --- JOIN/LEAVE ROOM API ---
  const joinVoiceRoom = (data) => {
    setVoiceRoom(data);
    setIsVoiceChatActive(true);
    handleJoin(data);
  };

  const leaveVoiceRoom = () => {
    setVoiceRoom(null);
    setIsVoiceChatActive(false);
    setShowVoiceUI(false);
    handleLeaveCall();
  };

  // TODO: Move all effects and handlers from VoiceChat.jsx here
  // TODO: Expose all state and handlers in context value

  return (
    <VoiceChatContext.Provider
      value={{
        // old context
        voiceRoom,
        isVoiceChatActive,
        joinVoiceRoom,
        leaveVoiceRoom,
        showVoiceUI,
        setShowVoiceUI,
        // new voice logic state
        isJoined,
        isMuted,
        isAudioEnabled,
        useEarpiece,
        isScreenSharing,
        isVideoEnabled,
        peers,
        error,
        volumes,
        speakingStates,
        audioStates,
        screenProducer,
        screenStream,
        remoteScreens,
        videoProducer,
        videoStream,
        remoteVideos,
        isNoiseSuppressed,
        noiseSuppressionMode,
        noiseSuppressMenuAnchor,
        fullscreenShare,
        isMobile,
        // refs (if needed)
        noiseSuppressionRef,
        isAudioEnabledRef,
        individualMutedPeersRef,
        socketRef,
        deviceRef,
        producerTransportRef,
        consumerTransportsRef,
        producersRef,
        consumersRef,
        localStreamRef,
        audioRef,
        audioContextRef,
        gainNodesRef,
        analyserNodesRef,
        animationFramesRef,
        // TODO: handlers (onMute, onVideo, onAudio, etc.)
        handleJoin,
        handleLeaveCall,
        handleMute,
        toggleAudio,
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = () => React.useContext(VoiceChatContext); 