import React, { useState } from 'react';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { Mic, MicOff, VolumeUp, VolumeOff } from '@mui/icons-material';

const VideoOverlay = React.memo(({ 
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
  const [isVolumeOff, setIsVolumeOff] = useState(isAudioMuted || volume === 0);

  const handleVolumeClick = () => {
    if (onVolumeClick) {
      onVolumeClick();
    }
  };

  const handleVolumeSliderChange = (event, newValue) => {
    if (onVolumeSliderChange) {
      onVolumeSliderChange(newValue);
    }
  };

  const handleToggleVolumeSlider = () => {
    if (onToggleVolumeSlider) {
      onToggleVolumeSlider();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '8px',
      left: '8px',
      right: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      zIndex: 10
    }}>
      {/* Имя пользователя и статус микрофона */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 500
      }}>
        {isMuted ? (
          <MicOff sx={{ fontSize: 16, color: '#ed4245' }} />
        ) : (
          <Mic sx={{ fontSize: 16, color: isSpeaking ? '#3ba55c' : '#b9bbbe' }} />
        )}
        <Typography sx={{ 
          color: '#fff', 
          fontSize: '14px', 
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {peerName}
        </Typography>
      </Box>

      {/* Кнопка громкости (только для удаленных пользователей) */}
      {!isLocal && (
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleVolumeClick}
            sx={{
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: isVolumeOff ? '#ed4245' : '#b9bbbe',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {isVolumeOff ? <VolumeOff sx={{ fontSize: 16 }} /> : <VolumeUp sx={{ fontSize: 16 }} />}
          </IconButton>

          {/* Слайдер громкости */}
          {showVolumeSlider && (
            <Box sx={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: '8px',
              padding: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              minWidth: '120px'
            }}>
              <Typography sx={{ 
                color: '#fff', 
                fontSize: '12px', 
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Громкость
              </Typography>
              <Slider
                value={volume}
                onChange={handleVolumeSliderChange}
                min={0}
                max={100}
                step={1}
                sx={{
                  color: '#7289da',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#7289da'
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#7289da'
                  }
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </div>
  );
});

export default VideoOverlay; 