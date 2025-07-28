import React, { useState, useEffect } from 'react';
import { Phone, CallEnd, PhoneInTalk } from '@mui/icons-material';
import { IconButton, Tooltip, Badge } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

const CallButton = ({ 
  chatId, 
  partnerId, 
  partnerName, 
  userId, 
  username, 
  onCallStart, 
  onCallEnd,
  isInCall = false
}) => {
  const { colors } = useTheme();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    setIsCallActive(isInCall);
  }, [isInCall]);

  const handleCallClick = () => {
    if (isCallActive) {
      // Завершить звонок
      if (onCallEnd) {
        onCallEnd();
      }
      setIsCallActive(false);
      setIsRinging(false);
    } else {
      // Начать звонок
      if (onCallStart) {
        onCallStart({
          chatId,
          partnerId,
          partnerName,
          userId,
          username,
          callType: 'audio' // По умолчанию аудио звонок
        });
      }
      setIsCallActive(true);
    }
  };

  const getCallIcon = () => {
    if (isRinging) {
      return <PhoneInTalk />;
    }
    if (isCallActive) {
      return <CallEnd />;
    }
    return <Phone />;
  };

  const getCallTooltip = () => {
    if (isRinging) {
      return 'Входящий звонок';
    }
    if (isCallActive) {
      return 'Завершить звонок';
    }
    return 'Позвонить';
  };

  const getCallColor = () => {
    if (isRinging) {
      return '#43b581'; // Зеленый для входящего звонка
    }
    if (isCallActive) {
      return '#ed4245'; // Красный для активного звонка
    }
    return colors.textMuted;
  };

  return (
    <Tooltip title={getCallTooltip()} placement="top">
      <IconButton
        onClick={handleCallClick}
        sx={{
          color: getCallColor(),
          '&:hover': {
            backgroundColor: colors.hover,
            color: isCallActive ? '#ed4245' : colors.primary
          },
          transition: 'all 0.2s ease',
          animation: isRinging ? 'ringing 1s infinite' : 'none',
          '@keyframes ringing': {
            '0%, 100%': {
              transform: 'scale(1)',
              boxShadow: '0 0 0 0 rgba(67, 181, 129, 0.7)'
            },
            '50%': {
              transform: 'scale(1.1)',
              boxShadow: '0 0 0 10px rgba(67, 181, 129, 0)'
            }
          }
        }}
      >
        <Badge
          color="error"
          variant="dot"
          invisible={!isRinging}
        >
          {getCallIcon()}
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default CallButton; 