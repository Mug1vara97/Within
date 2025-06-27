import React, { useState, useEffect, useCallback } from 'react';
import { VoiceChatContext } from './voiceChatContextDef';

// Провайдер контекста голосового чата
export const VoiceChatProvider = ({ children }) => {
  // Загружаем сохраненное состояние из localStorage при инициализации
  const [voiceRoom, setVoiceRoom] = useState(() => {
    try {
      const savedVoiceRoom = localStorage.getItem('voiceRoomState');
      return savedVoiceRoom ? JSON.parse(savedVoiceRoom) : null;
    } catch (error) {
      console.error('Error loading voice room state from localStorage:', error);
      return null;
    }
  });

  // Состояние активности голосового чата
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(() => {
    try {
      const savedActiveState = localStorage.getItem('voiceChatActive');
      return savedActiveState ? JSON.parse(savedActiveState) === true : false;
    } catch (error) {
      console.error('Error loading voice chat active state from localStorage:', error);
      return false;
    }
  });

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    try {
      if (voiceRoom) {
        localStorage.setItem('voiceRoomState', JSON.stringify(voiceRoom));
      } else {
        localStorage.removeItem('voiceRoomState');
      }
    } catch (error) {
      console.error('Error saving voice room state to localStorage:', error);
    }
  }, [voiceRoom]);

  // Сохраняем состояние активности в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voiceChatActive', JSON.stringify(isVoiceChatActive));
    } catch (error) {
      console.error('Error saving voice chat active state to localStorage:', error);
    }
  }, [isVoiceChatActive]);

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
    // Не очищаем voiceRoom, чтобы сохранить информацию о последней комнате
    // setVoiceRoom(null);
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