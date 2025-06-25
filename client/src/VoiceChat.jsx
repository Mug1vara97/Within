import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  ListItemIcon,
  Divider,
  Slider,
  Switch,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Person,
  Tag,
  PhoneDisabled,
  ScreenShare,
  StopScreenShare,
  VolumeOffRounded,
  Videocam,
  VideocamOff,
  VolumeUpRounded,
  Hearing,
  NoiseAware,
  NoiseControlOff,
  ExpandMore,
  HeadsetOff,
  Headset,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material';
import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import { NoiseSuppressionManager } from './utils/noiseSuppression';
import voiceDetectorWorklet from './utils/voiceDetector.worklet.js?url';
import { useAudio } from './contexts/AudioContext';


const config = {
  server: {
    url: 'https://4931257-dv98943.twc1.net'
  },
  iceServers: [
    {
      urls: ['stun:185.119.59.23:3478']
    },
    // {
    //   urls: ['stun:stun.l.google.com:19302']
    // },
    {
      urls: ['turn:185.119.59.23:3478?transport=udp'],
      username: 'test',
      credential: 'test123'
    },
    {
      urls: ['turn:185.119.59.23:3478?transport=tcp'],
      username: 'test',
      credential: 'test123'
    },
    // {
    //   urls: ['stun:stun1.l.google.com:19302']
    // },
    // {
    //   urls: ['stun:stun2.l.google.com:19302']
    // }
  ],
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
    volume: 1.0,
    latency: 0,
    suppressLocalAudioPlayback: true,
    advanced: [
      {
        echoCancellationType: 'system',
        noiseSuppression: { level: 'high' },
        autoGainControl: { level: 'high' },
        googEchoCancellation: true,
        googEchoCancellation2: true,
        googAutoGainControl: true,
        googAutoGainControl2: true,
        googNoiseSuppression: true,
        googNoiseSuppression2: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googAudioMirroring: false,
        googDucking: true,
        googNoiseReduction: true,
        googExperimentalAutoGainControl: true,
        googExperimentalNoiseSuppression: true,
        googBeamforming: true,
        googArrayGeometry: true,
        googAudioNetworkAdaptator: true,
        googDAEchoCancellation: true,
        googExperimentalEchoCancellation: true
      }
    ]
  }
};

// Add Discord-like styles
const styles = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#36393f',
    color: '#dcddde',
    flex: 1,
    minHeight: '100%',
    overflow: 'hidden', // Add to prevent overflow
    '@keyframes pulse': {
      '0%': {
        boxShadow: '0 0 0 2px rgba(59, 165, 92, 0.8)'
      },
      '50%': {
        boxShadow: '0 0 0 4px rgba(59, 165, 92, 0.4)'
      },
      '100%': {
        boxShadow: '0 0 0 2px rgba(59, 165, 92, 0.8)'
      }
    }
  },
  appBar: {
    backgroundColor: '#36393f',
    boxShadow: 'none',
    borderBottom: '1px solid #202225',
    position: 'relative',
    width: '100%',
    flexShrink: 0,
    height: '52px' // Fixed header height
  },
  toolbar: {
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    '@media (max-width: 600px)': {
      padding: '0 8px',
    }
  },
  channelName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffffff',
    height: '100%', // Take full height
    '& .MuiSvgIcon-root': {
      color: '#72767d',
      fontSize: '20px' // Adjust icon size
    },
    '& .MuiTypography-root': {
      fontSize: '16px', // Adjust text size
      fontWeight: 500
    },
    '@media (max-width: 600px)': {
      fontSize: '0.9rem',
    }
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    width: '100%',
    maxWidth: '100%', // Ensure container doesn't exceed viewport
    margin: 0,
    position: 'relative',
    boxSizing: 'border-box' // Include padding in width calculation
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    padding: '20px 100px', // Increased side padding
    width: '100%',
    flex: 1,
    margin: 0,
    overflow: 'auto',
    minHeight: 0,
    marginBottom: '65px',
    boxSizing: 'border-box'
  },
  videoItem: {
    backgroundColor: '#2B2D31',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: '16/9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s ease-in-out',
    padding: '16px',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    },
    '&.speaking': {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: '2px solid #3ba55c',
        borderRadius: '8px',
        animation: 'pulse 2s infinite',
        pointerEvents: 'none',
        zIndex: 1
      }
    }
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(59, 165, 92, 0.4)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(59, 165, 92, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(59, 165, 92, 0)'
    }
  },
  userAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#404249',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 500,
    marginBottom: '12px',
    transition: 'transform 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)'
    }
  },
  userName: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(4px)',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    }
  },
  userStatus: {
    fontSize: '14px',
    color: '#949BA4',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  micIcon: {
    padding: '8px',
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.7)',
      transform: 'scale(1.1)'
    },
    '&:active': {
      transform: 'scale(0.95)'
    }
  },
  mutedMicIcon: {
    backgroundColor: 'rgba(237, 66, 69, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(237, 66, 69, 0.2)',
      transform: 'scale(1.1)'
    },
    '& .MuiSvgIcon-root': {
      color: '#ed4245'
    }
  },
  speakingMicIcon: {
    '& .MuiSvgIcon-root': {
      color: '#3ba55c'
    }
  },
  silentMicIcon: {
    '& .MuiSvgIcon-root': {
      color: '#B5BAC1'
    }
  },
  paper: {
    backgroundColor: '#2f3136',
    color: '#dcddde',
    boxShadow: 'none',
    border: '1px solid #202225'
  },
  listItem: {
    borderRadius: '4px',
    margin: '2px 0',
    '&:hover': {
      backgroundColor: '#32353b'
    },
    '@media (max-width: 600px)': {
      padding: '8px',
    }
  },
  username: {
    color: '#ffffff',
    fontSize: '1rem',
    '@media (max-width: 600px)': {
      fontSize: '0.9rem',
    }
  },
  controls: {
    display: 'flex',
    gap: '8px'
  },
  iconButton: {
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#40444b'
    }
  },
  joinPaper: {
    backgroundColor: '#2f3136',
    color: '#dcddde',
    padding: '24px',
    '@media (max-width: 600px)': {
      padding: '16px',
    }
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      color: '#dcddde',
      '& fieldset': {
        borderColor: '#40444b'
      },
      '&:hover fieldset': {
        borderColor: '#72767d'
      },
      '&.Mui-focused fieldset': {
        borderColor: '#5865f2'
      }
    },
    '& .MuiInputLabel-root': {
      color: '#72767d'
    }
  },
  joinButton: {
    backgroundColor: '#5865f2',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#4752c4'
    }
  },
  divider: {
    backgroundColor: '#40444b',
    margin: '8px 0'
  },
  bottomBar: {
    backgroundColor: '#2B2D31',
    padding: '12px 60px', // Increased side padding, reduced vertical padding
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    margin: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 2,
    height: '65px',
    boxSizing: 'border-box'
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  controlsContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  controlGroup: {
    backgroundColor: '#383A40',
    borderRadius: '8px',
    padding: '6px', // Reduced padding
    display: 'flex',
    alignItems: 'center',
    gap: '6px', // Reduced gap
    transition: 'background-color 0.2s ease',
    '& .MuiIconButton-root': {
      padding: '6px', // Reduced button padding
      '& .MuiSvgIcon-root': {
        fontSize: '20px' // Reduced icon size
      }
    }
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: '#383A40',
    '@media (max-width: 600px)': {
      padding: '4px',
      gap: '4px',
    }
  },
  leaveButton: {
    backgroundColor: '#f04747',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '6px 12px', // Reduced padding
    '&:hover': {
      backgroundColor: '#d84040'
    },
    minWidth: '100px', // Reduced min-width
    fontSize: '14px' // Reduced font size
  },
  volumeControl: {
    width: 100,
    marginLeft: 2,
    marginRight: 2,
    '@media (max-width: 600px)': {
      width: 60,
    }
  },
  screenShareContainer: {
    position: 'relative',
    width: '100%',
    height: '300px',
    backgroundColor: '#202225',
    marginBottom: '16px',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  screenVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000'
  },
  screenShareGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    padding: '16px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  volumeIcon: {
    padding: '8px',
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    zIndex: 10,
    '&.muted': {
      backgroundColor: 'rgba(237, 66, 69, 0.1) !important',
      animation: 'mutePulse 2s infinite !important',
      '&:hover': {
        backgroundColor: 'rgba(237, 66, 69, 0.2) !important',
        transform: 'scale(1.1)'
      },
      '& .MuiSvgIcon-root': {
        color: '#ed4245'
      }
    },
    '&.speaking': {
      backgroundColor: 'transparent',
      animation: 'none !important',
      '& .MuiSvgIcon-root': {
        color: '#3ba55c'
      }
    },
    '&.silent': {
      backgroundColor: 'transparent',
      animation: 'none !important',
      '& .MuiSvgIcon-root': {
        color: '#B5BAC1'
      }
    }
  },
  '@keyframes mutePulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(237, 66, 69, 0.4)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(237, 66, 69, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(237, 66, 69, 0)'
    }
  },
  // Обновим стили
  screenShareItem: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#202225',
    borderRadius: '8px',
    overflow: 'hidden',
    '& video': {
      objectFit: 'contain'
    }
  },
  screenShareUserName: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: 2
  },
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullscreenVideoContainer: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    overflow: 'hidden'
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000'
  },
  fullscreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10000
  },
  fullscreenButton: {
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      transform: 'scale(1.1)'
    },
    transition: 'all 0.2s ease'
  },
  fullscreenUserName: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10000
  },
  screenShareControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '8px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 5
  }
};

const setAudioOutput = async (audio, useEarpiece = true) => {
  try {
    // Проверяем поддержку выбора устройства вывода
    if (typeof audio.setSinkId !== 'undefined') {
      // На Android телефонный динамик имеет пустой sinkId
      await audio.setSinkId(useEarpiece ? '' : 'default');
      console.log('Audio output set to:', useEarpiece ? 'earpiece' : 'speaker');
    } else {
      console.log('setSinkId not supported');
    }
  } catch (error) {
    console.error('Error setting audio output:', error);
  }
};

// Создаем контекст для состояния мьюта
const MuteContext = React.createContext({
  muteStates: new Map(),
  setMuteState: () => {}
});

// Создаем провайдер для состояния мьюта
const MuteProvider = React.memo(({ children, socket }) => {
  const [muteStates, setMuteStates] = useState(new Map());
  
  const setMuteState = useCallback((peerId, isMuted) => {
    console.log('Setting mute state in context:', { peerId, isMuted });
    setMuteStates(prev => {
      const newStates = new Map(prev);
      newStates.set(peerId, Boolean(isMuted));
      return newStates;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlePeerMuteStateChanged = ({ peerId, isMuted }) => {
      console.log('MuteProvider: Peer mute state changed:', { peerId, isMuted });
      setMuteState(peerId, Boolean(isMuted));

      // Если пользователь замьючен, убираем состояние speaking
      if (isMuted) {
        socket.emit('speaking', { speaking: false });
      }
    };

    const handlePeerJoined = ({ peerId, isMuted }) => {
      console.log('MuteProvider: New peer joined:', { peerId, isMuted });
      setMuteState(peerId, Boolean(isMuted));
    };

    socket.on('peerMuteStateChanged', handlePeerMuteStateChanged);
    socket.on('peerJoined', handlePeerJoined);

    return () => {
      socket.off('peerMuteStateChanged', handlePeerMuteStateChanged);
      socket.off('peerJoined', handlePeerJoined);
    };
  }, [socket, setMuteState]);

  const value = useMemo(() => ({
    muteStates,
    setMuteState
  }), [muteStates, setMuteState]);

  return (
    <MuteContext.Provider value={value}>
      {children}
    </MuteContext.Provider>
  );
});

// Создаем хук для использования состояния мьюта
const useMuteState = (peerId) => {
  const context = useContext(MuteContext);
  if (!context) {
    throw new Error('useMuteState must be used within a MuteProvider');
  }
  return [context.muteStates.get(peerId) || false, (isMuted) => context.setMuteState(peerId, isMuted)];
};

// Компонент индикатора мьюта
const MuteIndicator = React.memo(({ peerId }) => {
  const [isMuted] = useMuteState(peerId);
  
  if (!isMuted) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: '4px',
      borderRadius: '50%',
      color: '#ffffff'
    }}>
      <VolumeOffRounded fontSize="small" />
    </div>
  );
});

// Оптимизированный компонент для видео (не перерисовывается при изменении состояния)
const VideoPlayer = React.memo(({ stream, style }) => {
  const videoRef = useRef();
  const [isHidden, setIsHidden] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const mountedRef = useRef(true);
  const cleanupTimeoutRef = useRef(null);
  const setupAttemptRef = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    setIsHidden(false);
    setIsRemoved(false);
    setVideoError(null);

    if (!stream) {
      console.log('No stream available, cleaning up video');
      cleanupVideo();
      return;
    }

    const setupVideo = async () => {
      if (setupAttemptRef.current) {
        console.log('Setup already in progress, skipping');
        return;
      }

      if (!mountedRef.current || !videoRef.current) {
        console.log('Component not mounted or video ref not available');
        return;
      }

      try {
        setupAttemptRef.current = true;
        console.log('Setting up video with new stream');
        
        if (videoRef.current.srcObject) {
          const oldTracks = videoRef.current.srcObject.getTracks();
          oldTracks.forEach(track => {
            track.stop();
          });
          videoRef.current.srcObject = null;
          videoRef.current.load();
        }

        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          try {
            await playPromise;
            console.log('Video playback started successfully');
          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('Playback aborted, stream might have been removed');
              cleanupVideo();
              return;
            }
            throw error;
          }
        }
      } catch (error) {
        console.error('Error setting up video:', error);
        setVideoError(error.message);
        cleanupVideo();
      } finally {
        setupAttemptRef.current = false;
      }
    };

    setupVideo();

    return () => {
      console.log('Cleaning up video component');
      mountedRef.current = false;
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupVideo();
    };
  }, [stream]);

  const cleanupVideo = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        
        if (videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => {
            track.enabled = false;
            track.stop();
          });
          videoRef.current.srcObject = null;
        }
        
        videoRef.current.load();
        setIsHidden(true);

        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }
        
        cleanupTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setIsRemoved(true);
          }
        }, 100);

        setupAttemptRef.current = false;
      } catch (error) {
        console.error('Error cleaning up video:', error);
        setIsHidden(true);
        setIsRemoved(true);
        setupAttemptRef.current = false;
      }
    }
  }, []);

  if (isRemoved) {
    return null;
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: '#202225',
      borderRadius: '8px',
      overflow: 'hidden',
      opacity: isHidden ? 0 : 1,
      transition: 'opacity 0.2s ease-out'
    }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          ...(style || {})
        }}
        autoPlay
        playsInline
      />
      {videoError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: '8px 16px',
          borderRadius: '4px',
          color: '#ffffff',
          zIndex: 3
        }}>
          {videoError}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.stream === nextProps.stream && prevProps.style === nextProps.style);

// Компонент оверлея (перерисовывается отдельно от видео)
const VideoOverlay = React.memo(({ 
  peerName, 
  isMuted, 
  isSpeaking,
  isAudioEnabled,
  isLocal,
  onVolumeClick,
  volume,
  isAudioMuted,
  children
}) => {
  const [isVolumeOff, setIsVolumeOff] = useState(isAudioMuted || volume === 0);

  useEffect(() => {
    setIsVolumeOff(isAudioMuted || volume === 0);
  }, [volume, isAudioMuted]);

  const handleVolumeIconClick = (e) => {
    e.stopPropagation();
    setIsVolumeOff(prev => !prev);
    if (onVolumeClick) {
      onVolumeClick();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '12px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)'
    }}>
      {/* Основной блок с информацией */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 500,
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: 'fit-content',
        mb: 1
      }}>
        {isMuted ? (
          <MicOff sx={{ fontSize: 16, color: '#ed4245' }} />
        ) : isSpeaking ? (
          <Mic sx={{ fontSize: 16, color: '#3ba55c' }} />
        ) : (
          <Mic sx={{ fontSize: 16, color: '#B5BAC1' }} />
        )}
        {!isAudioEnabled && (
          <HeadsetOff sx={{ fontSize: 16, color: '#ed4245' }} />
        )}
        {peerName}
      </Box>
      
      {!isLocal && (
        <IconButton
          onClick={handleVolumeIconClick}
          className={`volumeControl ${
            isVolumeOff
              ? 'muted'
              : isSpeaking
              ? 'speaking'
              : 'silent'
          }`}
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
              transform: 'scale(1.1)'
            },
            '&.muted': {
              backgroundColor: 'rgba(237, 66, 69, 0.1) !important',
              animation: 'mutePulse 2s infinite !important',
              '&:hover': {
                backgroundColor: 'rgba(237, 66, 69, 0.2) !important',
                transform: 'scale(1.1)'
              }
            },
            '&.speaking': {
              backgroundColor: 'transparent',
              '& .MuiSvgIcon-root': {
                color: '#3ba55c'
              }
            },
            '&.silent': {
              backgroundColor: 'transparent',
              '& .MuiSvgIcon-root': {
                color: '#B5BAC1'
              }
            }
          }}
        >
          {isVolumeOff ? (
            <VolumeOff sx={{ fontSize: 20, color: '#ed4245' }} />
          ) : (
            <VolumeUp sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      )}
      
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.peerName === nextProps.peerName &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    prevProps.volume === nextProps.volume &&
    prevProps.isAudioMuted === nextProps.isAudioMuted &&
    prevProps.children === nextProps.children
  );
});

// Оптимизированный компонент для отображения видео
const VideoView = React.memo(({ 
  stream, 
  peerName, 
  isMuted, 
  isSpeaking,
  isAudioEnabled,
  isLocal,
  onVolumeClick,
  volume,
  isAudioMuted,
  children 
}) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <VideoPlayer stream={stream} />
      <VideoOverlay
        peerName={peerName}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        isAudioEnabled={isAudioEnabled}
        isLocal={isLocal}
        onVolumeClick={onVolumeClick}
        volume={volume}
        isAudioMuted={isAudioMuted}
      >
        {children}
      </VideoOverlay>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.stream === nextProps.stream &&
    prevProps.peerName === nextProps.peerName &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    prevProps.volume === nextProps.volume &&
    prevProps.isAudioMuted === nextProps.isAudioMuted &&
    prevProps.children === nextProps.children
  );
});

function VoiceChat({ roomId, userName, userId, serverId, autoJoin = true, onLeave }) {
  const { activeVoiceChat, voiceChatSocketRef, joinVoiceChat, leaveVoiceChat } = useAudio();
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [useEarpiece, setUseEarpiece] = useState(true);
  const [error, setError] = useState('');
  const [peers, setPeers] = useState(new Map());
  const [volumes, setVolumes] = useState(new Map());
  const [speakingStates, setSpeakingStates] = useState(new Map());
  const [audioStates, setAudioStates] = useState(new Map());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [screenProducer, setScreenProducer] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreens, setRemoteScreens] = useState(new Map());
  const [videoProducer, setVideoProducer] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const [remoteVideos, setRemoteVideos] = useState(new Map());
  const [isNoiseSuppressed, setIsNoiseSuppressed] = useState(false);
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('rnnoise');
  const [noiseSuppressMenuAnchor, setNoiseSuppressMenuAnchor] = useState(null);

  // Используем локальный socketRef для обратной совместимости
  const socketRef = useRef(voiceChatSocketRef.current);

  useEffect(() => {
    // Обновляем локальный socketRef при изменении глобального
    socketRef.current = voiceChatSocketRef.current;
  }, [voiceChatSocketRef.current]);

  useEffect(() => {
    // Если уже подключены к этой комнате, просто обновляем UI
    if (activeVoiceChat === roomId && voiceChatSocketRef.current?.connected) {
      console.log('Already connected to this voice chat room');
      setIsJoined(true);
      setIsConnected(true);
      return;
    }

    // Если autoJoin включен, подключаемся автоматически
    if (autoJoin) {
      handleJoin();
    }
  }, [roomId, autoJoin, activeVoiceChat]);

  const handleJoin = async () => {
    if (!roomId || !userName) {
      setError('Please enter room ID and username');
      return;
    }

    try {
      // Reset states to enabled when joining
      setIsAudioEnabled(true);
      isAudioEnabledRef.current = true;
      setUseEarpiece(true);
      setIsMuted(false);

      // Если уже подключены к другой комнате, отключаемся
      if (voiceChatSocketRef.current && activeVoiceChat !== roomId) {
        voiceChatSocketRef.current.disconnect();
        voiceChatSocketRef.current = null;
        socketRef.current = null;
      }

      // Создаем новое подключение только если нет активного
      if (!voiceChatSocketRef.current) {
        const socket = io(config.server.url, {
          transports: ['websocket'],
          upgrade: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          secure: true,
          rejectUnauthorized: false
        });

        voiceChatSocketRef.current = socket;
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Socket connected successfully');
          setIsConnected(true);
          setIsJoined(true);
          joinVoiceChat(roomId);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setError('Failed to connect to server: ' + error.message);
          leaveVoiceChat();
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
          setIsJoined(false);
          setPeers(new Map());
          leaveVoiceChat();
        });
      }

      // ... остальной код handleJoin ...
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room: ' + error.message);
      leaveVoiceChat();
    }
  };

  const handleLeaveCall = () => {
    cleanup();
    leaveVoiceChat();
    if (onLeave) {
      onLeave();
    }
  };

  // ... остальной код компонента ...
}

export default VoiceChat;