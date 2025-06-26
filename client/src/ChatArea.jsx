import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';

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
                <div className="voice-chat-active-placeholder">
                    <h3>Голосовой чат активен в фоновом режиме</h3>
                    <p>Вы можете продолжать общение, переключаясь между каналами</p>
                </div>
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