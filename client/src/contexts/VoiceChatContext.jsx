import React, { createContext, useState, useContext, useEffect } from 'react';

const VoiceChatContext = createContext();

export const VoiceChatProvider = ({ children }) => {
  const [voiceRoom, setVoiceRoom] = useState(() => {
    // При инициализации пытаемся восстановить состояние из localStorage
    const savedVoiceRoom = localStorage.getItem('voiceRoom');
    const savedManuallyLeft = localStorage.getItem('userLeftVoiceManually');
    
    // Если пользователь вышел вручную, не восстанавливаем состояние
    if (savedManuallyLeft === 'true') {
      return null;
    }
    
    try {
      return savedVoiceRoom ? JSON.parse(savedVoiceRoom) : null;
    } catch (error) {
      console.error('Ошибка при парсинге сохраненного состояния голосового чата:', error);
      return null;
    }
  });
  
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(() => !!voiceRoom);
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(() => {
    return localStorage.getItem('userLeftVoiceManually') === 'true';
  });

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (voiceRoom) {
      localStorage.setItem('voiceRoom', JSON.stringify(voiceRoom));
    } else {
      localStorage.removeItem('voiceRoom');
    }
  }, [voiceRoom]);

  useEffect(() => {
    localStorage.setItem('userLeftVoiceManually', userLeftVoiceManually.toString());
  }, [userLeftVoiceManually]);

  const joinVoiceRoom = (data) => {
    setVoiceRoom(data);
    setIsVoiceChatActive(true);
    setUserLeftVoiceManually(false);
  };

  const leaveVoiceRoom = () => {
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

export const useVoiceChat = () => useContext(VoiceChatContext); 