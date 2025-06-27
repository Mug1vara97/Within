import React from 'react';
import { useVoiceChat } from '../contexts/VoiceChatContext';
import VoiceChat from '../VoiceChat';

/**
 * Глобальный компонент голосового чата, который работает в фоновом режиме
 * независимо от текущего открытого чата или страницы
 */
const VoiceChatGlobal = () => {
    const { voiceRoom } = useVoiceChat();
    
    // Если нет активного голосового чата, ничего не рендерим
    if (!voiceRoom) return null;
    
    return (
        <div style={{ display: 'none', position: 'absolute' }}>
            <VoiceChat
                roomId={voiceRoom.roomId}
                userName={voiceRoom.userName}
                userId={voiceRoom.userId}
                serverId={voiceRoom.serverId}
                autoJoin={true}
                showUI={false} // UI скрыт, но компонент работает в фоне
            />
        </div>
    );
};

export default VoiceChatGlobal; 