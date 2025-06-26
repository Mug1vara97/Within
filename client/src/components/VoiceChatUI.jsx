import React from 'react';
import { Box, IconButton, Button, AppBar, Toolbar, Typography, Menu, MenuItem } from '@mui/material';
import {
  Mic, MicOff, Hearing, VolumeUpRounded,
  ScreenShare, StopScreenShare, PhoneDisabled,
  HeadsetOff, Headset, VideocamOff, Videocam,
  NoiseAware, NoiseControlOff, ExpandMore, Tag
} from '@mui/icons-material';
import { VideoView, VideoOverlay } from '../VoiceChat';

const styles = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#36393f',
    color: '#dcddde',
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
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
    }
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: 'calc(100% - 52px)',
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
    position: 'relative',
    aspectRatio: '16/9',
    backgroundColor: '#202225',
    borderRadius: '8px',
    overflow: 'hidden',
    '&.speaking': {
      boxShadow: '0 0 0 2px #3ba55c'
    }
  },
  userAvatar: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#7289da',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    color: '#ffffff',
    fontWeight: 600
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#292b2f',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #202225'
  },
  controlsContainer: {
    display: 'flex',
    gap: '16px'
  },
  controlGroup: {
    display: 'flex',
    gap: '8px'
  },
  iconButton: {
    color: '#b9bbbe',
    '&:hover': {
      color: '#dcddde',
      backgroundColor: 'rgba(79, 84, 92, 0.32)'
    },
    '&.active': {
      color: '#ffffff',
      backgroundColor: '#3ba55c'
    }
  },
  leaveButton: {
    backgroundColor: '#ed4245',
    '&:hover': {
      backgroundColor: '#a12d2f'
    }
  }
};

const VoiceChatUI = ({
  roomId,
  error,
  isMuted,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  useEarpiece,
  isNoiseSuppressed,
  noiseSuppressionMode,
  noiseSuppressMenuAnchor,
  handleMute,
  toggleAudio,
  startVideo,
  stopVideo,
  startScreenSharing,
  stopScreenSharing,
  toggleSpeakerMode,
  handleLeaveCall,
  handleNoiseSuppressionToggle,
  handleNoiseSuppressionMenuOpen,
  handleNoiseSuppressionMenuClose,
  handleNoiseSuppressionModeSelect,
  peers,
  userName,
  speakingStates,
  volumes,
  audioStates,
  handleVolumeChange,
  isMobile,
  videoStream,
  remoteVideos,
  remoteScreens,
  fullscreenShare,
  handleFullscreenToggle,
  socketId,
  noiseSuppressionRef,
  individualMutedPeersRef,
  renderScreenShares
}) => {
  return (
    <Box sx={styles.root}>
      <AppBar position="static" sx={styles.appBar}>
        <Toolbar sx={styles.toolbar}>
          <Box sx={styles.channelName}>
            <Tag />
            <Typography variant="subtitle1">
              {roomId}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      {error && (
        <Typography color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      )}
      <Box sx={styles.container}>
        <Box sx={styles.videoGrid}>
          {/* Only render video grid when not in fullscreen mode */}
          {fullscreenShare === null && (
            <>
              {/* Local user */}
              <Box sx={styles.videoItem} className={speakingStates.get(socketId) ? 'speaking' : ''}>
                {isVideoEnabled && videoStream ? (
                  <VideoView 
                    stream={videoStream} 
                    peerName={userName}
                    isMuted={isMuted}
                    isSpeaking={speakingStates.get(socketId)}
                    isAudioEnabled={isAudioEnabled}
                    isLocal={true}
                    isAudioMuted={isMuted}
                  />
                ) : (
                  <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Box sx={styles.userAvatar}>
                      {userName[0].toUpperCase()}
                    </Box>
                    <VideoOverlay
                      peerName={userName}
                      isMuted={isMuted}
                      isSpeaking={speakingStates.get(socketId)}
                      isAudioEnabled={isAudioEnabled}
                      isLocal={true}
                      isAudioMuted={isMuted}
                    />
                  </div>
                )}
              </Box>

              {/* Remote users */}
              {Array.from(peers.values()).map((peer) => (
                <Box key={peer.id} sx={styles.videoItem} className={speakingStates.get(peer.id) ? 'speaking' : ''}>
                  {remoteVideos.get(peer.id)?.stream ? (
                    <VideoView
                      stream={remoteVideos.get(peer.id).stream}
                      peerName={peer.name}
                      isMuted={peer.isMuted}
                      isSpeaking={speakingStates.get(peer.id)}
                      isAudioEnabled={audioStates.get(peer.id)}
                      isLocal={false}
                      onVolumeClick={() => handleVolumeChange(peer.id)}
                      volume={volumes.get(peer.id) || 100}
                      isAudioMuted={individualMutedPeersRef.current.get(peer.id) || false}
                    />
                  ) : (
                    <div style={{ 
                      position: 'relative', 
                      width: '100%', 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Box sx={styles.userAvatar}>
                        {peer.name[0].toUpperCase()}
                      </Box>
                      <VideoOverlay
                        peerName={peer.name}
                        isMuted={peer.isMuted}
                        isSpeaking={speakingStates.get(peer.id)}
                        isAudioEnabled={audioStates.get(peer.id)}
                        isLocal={false}
                        onVolumeClick={() => handleVolumeChange(peer.id)}
                        volume={volumes.get(peer.id) || 100}
                        isAudioMuted={individualMutedPeersRef.current.get(peer.id) || false}
                      />
                    </div>
                  )}
                </Box>
              ))}
            </>
          )}

          {/* Screen sharing */}
          {renderScreenShares}
        </Box>
        <Box sx={styles.bottomBar}>
          <Box sx={styles.controlsContainer}>
            <Box sx={styles.controlGroup}>
              <IconButton
                sx={styles.iconButton}
                onClick={handleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
              <IconButton
                sx={styles.iconButton}
                onClick={isVideoEnabled ? stopVideo : startVideo}
                title={isVideoEnabled ? "Stop camera" : "Start camera"}
              >
                {isVideoEnabled ? <VideocamOff /> : <Videocam />}
              </IconButton>
              <IconButton
                sx={styles.iconButton}
                onClick={toggleAudio}
                title={isAudioEnabled ? "Disable audio output" : "Enable audio output"}
              >
                {isAudioEnabled ? <Headset /> : <HeadsetOff />}
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  sx={styles.iconButton}
                  onClick={handleNoiseSuppressionToggle}
                  title={isNoiseSuppressed ? "Disable noise suppression" : "Enable noise suppression"}
                  disabled={!noiseSuppressionRef.current?.isInitialized()}
                >
                  {isNoiseSuppressed ? <NoiseAware /> : <NoiseControlOff />}
                </IconButton>
                <IconButton
                  size="small"
                  sx={styles.iconButton}
                  onClick={handleNoiseSuppressionMenuOpen}
                  disabled={!noiseSuppressionRef.current?.isInitialized()}
                >
                  <ExpandMore />
                </IconButton>
                <Menu
                  anchorEl={noiseSuppressMenuAnchor}
                  open={Boolean(noiseSuppressMenuAnchor)}
                  onClose={handleNoiseSuppressionMenuClose}
                >
                  <MenuItem 
                    onClick={() => handleNoiseSuppressionModeSelect('rnnoise')}
                    selected={noiseSuppressionMode === 'rnnoise'}
                  >
                    RNNoise (AI-based)
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleNoiseSuppressionModeSelect('speex')}
                    selected={noiseSuppressionMode === 'speex'}
                  >
                    Speex (Classic)
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleNoiseSuppressionModeSelect('noisegate')}
                    selected={noiseSuppressionMode === 'noisegate'}
                  >
                    Noise Gate
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
            <Box sx={styles.controlGroup}>
              <IconButton
                sx={styles.iconButton}
                onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
              {isMobile && (
                <IconButton
                  sx={styles.iconButton}
                  onClick={toggleSpeakerMode}
                  title={useEarpiece ? "Switch to speaker" : "Switch to earpiece"}
                >
                  {useEarpiece ? <Hearing /> : <VolumeUpRounded />}
                </IconButton>
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            sx={styles.leaveButton}
            onClick={handleLeaveCall}
            startIcon={<PhoneDisabled />}
          >
            Leave
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default VoiceChatUI; 