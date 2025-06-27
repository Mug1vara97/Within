import React, { useEffect, useRef } from 'react';
import { useVoiceChat } from '../contexts/useVoiceChat';
import VoiceChat from '../VoiceChat';

/**
 * Глобальный компонент голосового чата, который работает в фоновом режиме
 * независимо от текущего открытого чата или страницы
 */
const VoiceChatGlobal = () => {
    const { voiceRoom, isVoiceChatActive, isVoiceChatUIActive } = useVoiceChat();
    const instanceIdRef = useRef(`voice-global-${Date.now()}`);
    
    // Логирование для отладки
    useEffect(() => {
        console.log(`VoiceChatGlobal [${instanceIdRef.current}]: voiceRoom state changed:`, voiceRoom);
        console.log(`VoiceChatGlobal [${instanceIdRef.current}]: isVoiceChatActive:`, isVoiceChatActive);
    }, [voiceRoom, isVoiceChatActive]);
    
    // Если UI открыт или нет активного голосового чата - не рендерим глобальный компонент
    if (!voiceRoom || !isVoiceChatActive || isVoiceChatUIActive) {
        return null;
    }
    
    console.log(`VoiceChatGlobal [${instanceIdRef.current}]: Rendering voice chat component with roomId:`, voiceRoom.roomId);

  return (
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <VoiceChat
                key={`global-voice-${voiceRoom.roomId}-${voiceRoom.serverId || 'dm'}`}
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