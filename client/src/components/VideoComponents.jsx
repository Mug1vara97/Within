import React, { useEffect, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';

const styles = {
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#202225',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#ffffff'
  },
  volumeIcon: {
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    zIndex: 10,
    '&.muted': {
      backgroundColor: 'rgba(237, 66, 69, 0.1)',
      animation: 'mutePulse 2s infinite',
      '&:hover': {
        backgroundColor: 'rgba(237, 66, 69, 0.2)',
        transform: 'scale(1.1)'
      },
      '& .MuiSvgIcon-root': {
        color: '#ed4245'
      }
    },
    '&.speaking': {
      backgroundColor: 'transparent',
      animation: 'none',
      '& .MuiSvgIcon-root': {
        color: '#3ba55c'
      }
    },
    '&.silent': {
      backgroundColor: 'transparent',
      animation: 'none',
      '& .MuiSvgIcon-root': {
        color: '#B5BAC1'
      }
    }
  }
};

export const VideoView = ({ 
  stream, 
  peerName, 
  isMuted, 
  isSpeaking, 
  isAudioEnabled, 
  isLocal, 
  onVolumeClick, 
  isAudioMuted 
}) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={styles.videoContainer}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isAudioMuted}
        style={styles.video}
      />
      <VideoOverlay
        peerName={peerName}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        isAudioEnabled={isAudioEnabled}
        isLocal={isLocal}
        onVolumeClick={onVolumeClick}
        isAudioMuted={isAudioMuted}
      />
    </div>
  );
};

export const VideoOverlay = ({ 
  peerName, 
  isMuted, 
  isSpeaking, 
  isAudioEnabled, 
  isLocal, 
  onVolumeClick, 
  isAudioMuted 
}) => {
  return (
    <div style={styles.overlay}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {peerName}
        {isMuted && <span style={{ color: '#ed4245' }}>(Микрофон выключен)</span>}
        {!isAudioEnabled && <span style={{ color: '#ed4245' }}>(Звук выключен)</span>}
      </div>
      {!isLocal && onVolumeClick && (
        <IconButton
          onClick={onVolumeClick}
          sx={styles.volumeIcon}
          className={isAudioMuted ? 'muted' : (isSpeaking ? 'speaking' : 'silent')}
        >
          {isAudioMuted ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
      )}
    </div>
  );
}; 