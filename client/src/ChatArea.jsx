import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, leftVoiceChat, setLeftVoiceChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    // Сбрасываем leftVoiceChat при смене чата
    useEffect(() => {
        if (selectedChat?.chatType === 3) {
            setLeftVoiceChat(false);
        }
    }, [selectedChat, setLeftVoiceChat]);

    // Если пользователь покинул голосовой чат
    if (leftVoiceChat && (!selectedChat || selectedChat.chatType !== 3)) {
        return (
            <div className="no-chat-selected">
                <h3>Вы покинули голосовой чат</h3>
                <button onClick={() => setLeftVoiceChat(false)}>
                    Вернуться к списку каналов
                </button>
            </div>
        );
    }

    if (selectedChat) {
        return selectedChat.chatType === 3 ? (
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
        ) : (
            <VoiceChat
                roomId={selectedChat.chatId.toString()}
                userName={username}
                userId={userId}
                serverId={serverId}
                autoJoin={true}
                onLeave={() => setLeftVoiceChat(true)}
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