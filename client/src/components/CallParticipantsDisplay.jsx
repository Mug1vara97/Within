import React from 'react';
import { MicOff, HeadsetOff } from '@mui/icons-material';

const CallParticipantsDisplay = ({ participants, currentUserId }) => {
  // Фильтруем участников, исключая текущего пользователя
  const otherParticipants = participants.filter(participant => participant.id !== currentUserId);

  if (otherParticipants.length === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#8e9297',
        fontSize: '14px'
      }}>
        <span>В звонке:</span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {otherParticipants.map((participant, index) => (
          <div
            key={participant.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              position: 'relative'
            }}
          >
            {/* Аватар пользователя */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: participant.avatarColor || '#5865f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              border: '2px solid #36393f'
            }}>
              {participant.name ? participant.name[0].toUpperCase() : 'U'}
            </div>
            
            {/* Индикаторы состояния */}
            <div style={{
              display: 'flex',
              gap: '2px',
              position: 'absolute',
              bottom: '-2px',
              right: '-2px'
            }}>
              {participant.isMuted && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ed4245',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MicOff style={{ fontSize: '8px', color: '#ffffff' }} />
                </div>
              )}
              {participant.isAudioDisabled && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ed4245',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HeadsetOff style={{ fontSize: '8px', color: '#ffffff' }} />
                </div>
              )}
            </div>
            
            {/* Имя пользователя */}
            <span style={{
              fontSize: '11px',
              color: '#8e9297',
              textAlign: 'center',
              maxWidth: '40px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {participant.name || 'Пользователь'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallParticipantsDisplay; 