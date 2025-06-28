import React, { useState, useEffect, useCallback } from 'react';
import { VoiceChatContext } from './voiceChatContextDef';

// Провайдер контекста голосового чата
export const VoiceChatProvider = ({ children }) => {
  // НЕ загружаем состояние из localStorage автоматически - пользователь должен явно подключиться
  const [voiceRoom, setVoiceRoom] = useState(null);

  // Состояние активности голосового чата - всегда начинаем с false
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);

  // НЕ сохраняем состояние в localStorage автоматически - это предотвращает автоматическое подключение
  // При необходимости можно добавить явное сохранение/восстановление состояния

  // Функция для подключения к голосовому чату
  const joinVoiceRoom = useCallback((roomData) => {
    console.log('VoiceChatContext: Joining voice room:', roomData);
    
    // Проверяем, не подключены ли мы уже к этой комнате
    if (voiceRoom && 
        voiceRoom.roomId === roomData.roomId && 
        voiceRoom.serverId === roomData.serverId &&
        isVoiceChatActive) {
      console.log('VoiceChatContext: Already connected to this room, ignoring join request');
      return;
    }
    
    setVoiceRoom(roomData);
    setIsVoiceChatActive(true);
  }, [voiceRoom, isVoiceChatActive]);

  // Функция для отключения от голосового чата
  const leaveVoiceRoom = useCallback(() => {
    console.log('VoiceChatContext: Leaving voice room');
    setIsVoiceChatActive(false);
    // Очищаем voiceRoom полностью при выходе
    setVoiceRoom(null);
  }, []);

  // Значение контекста, которое будет доступно потребителям
  const contextValue = {
        voiceRoom,
        isVoiceChatActive,
        joinVoiceRoom,
        leaveVoiceRoom,
  };

  return (
    <VoiceChatContext.Provider value={contextValue}>
      {children}
    </VoiceChatContext.Provider>
  );
};

export default VoiceChatProvider; 