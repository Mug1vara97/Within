import React, { useState, useEffect, useRef, useContext } from 'react';
import { Box } from '@mui/material';
import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import { NoiseSuppressionManager } from './utils/noiseSuppression';
import voiceDetectorWorklet from './utils/voiceDetector.worklet.js?url';
import VoiceChatUI from './components/VoiceChatUI';
import { MuteContext, MuteProvider } from './contexts/MuteContext';

const config = {
  server: {
    url: 'https://4931257-dv98943.twc1.net'
  },
  iceServers: [
    {
      urls: ['stun:185.119.59.23:3478']
    },
    {
      urls: ['turn:185.119.59.23:3478?transport=udp'],
      username: 'test',
      credential: 'test123'
    },
    {
      urls: ['turn:185.119.59.23:3478?transport=tcp'],
      username: 'test',
      credential: 'test123'
    }
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

function VoiceChat({ 
  roomId, 
  userName, 
  userId, 
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
  const { isMuted, setIsMuted, socketRef: muteSocketRef } = useContext(MuteContext);

  // Инициализация WebSocket соединения
  useEffect(() => {
    if (!roomId || !userName || !userId) return;

    socketRef.current = io(config.server.url, {
      query: { roomId, userName, userId }
    });
    muteSocketRef.current = socketRef.current;

    socketRef.current.on('connect', () => {
      console.log('Connected to signaling server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      cleanup();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userName, userId]);

  // Инициализация аудио контекста и обработчиков
  useEffect(() => {
    if (!autoJoin) return;

    const initAudio = async () => {
      try {
        // Создаем аудио контекст
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Регистрируем воркер для определения голоса
        await audioContextRef.current.audioWorklet.addModule(voiceDetectorWorklet);
        
        // Инициализируем подавление шума
        noiseSuppressionRef.current = new NoiseSuppressionManager(audioContextRef.current);
        
        // Получаем поток с микрофона
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: config.audio,
          video: false
        });
        
        streamRef.current = stream;
        
        // Инициализируем определение голоса
        initVoiceDetection(stream);
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError('Failed to initialize audio');
      }
    };

    initAudio();

    return () => {
      cleanup();
    };
  }, [autoJoin]);

  const initVoiceDetection = async (stream) => {
    const audioSource = audioContextRef.current.createMediaStreamSource(stream);
    voiceDetectorRef.current = new AudioWorkletNode(audioContextRef.current, 'voice-detector');
    
    voiceDetectorRef.current.port.onmessage = (event) => {
      setIsSpeaking(event.data.speaking);
    };

    audioSource.connect(voiceDetectorRef.current).connect(audioContextRef.current.destination);
  };

  const cleanup = () => {
    if (producerRef.current) {
      producerRef.current.close();
      producerRef.current = null;
    }

    consumerRefs.current.forEach(consumer => {
      consumer.close();
    });
    consumerRefs.current.clear();

    if (deviceRef.current) {
      deviceRef.current.close();
      deviceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (noiseSuppressionRef.current) {
      noiseSuppressionRef.current.dispose();
      noiseSuppressionRef.current = null;
    }

    voiceDetectorRef.current = null;
    setPeers(new Map());
    setError(null);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  const toggleEarpiece = () => {
    if (streamRef.current) {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio.setSinkId) {
          audio.setSinkId(!isUsingEarpiece ? '' : 'default')
            .then(() => {
              console.log('Audio output set to:', !isUsingEarpiece ? 'earpiece' : 'speaker');
            })
            .catch(err => {
              console.error('Error setting audio output:', err);
            });
        }
      });
      setIsUsingEarpiece(!isUsingEarpiece);
    }
  };

  const handleLeave = () => {
    cleanup();
    if (onManualLeave) {
      onManualLeave();
    }
    if (onLeave) {
      onLeave();
    }
  };

  // Если showUI false, рендерим только невидимый контейнер для аудио
  if (!showUI) {
    return <div style={{ display: 'none' }} />;
  }

  // Рендерим UI напрямую, без портала
  return (
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
  );
}

// Оборачиваем компонент в MuteProvider
const VoiceChatWithProvider = (props) => (
  <MuteProvider>
    <VoiceChat {...props} />
  </MuteProvider>
);

export default VoiceChatWithProvider;