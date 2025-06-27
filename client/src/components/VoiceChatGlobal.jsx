import React, { useEffect } from 'react';
import { useVoiceChat } from '../contexts/useVoiceChat';
import VoiceChat from '../VoiceChat';

/**
 * Глобальный компонент голосового чата, который работает в фоновом режиме
 * независимо от текущего открытого чата или страницы
 */
const VoiceChatGlobal = () => {
    const { voiceRoom, isVoiceChatActive } = useVoiceChat();
    
    // Логирование для отладки
    useEffect(() => {
        console.log('VoiceChatGlobal: voiceRoom state changed:', voiceRoom);
        console.log('VoiceChatGlobal: isVoiceChatActive:', isVoiceChatActive);
    }, [voiceRoom, isVoiceChatActive]);
    
    // Если нет активного голосового чата, ничего не рендерим
    if (!voiceRoom || !isVoiceChatActive) {
        console.log('VoiceChatGlobal: No active voice room or chat is not active');
        return null;
    }
    
    console.log('VoiceChatGlobal: Rendering voice chat component with roomId:', voiceRoom.roomId);
    
    return (
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
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