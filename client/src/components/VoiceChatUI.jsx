import React from 'react';
import { useVoiceChat } from '../contexts/useVoiceChat';

/**
 * Компонент UI для голосового чата - показывает только интерфейс,
 * вся логика обрабатывается в VoiceChatGlobal
 */
const VoiceChatUI = ({ chatName }) => {
    const { voiceRoom, leaveVoiceRoom } = useVoiceChat();

    if (!voiceRoom) {
        return null;
    }

    const handleDisconnect = () => {
        console.log('VoiceChatUI: Disconnecting from voice chat');
        leaveVoiceRoom();
    };

    return (
        <div className="voice-chat-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: '#36393f',
            color: '#dcddde'
        }}>
            <h2 style={{ marginBottom: '20px' }}>
                {chatName || voiceRoom.roomId || 'Голосовой канал'}
            </h2>
            
            <div style={{ 
                fontSize: '16px',
                marginBottom: '20px',
                textAlign: 'center'
            }}>
                Вы находитесь в голосовом канале
            </div>
            
            <div style={{
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#b9bbbe'
            }}>
                Пользователь: {voiceRoom.userName}
            </div>
            
            <button 
                style={{
                    backgroundColor: '#ed4245',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500'
                }}
                onClick={handleDisconnect}
            >
                Отключиться
            </button>
        </div>
    );
};

export default VoiceChatUI;
