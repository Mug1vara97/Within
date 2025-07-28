import React, { useRef } from 'react';
import { useCallContext } from '../contexts/CallContext';
import VoiceChat from '../VoiceCall';

const GlobalCallDisplay = () => {
  const { activeCall, endCall } = useCallContext();
  const voiceChatRef = useRef(null);

  if (!activeCall || !activeCall.isActive) {
    return null;
  }

  const handleCallLeave = () => {
    endCall();
  };

  return (
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
  );
};

export default GlobalCallDisplay; 