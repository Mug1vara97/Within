import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
import VoiceChatGlobal from './components/VoiceChatGlobal';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive } = useVoiceChat();

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
        // Если это голосовой канал (chatType === 4)
        if (selectedChat.chatType === 4 && isVoiceChatActive) {
            return (
                <div className="voice-chat-active-placeholder">
                    <h3>Голосовой чат активен в фоновом режиме</h3>
                    <p>Вы можете продолжать общение, переключаясь между каналами</p>
                    <VoiceChatGlobal />
                </div>
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