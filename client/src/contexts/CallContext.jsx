import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import VoiceChat from '../VoiceChat';

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
  const voiceChatRef = useRef(null);

  const startCall = useCallback((callData) => {
    console.log('CallContext: Starting call:', callData);
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
    endCall,
    voiceChatRef
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* Глобальный VoiceChat компонент */}
      {activeCall && (
        <div className="global-call-container">
          <VoiceChat
            ref={voiceChatRef}
            roomId={`call-${activeCall.chatId}`}
            roomName={`Звонок с ${activeCall.partnerName}`}
            userName={activeCall.username}
            userId={activeCall.userId}
            serverId={null}
            autoJoin={true}
            showUI={true}
            isVisible={true}
            onLeave={endCall}
            onManualLeave={endCall}
            initialMuted={false}
            initialAudioEnabled={true}
          />
        </div>
      )}
    </CallContext.Provider>
  );
}; 