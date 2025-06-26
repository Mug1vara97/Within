import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
// import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom, setShowVoiceUI } = useVoiceChat();

    useEffect(() => {
        if (selectedChat?.chatType === 4) {
            joinVoiceRoom({
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId,
                leaveVoiceRoom: () => {/* функция для выхода */}
            });
            setShowVoiceUI(true);
        } else {
            setShowVoiceUI(false);
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom, setShowVoiceUI]);

    if (selectedChat) {
        // Если это голосовой канал (chatType === 4) и голосовой чат активен
        if (selectedChat.chatType === 4 && isVoiceChatActive && voiceRoom) {
            return (
                <div 
                  id="voicechat-root" 
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                />
            );
        }
        // Для остальных чатов
        return (
            <GroupChat
                username={username}
                userId={userId}
                chatId={selectedChat.chatId}
                groupName={selectedChat.groupName}
                isServerChat={true}
                serverId={serverId}
                userPermissions={userPermissions}
                isServerOwner={isServerOwner}
            />
        );
    }

    return (
        <div className="no-chat-selected">
            <h3>Select a chat to start messaging</h3>
        </div>
    );
};

export default ChatArea;