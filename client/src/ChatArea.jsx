import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive } = useVoiceChat();

    // Подключаемся к голосовому чату при выборе
    useEffect(() => {
        if (selectedChat?.chatType === 3) {
            joinVoiceRoom({
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId,
                leaveVoiceRoom: () => {/* функция для выхода */}
            });
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom]);

    // Если выбран голосовой канал и мы подключены
    if (selectedChat?.chatType === 3 && isVoiceChatActive) {
        return (
            <div className="voice-chat-active-placeholder">
                <h3>Голосовой чат активен в фоновом режиме</h3>
                <p>Вы можете продолжать общение, переключаясь между каналами</p>
            </div>
        );
    }

    if (selectedChat) {
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