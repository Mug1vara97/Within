import React from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Avatar,
  IconButton
} from '@mui/material';
import { CallEnd } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import VoiceChat from '../VoiceChat';

const CallModal = ({ 
  open, 
  onClose, 
  callData, 
  onCallEnd
}) => {
  const { colors } = useTheme();
  const { chatId, partnerName, userId, username, callType = 'audio' } = callData || {};

  const handleCallEnd = () => {
    if (onCallEnd) {
      onCallEnd();
    }
    onClose();
  };

    // Для активного звонка используем VoiceChat
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: colors.background,
          color: colors.text,
          borderRadius: 0,
          border: 'none',
          height: '300px',
          maxHeight: '300px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', position: 'relative' }}>
        {/* Заголовок звонка */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.9)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ backgroundColor: colors.primary }}>
              {partnerName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: colors.text }}>
                {partnerName}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textMuted }}>
                {callType === 'video' ? 'Видео звонок' : 'Аудио звонок'}
              </Typography>
            </Box>
          </Box>

                   <IconButton
            onClick={handleCallEnd}
            sx={{
              backgroundColor: '#ed4245',
              color: 'white',
              '&:hover': {
                backgroundColor: '#d73d40'
              }
            }}
          >
            <CallEnd />
          </IconButton>
        </Box>

        {/* VoiceChat компонент */}
        <Box sx={{ height: '100%', pt: 8 }}>
          <VoiceChat
            roomId={`call-${chatId}`}
            roomName={`Звонок с ${partnerName}`}
            userName={username}
            userId={userId}
            serverId={null}
            autoJoin={true}
            showUI={true}
            isVisible={true}
            onLeave={handleCallEnd}
            onManualLeave={handleCallEnd}
            initialMuted={false}
            initialAudioEnabled={true}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal; 