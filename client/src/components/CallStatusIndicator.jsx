import React from 'react';
import { CallIcon, MicOff, Mic, HeadsetOff, Headset } from '@mui/icons-material';
import './CallStatusIndicator.css';

const CallStatusIndicator = ({ 
  isInCall, 
  isMuted, 
  isAudioDisabled, 
  otherUserInCall, 
  otherUserName,
  onJoinCall,
  onLeaveCall,
  onToggleMute,
  onToggleAudio
}) => {
  if (!isInCall && !otherUserInCall) {
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
          {!isInCall && otherUserInCall && (
            <button
              className="join-call-button"
              onClick={onJoinCall}
              title="Присоединиться к звонку"
            >
              ПРИСОЕДИНИТЬСЯ К ЗВОНКУ
            </button>
          )}
          
          {isInCall && (
            <div className="call-controls">
                             <button
                 className={`mute-button ${isMuted ? 'muted' : ''}`}
                 onClick={onToggleMute}
                 title={isMuted ? "Включить микрофон" : "Выключить микрофон"}
               >
                 {isMuted ? <MicOff /> : <Mic />}
               </button>
               <button
                 className={`audio-button ${isAudioDisabled ? 'disabled' : ''}`}
                 onClick={onToggleAudio}
                 title={isAudioDisabled ? "Включить звук" : "Выключить звук"}
               >
                 {isAudioDisabled ? <HeadsetOff /> : <Headset />}
               </button>
              <button
                className="leave-call-button"
                onClick={onLeaveCall}
                title="Покинуть звонок"
              >
                Покинуть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallStatusIndicator; 