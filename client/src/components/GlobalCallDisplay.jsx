import React, { useRef } from 'react';
import { useCallContext } from '../contexts/CallContext';
import VoiceChat from '../VoiceCall';

const GlobalCallDisplay = () => {
  const { activeCall, endCall } = useCallContext();
  const voiceChatRef = useRef(null);

  console.log('GlobalCallDisplay render:', { activeCall });

  if (!activeCall || !activeCall.isActive) {
    console.log('GlobalCallDisplay: No active call, returning null');
    return null;
  }

  const handleCallLeave = () => {
    endCall();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <VoiceChat
        ref={voiceChatRef}
        roomId={activeCall.roomId}
        roomName={`Звонок в чате: ${activeCall.groupName}`}
        userName={activeCall.username}
        userId={activeCall.userId}
        autoJoin={true}
        showUI={true}
        isVisible={true}
        onLeave={handleCallLeave}
        onManualLeave={handleCallLeave}
      />
    </div>
  );
};

export default GlobalCallDisplay; 