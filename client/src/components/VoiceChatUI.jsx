import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Button, Menu, MenuItem } from '@mui/material';
import {
  Mic, MicOff, Videocam, VideocamOff, Headset, HeadsetOff, NoiseAware, NoiseControlOff, ExpandMore, PhoneDisabled, ScreenShare, StopScreenShare, VolumeUpRounded, Hearing
} from '@mui/icons-material';
import { VideoOverlay, VideoView } from '../VoiceChat';

// VideoView and VideoOverlay should be passed as children or as props if needed

const VoiceChatUI = ({
  styles,
  roomId,
  error,
  isVideoEnabled,
  videoStream,
  userName,
  isMuted,
  isSpeaking,
  isAudioEnabled,
  onMute,
  onVideo,
  onAudio,
  onNoiseSuppression,
  onNoiseSuppressionMenuOpen,
  onNoiseSuppressionMenuClose,
  onNoiseSuppressionModeSelect,
  isNoiseSuppressed,
  noiseSuppressionMode,
  noiseSuppressMenuAnchor,
  isScreenSharing,
  onScreenShare,
  onStopScreenShare,
  isMobile,
  useEarpiece,
  onToggleSpeakerMode,
  onLeave,
  peers,
  remoteVideos,
  speakingStates,
  audioStates,
  volumes,
  individualMutedPeers,
  renderScreenShares,
  fullscreenShare,
  handleVolumeChange
}) => {
  return (
    <Box sx={styles.root}>
      <AppBar position="static" sx={styles.appBar}>
        <Toolbar sx={styles.toolbar}>
          <Box sx={styles.channelName}>
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
          {fullscreenShare === null && (
            <>
              {/* Local user */}
              <Box sx={styles.videoItem} className={isSpeaking ? 'speaking' : ''}>
                {isVideoEnabled && videoStream ? (
                  <VideoView
                    stream={videoStream}
                    peerName={userName}
                    isMuted={isMuted}
                    isSpeaking={isSpeaking}
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
                      isSpeaking={isSpeaking}
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
                      isAudioMuted={individualMutedPeers.get(peer.id) || false}
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
                        isAudioMuted={individualMutedPeers.get(peer.id) || false}
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
              <IconButton sx={styles.iconButton} onClick={onMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
              <IconButton sx={styles.iconButton} onClick={onVideo} title={isVideoEnabled ? 'Stop camera' : 'Start camera'}>
                {isVideoEnabled ? <VideocamOff /> : <Videocam />}
              </IconButton>
              <IconButton sx={styles.iconButton} onClick={onAudio} title={isAudioEnabled ? 'Disable audio output' : 'Enable audio output'}>
                {isAudioEnabled ? <Headset /> : <HeadsetOff />}
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton sx={styles.iconButton} onClick={onNoiseSuppression} title={isNoiseSuppressed ? 'Disable noise suppression' : 'Enable noise suppression'}>
                  {isNoiseSuppressed ? <NoiseAware /> : <NoiseControlOff />}
                </IconButton>
                <IconButton size="small" sx={styles.iconButton} onClick={onNoiseSuppressionMenuOpen}>
                  <ExpandMore />
                </IconButton>
                <Menu anchorEl={noiseSuppressMenuAnchor} open={Boolean(noiseSuppressMenuAnchor)} onClose={onNoiseSuppressionMenuClose}>
                  <MenuItem onClick={() => onNoiseSuppressionModeSelect('rnnoise')} selected={noiseSuppressionMode === 'rnnoise'}>
                    RNNoise (AI-based)
                  </MenuItem>
                  <MenuItem onClick={() => onNoiseSuppressionModeSelect('speex')} selected={noiseSuppressionMode === 'speex'}>
                    Speex (Classic)
                  </MenuItem>
                  <MenuItem onClick={() => onNoiseSuppressionModeSelect('noisegate')} selected={noiseSuppressionMode === 'noisegate'}>
                    Noise Gate
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
            <Box sx={styles.controlGroup}>
              <IconButton sx={styles.iconButton} onClick={isScreenSharing ? onStopScreenShare : onScreenShare} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
              {isMobile && (
                <IconButton sx={styles.iconButton} onClick={onToggleSpeakerMode} title={useEarpiece ? 'Switch to speaker' : 'Switch to earpiece'}>
                  {useEarpiece ? <Hearing /> : <VolumeUpRounded />}
                </IconButton>
              )}
            </Box>
          </Box>
          <Button variant="contained" sx={styles.leaveButton} onClick={onLeave} startIcon={<PhoneDisabled />}>
            Leave
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default VoiceChatUI; 