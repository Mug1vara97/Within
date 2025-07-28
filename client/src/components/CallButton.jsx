import React, { useState } from 'react';
import { Phone, PhoneDisabled } from '@mui/icons-material';
import { useCallContext } from '../contexts/CallContext';
import './CallButton.css';

const CallButton = ({ chatId, partnerId, partnerName, userId, username, onCallStart, onCallEnd }) => {
  const { activeCall, startCall, endCall } = useCallContext();
  const [isInCall, setIsInCall] = useState(false);

  const handleCallClick = async () => {
    console.log('Кнопка звонка нажата:', { chatId, partnerId, partnerName, activeCall });
    
    if (activeCall && activeCall.chatId === chatId) {
      // Если звонок уже активен в этом чате, завершаем его
      console.log('Завершаем активный звонок');
      await endCall();
      setIsInCall(false);
      if (onCallEnd) {
        onCallEnd();
      }
    } else {
      // Начинаем новый звонок
      const callData = {
        chatId,
        partnerId,
        partnerName,
        userId,
        username,
        roomId: `call-${chatId}`,
        roomName: `Звонок с ${partnerName}`
      };
      
      console.log('Начинаем новый звонок:', callData);
      startCall(callData);
      setIsInCall(true);
      
      if (onCallStart) {
        onCallStart(callData);
      }
    }
  };

  const isActiveCall = activeCall && activeCall.chatId === chatId;

  return (
    <button
      className={`call-button ${isActiveCall ? 'active' : ''}`}
      onClick={handleCallClick}
      title={isActiveCall ? "Завершить звонок" : "Начать звонок"}
    >
      {isActiveCall ? <PhoneDisabled /> : <Phone />}
    </button>
  );
};

export default CallButton; 