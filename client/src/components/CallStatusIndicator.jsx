import React from 'react';
import { CallIcon, MicOff, Mic, HeadsetOff, Headset } from '@mui/icons-material';
import './CallStatusIndicator.css';

const CallStatusIndicator = ({ 
  isInCall, 
  otherUserInCall, 
  otherUserName,
  onJoinCall
}) => {
  // Компонент отображается только когда другой пользователь в звонке, а текущий - нет
  console.log('CallStatusIndicator: Props:', { isInCall, otherUserInCall, otherUserName });
  
  if (!otherUserInCall || isInCall) {
    console.log('CallStatusIndicator: Not showing - otherUserInCall:', otherUserInCall, 'isInCall:', isInCall);
    return null;
  }

  return (
    <div className="call-status-indicator">
      <div className="call-status-header">
        <div className="call-status-avatars">
          <div className="call-status-avatar current-user">
            <span>Вы</span>
          </div>
          <div className="call-status-avatar other-user">
            <span>{otherUserName ? otherUserName[0].toUpperCase() : 'U'}</span>
          </div>
        </div>
        
        <div className="call-status-controls">
          <button
            className="join-call-button"
            onClick={onJoinCall}
            title="Присоединиться к звонку"
          >
            ПРИСОЕДИНИТЬСЯ К ЗВОНКУ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallStatusIndicator; 