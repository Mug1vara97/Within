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
  const [isInCall, setIsInCall] = useState(false);

  const startCall = useCallback((callData) => {
    console.log('Starting call:', callData);
    setActiveCall(callData);
    setIsInCall(true);
  }, []);

  const endCall = useCallback(() => {
    console.log('Ending call');
    setActiveCall(null);
    setIsInCall(false);
  }, []);

  const value = {
    activeCall,
    isInCall,
    startCall,
    endCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}; 