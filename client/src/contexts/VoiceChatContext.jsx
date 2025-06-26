import React, { createContext, useState, useContext } from 'react';

const VoiceChatContext = createContext();

export const VoiceChatProvider = ({ children }) => {
  const [voiceRoom, setVoiceRoom] = useState(null);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [showVoiceUI, setShowVoiceUI] = useState(false);

  const joinVoiceRoom = (data) => {
    setVoiceRoom(data);
    setIsVoiceChatActive(true);
  };

  const leaveVoiceRoom = () => {
    setVoiceRoom(null);
    setIsVoiceChatActive(false);
    setShowVoiceUI(false);
  };

  return (
    <VoiceChatContext.Provider
      value={{
        voiceRoom,
        isVoiceChatActive,
        joinVoiceRoom,
        leaveVoiceRoom,
        showVoiceUI,
        setShowVoiceUI
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = () => useContext(VoiceChatContext); 