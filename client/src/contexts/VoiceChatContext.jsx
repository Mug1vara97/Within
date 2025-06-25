import React, { createContext, useContext, useState, useRef } from 'react';

const VoiceChatContext = createContext();

export const VoiceChatProvider = ({ children }) => {
  const [activeVoiceChat, setActiveVoiceChat] = useState(null);
  const socketRef = useRef(null);

  const joinVoiceChat = (roomId) => {
    setActiveVoiceChat(roomId);
  };

  const leaveVoiceChat = () => {
    setActiveVoiceChat(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const value = {
    activeVoiceChat,
    socketRef,
    joinVoiceChat,
    leaveVoiceChat
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
}; 