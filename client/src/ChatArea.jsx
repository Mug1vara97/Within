import React, { useEffect, useState, useRef } from 'react';
import GroupChat from './Chats/GroupChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner, onJoinVoiceChannel, onLeaveVoiceChannel }) => {
    const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(false);
    const prevChatId = useRef(selectedChat?.chatId);

    // Сброс флага только при смене чата, но не при смене сервера
    useEffect(() => {
        if (prevChatId.current !== selectedChat?.chatId) {
            // Сбрасываем флаг только если новый чат - это голосовой канал
            if (selectedChat?.chatType === 4) {
                setUserLeftVoiceManually(false);
            }
        }
        prevChatId.current = selectedChat?.chatId;
    }, [selectedChat?.chatId]);

    // Подключение к голосовому чату
    useEffect(() => {
        if (selectedChat?.chatType === 4 && !userLeftVoiceManually) {
            const data = {
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId
            };
            if (onJoinVoiceChannel) onJoinVoiceChannel(data);
        }
    }, [selectedChat?.chatType, selectedChat?.chatId, username, userId, userLeftVoiceManually, onJoinVoiceChannel]);

    // Обработчик выхода из голосового чата вручную
    const handleManualLeave = () => {
        setUserLeftVoiceManually(true);
        if (onLeaveVoiceChannel) onLeaveVoiceChannel();
    };

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
                onLeaveVoiceChat={handleManualLeave}
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