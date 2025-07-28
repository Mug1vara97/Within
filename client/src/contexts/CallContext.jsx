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

  const startCall = useCallback((callData) => {
    setActiveCall(callData);
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const value = {
    activeCall,
    startCall,
    endCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}; 