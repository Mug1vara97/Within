import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Avatar,
  IconButton
} from '@mui/material';
import { Phone, PhoneOff } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import VoiceChat from '../VoiceChat';

const CallModal = ({ 
  open, 
  onClose, 
  callData, 
  onCallEnd,
  isIncomingCall = false
}) => {
  const { colors } = useTheme();
  const { chatId, partnerId, partnerName, userId, username, callType = 'audio' } = callData || {};

  const handleCallEnd = () => {
    if (onCallEnd) {
      onCallEnd();
    }
    onClose();
  };

  // Для входящего звонка показываем простой диалог
  if (isIncomingCall) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: colors.background,
            color: colors.text,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              backgroundColor: colors.primary,
              fontSize: '32px'
            }}
          >
            {partnerName?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ color: colors.text, mb: 1 }}>
            {partnerName}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textMuted, mb: 3 }}>
            Входящий звонок...
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <IconButton
              onClick={handleCallEnd}
              sx={{
                backgroundColor: '#43b581',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#3ba55c'
                },
                width: 56,
                height: 56
              }}
            >
              <Phone />
            </IconButton>
            <IconButton
              onClick={onClose}
              sx={{
                backgroundColor: '#ed4245',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#d73d40'
                },
                width: 56,
                height: 56
              }}
            >
              <PhoneOff />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Для активного звонка используем VoiceChat
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: colors.background,
          color: colors.text,
          borderRadius: 0,
          border: 'none',
          height: '100vh',
          maxHeight: '100vh'
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
          backgroundColor: 'rgba(0,0,0,0.7)',
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
            <PhoneOff />
          </IconButton>
        </Box>

        {/* VoiceChat компонент */}
        <Box sx={{ height: '100%', pt: 8 }}>
          <VoiceChat
            roomId={`call-${chatId}-${userId}-${partnerId}`}
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