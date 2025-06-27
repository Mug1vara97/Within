import React, { createContext, useState, useEffect } from 'react';

const VoiceChatContext = createContext();

export const VoiceChatProvider = ({ children }) => {
  const [voiceRoom, setVoiceRoom] = useState(() => {
    // При инициализации пытаемся восстановить состояние из localStorage
    const savedVoiceRoom = localStorage.getItem('voiceRoom');
    const savedManuallyLeft = localStorage.getItem('userLeftVoiceManually');
    
    // Если пользователь вышел вручную, не восстанавливаем состояние
    if (savedManuallyLeft === 'true') {
      console.log('VoiceChatContext: User manually left, not restoring state');
      return null;
    }
    
    try {
      const parsedRoom = savedVoiceRoom ? JSON.parse(savedVoiceRoom) : null;
      console.log('VoiceChatContext: Restored voice room from storage:', parsedRoom);
      return parsedRoom;
    } catch (error) {
      console.error('Ошибка при парсинге сохраненного состояния голосового чата:', error);
      return null;
    }
  });
  
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(() => {
    // При инициализации проверяем, есть ли сохраненное состояние и не вышел ли пользователь вручную
    const savedVoiceRoom = localStorage.getItem('voiceRoom');
    const savedManuallyLeft = localStorage.getItem('userLeftVoiceManually');
    
    const isActive = savedVoiceRoom && savedManuallyLeft !== 'true';
    console.log('VoiceChatContext: Initial isVoiceChatActive:', isActive);
    return isActive;
  });
  
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(() => {
    const savedManuallyLeft = localStorage.getItem('userLeftVoiceManually') === 'true';
    console.log('VoiceChatContext: Initial userLeftVoiceManually:', savedManuallyLeft);
    return savedManuallyLeft;
  });

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (voiceRoom) {
      console.log('VoiceChatContext: Saving voice room to storage:', voiceRoom);
      localStorage.setItem('voiceRoom', JSON.stringify(voiceRoom));
    } else {
      console.log('VoiceChatContext: Removing voice room from storage');
      localStorage.removeItem('voiceRoom');
    }
  }, [voiceRoom]);

  useEffect(() => {
    console.log('VoiceChatContext: Saving userLeftVoiceManually to storage:', userLeftVoiceManually);
    localStorage.setItem('userLeftVoiceManually', userLeftVoiceManually.toString());
  }, [userLeftVoiceManually]);

  const joinVoiceRoom = (data) => {
    console.log('VoiceChatContext: Joining voice room with data:', data);
    setVoiceRoom(data);
    setIsVoiceChatActive(true);
    setShowVoiceUI(true);
    setUserLeftVoiceManually(false);
  };

  const leaveVoiceRoom = () => {
    console.log('VoiceChatContext: Leaving voice room');
    setVoiceRoom(null);
    setIsVoiceChatActive(false);
    setShowVoiceUI(false);
    setUserLeftVoiceManually(true);
  };

  return (
    <VoiceChatContext.Provider
      value={{
        voiceRoom,
        isVoiceChatActive,
        joinVoiceRoom,
        leaveVoiceRoom,
        showVoiceUI,
        setShowVoiceUI,
        userLeftVoiceManually
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

// Экспортируем контекст для использования в хуке
export { VoiceChatContext }; 