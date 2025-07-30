import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ScreenShare, Fullscreen, FullscreenExit } from '@mui/icons-material';

// Компонент для умной сетки видеозвонков
const VideoGrid = ({ 
  participants, 
  screenShares, 
  onFullscreenToggle, 
  fullscreenShare,
  colors,
  styles 
}) => {
  
  // Вычисляем оптимальную сетку на основе количества участников
  const gridConfig = useMemo(() => {
    const totalParticipants = participants.length;
    const hasScreenShare = screenShares.length > 0;
    
    // Если есть демонстрация экрана, она занимает верхнюю часть
    if (hasScreenShare) {
      return {
        screenShareArea: {
          gridArea: 'screen',
          height: '40%',
          minHeight: '300px'
        },
        participantsArea: {
          gridArea: 'participants',
          height: '60%'
        },
        gridTemplateAreas: '"screen screen" "participants participants"',
        gridTemplateRows: '40% 60%',
        gridTemplateColumns: '1fr 1fr'
      };
    }
    
    // Для разного количества участников - разные конфигурации
    switch (totalParticipants) {
      case 1:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr',
          gridTemplateColumns: '1fr',
          itemSize: '100%'
        };
      case 2:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr',
          gridTemplateColumns: '1fr 1fr',
          itemSize: '50%'
        };
      case 3:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '1fr 1fr',
          itemSize: '50%'
        };
      case 4:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '1fr 1fr',
          itemSize: '50%'
        };
      case 5:
      case 6:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateColumns: '1fr 1fr',
          itemSize: '33.33%'
        };
      case 7:
      case 8:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr 1fr 1fr 1fr',
          gridTemplateColumns: '1fr 1fr',
          itemSize: '25%'
        };
      case 9:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateColumns: '1fr 1fr 1fr',
          itemSize: '33.33%'
        };
      default:
        return {
          gridTemplateAreas: 'none',
          gridTemplateRows: 'auto',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          itemSize: 'auto'
        };
    }
  }, [participants.length, screenShares.length]);

  // Рендерим демонстрацию экрана
  const renderScreenShares = useMemo(() => {
    if (screenShares.length === 0) return null;

    return (
      <Box sx={{
        ...gridConfig.screenShareArea,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '8px',
        padding: '8px'
      }}>
                 {screenShares.map((screenShare) => (
          <Box key={screenShare.id} sx={styles.videoItem}>
            <Box sx={styles.screenShareItem}>
              <VideoPlayer stream={screenShare.stream} />
              <Box sx={styles.screenShareControls}>
                <IconButton
                  onClick={() => onFullscreenToggle(screenShare.id)}
                  sx={styles.fullscreenButton}
                >
                  <Fullscreen />
                </IconButton>
              </Box>
              <Box sx={styles.screenShareUserName}>
                <ScreenShare sx={{ fontSize: 16 }} />
                {screenShare.name}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }, [screenShares, gridConfig, styles, onFullscreenToggle]);

  // Рендерим участников
  const renderParticipants = useMemo(() => {
    return (
      <Box sx={{
        ...gridConfig.participantsArea,
        display: 'grid',
        gridTemplateAreas: gridConfig.gridTemplateAreas,
        gridTemplateRows: gridConfig.gridTemplateRows,
        gridTemplateColumns: gridConfig.gridTemplateColumns,
        gap: '8px',
        padding: '8px'
      }}>
        {participants.map((participant) => (
          <Box key={participant.id} sx={styles.videoItem}>
            <VideoView
              stream={participant.stream}
              peerName={participant.name}
              isMuted={participant.isMuted}
              isSpeaking={participant.isSpeaking}
              isAudioEnabled={participant.isAudioEnabled}
              isLocal={participant.isLocal}
              onVolumeClick={participant.onVolumeClick}
              volume={participant.volume}
              isAudioMuted={participant.isAudioMuted}
              showVolumeSlider={participant.showVolumeSlider}
              onVolumeSliderChange={participant.onVolumeSliderChange}
              onToggleVolumeSlider={participant.onToggleVolumeSlider}
              colors={colors}
            />
          </Box>
        ))}
      </Box>
    );
  }, [participants, gridConfig, styles, colors]);

  // Полноэкранный режим для демонстрации экрана
  const renderFullscreenScreenShare = useMemo(() => {
    if (!fullscreenShare) return null;

    const screenShare = screenShares.find(s => s.id === fullscreenShare);
    if (!screenShare) return null;

    return (
      <Box sx={styles.fullscreenOverlay}>
        <Box sx={styles.fullscreenVideoContainer}>
          <VideoPlayer stream={screenShare.stream} />
          <Box sx={styles.fullscreenControls}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ScreenShare sx={{ color: '#fff', fontSize: 24 }} />
              <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                {screenShare.name}
              </Typography>
            </Box>
            <IconButton
              onClick={() => onFullscreenToggle(fullscreenShare)}
              sx={styles.fullscreenButton}
            >
              <FullscreenExit sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  }, [fullscreenShare, screenShares, styles, onFullscreenToggle]);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateAreas: gridConfig.gridTemplateAreas,
      gridTemplateRows: gridConfig.gridTemplateRows,
      gridTemplateColumns: gridConfig.gridTemplateColumns,
      gap: '8px',
      padding: '8px',
      overflow: 'hidden'
    }}>
      {renderScreenShares}
      {renderParticipants}
      {renderFullscreenScreenShare}
    </Box>
  );
};

// Компонент для видео (оптимизированный)
const VideoPlayer = React.memo(({ stream, style }) => {
  const videoRef = useRef();
  
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(console.error);
  }, [stream]);

  return (
    <video
      ref={videoRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: '#000',
        ...style
      }}
      autoPlay
      playsInline
    />
  );
});

// Компонент для отображения видео с оверлеем
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
  showVolumeSlider,
  onVolumeSliderChange,
  onToggleVolumeSlider,
  colors
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
      {stream ? (
        <VideoPlayer stream={stream} />
      ) : (
        // Аватар пользователя, если нет видео
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#202225'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#5865f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '32px',
            fontWeight: 500,
            marginBottom: '12px'
          }}>
            {peerName[0].toUpperCase()}
          </div>
        </div>
      )}
      <VideoOverlay
        peerName={peerName}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        isAudioEnabled={isAudioEnabled}
        isLocal={isLocal}
        onVolumeClick={onVolumeClick}
        volume={volume}
        isAudioMuted={isAudioMuted}
        showVolumeSlider={showVolumeSlider}
        onVolumeSliderChange={onVolumeSliderChange}
        onToggleVolumeSlider={onToggleVolumeSlider}
        colors={colors}
      />
    </div>
  );
});

export default VideoGrid; 