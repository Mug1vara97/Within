import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';
import { useVoiceChat } from './contexts/VoiceChatContext';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom } = useVoiceChat();

    // Подключаемся к голосовому чату при выборе голосового канала
    useEffect(() => {
        if (selectedChat?.chatType === 4) {
            joinVoiceRoom({
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId,
                leaveVoiceRoom: () => {/* функция для выхода */}
            });
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom]);

    if (selectedChat) {
        // Если это голосовой канал (chatType === 4) и голосовой чат активен
        if (selectedChat.chatType === 4 && isVoiceChatActive && voiceRoom) {
            return (
                <VoiceChat
                    roomId={voiceRoom.roomId}
                    userName={voiceRoom.userName}
                    userId={voiceRoom.userId}
                    serverId={voiceRoom.serverId}
                    autoJoin={false}
                    onLeave={() => {/* функция для выхода */}}
                />
            );
        }
        
        // Для всех остальных чатов (текстовых) показываем GroupChat
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