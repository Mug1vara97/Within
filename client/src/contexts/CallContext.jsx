import React, { createContext, useContext, useState, useCallback } from 'react';

const CallContext = createContext();

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);

  const startCall = useCallback((chatId, roomId, groupName, username, userId) => {
    setActiveCall({
      chatId,
      roomId,
      groupName,
      username,
      userId,
      isActive: true
    });
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const isCallActive = useCallback((chatId) => {
    return activeCall && activeCall.chatId === chatId && activeCall.isActive;
  }, [activeCall]);

  const getActiveCall = useCallback(() => {
    return activeCall;
  }, [activeCall]);

  const value = {
    activeCall,
    startCall,
    endCall,
    isCallActive,
    getActiveCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}; 