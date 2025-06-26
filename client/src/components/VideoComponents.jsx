import React, { useEffect, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import { VolumeUp, VolumeOff, Fullscreen, FullscreenExit } from '@mui/icons-material';

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
    objectFit: 'contain'
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
  isAudioMuted,
  isFullscreen,
  onFullscreenToggle
}) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (isFullscreen) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div style={styles.fullscreenVideoContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal || isAudioMuted}
            style={styles.fullscreenVideo}
          />
          <div style={styles.fullscreenControls}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {peerName}
              {isMuted && <span style={{ color: '#ed4245' }}>(Микрофон выключен)</span>}
              {!isAudioEnabled && <span style={{ color: '#ed4245' }}>(Звук выключен)</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isLocal && onVolumeClick && (
                <IconButton
                  onClick={onVolumeClick}
                  sx={styles.volumeIcon}
                  className={isAudioMuted ? 'muted' : (isSpeaking ? 'speaking' : 'silent')}
                >
                  {isAudioMuted ? <VolumeOff /> : <VolumeUp />}
                </IconButton>
              )}
              <IconButton
                onClick={onFullscreenToggle}
                sx={styles.fullscreenButton}
              >
                <FullscreenExit />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        onFullscreenToggle={onFullscreenToggle}
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
  isAudioMuted,
  onFullscreenToggle
}) => {
  return (
    <div style={styles.overlay}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {peerName}
        {isMuted && <span style={{ color: '#ed4245' }}>(Микрофон выключен)</span>}
        {!isAudioEnabled && <span style={{ color: '#ed4245' }}>(Звук выключен)</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {!isLocal && onVolumeClick && (
          <IconButton
            onClick={onVolumeClick}
            sx={styles.volumeIcon}
            className={isAudioMuted ? 'muted' : (isSpeaking ? 'speaking' : 'silent')}
          >
            {isAudioMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        )}
        <IconButton
          onClick={onFullscreenToggle}
          sx={styles.fullscreenButton}
        >
          <Fullscreen />
        </IconButton>
      </div>
    </div>
  );
}; 