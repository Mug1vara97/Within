import React from 'react';
import VoiceChat from '../VoiceChat';
import { useVoiceChat } from '../contexts/VoiceChatContext';

const VoiceChatGlobal = () => {
  const { voiceRoom, isVoiceChatActive, leaveVoiceRoom } = useVoiceChat();

  if (!isVoiceChatActive || !voiceRoom) return null;

  return (
    <div className="voice-chat-global">
      <VoiceChat
        key={`${voiceRoom.roomId}-${voiceRoom.serverId}`}
        roomId={voiceRoom.roomId}
        userName={voiceRoom.userName}
        userId={voiceRoom.userId}
        serverId={voiceRoom.serverId}
        autoJoin={true}
        showUI={false}
        onLeave={() => {
          leaveVoiceRoom();
        }}
      />
    </div>
  );
};

export default VoiceChatGlobal; 