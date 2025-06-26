import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Box,
  IconButton,
  Button,
  Slider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  PhoneDisabled,
  ScreenShare,
  StopScreenShare,
  Videocam,
  VideocamOff,
  VolumeUpRounded,
  Hearing,
  NoiseAware,
  NoiseControlOff,
  HeadsetOff,
  Headset,
} from '@mui/icons-material';
import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import { NoiseSuppressionManager } from './utils/noiseSuppression';
import voiceDetectorWorklet from './utils/voiceDetector.worklet.js?url';
import VoiceChatUI from './components/VoiceChatUI';

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
    height: '100vh', // Занимает всю высоту viewport
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#36393f',
    color: '#dcddde',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
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
    height: '52px'
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
    height: '100%',
    '& .MuiSvgIcon-root': {
      color: '#72767d',
      fontSize: '20px'
    },
    '& .MuiTypography-root': {
      fontSize: '16px',
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
    height: 'calc(100vh - 52px)', // Высота минус header
    width: '100%',
    margin: 0,
    position: 'relative',
    boxSizing: 'border-box'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    padding: '20px',
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
const MuteContext = React.createContext();

// MuteProvider component
const MuteProvider = ({ children, socket }) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('mute_state_changed', ({ userId, isMuted: newState }) => {
      setIsMuted(newState);
    });

    return () => {
      socket.off('mute_state_changed');
    };
  }, [socket]);

  return (
    <MuteContext.Provider value={{ isMuted, setIsMuted }}>
      {children}
    </MuteContext.Provider>
  );
};

function VoiceChat({ 
  roomId, 
  userName, 
  userId, 
  serverId, 
  autoJoin = true,
  onLeave,
  onManualLeave,
  showUI = false
}) {
  const socketRef = useRef();
  const deviceRef = useRef();
  const producerRef = useRef();
  const consumerRefs = useRef(new Map());
  const streamRef = useRef();
  const audioContextRef = useRef();
  const noiseSuppressionRef = useRef();
  const voiceDetectorRef = useRef();
  const [error, setError] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isUsingEarpiece, setIsUsingEarpiece] = useState(false);
  const { isMuted, setIsMuted } = useContext(MuteContext);

  // ... rest of the component implementation ...

  // Если showUI false, рендерим только невидимый контейнер для аудио
  if (!showUI) {
    return <div style={{ display: 'none' }} />;
  }

  // Рендерим UI напрямую, без портала
  return (
    <MuteProvider socket={socketRef.current}>
      <VoiceChatUI
        roomId={roomId}
        error={error}
        isMuted={isMuted}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        peers={peers}
        isSpeaking={isSpeaking}
        volume={volume}
        isUsingEarpiece={isUsingEarpiece}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
        onToggleScreenShare={toggleScreenShare}
        onVolumeChange={(newVolume) => setVolume(newVolume)}
        onToggleEarpiece={toggleEarpiece}
        onLeave={handleLeave}
      />
    </MuteProvider>
  );
}

export default VoiceChat;