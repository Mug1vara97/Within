import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, leftVoiceChat, setLeftVoiceChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    useEffect(() => {
        if (selectedChat?.typeId !== 3 && !leftVoiceChat) {
            // Автоматически подключаемся к голосовому чату
            setLeftVoiceChat(false);
        }
    }, [selectedChat, leftVoiceChat]);

    if (selectedChat) {
        // Если это текстовый чат (typeId === 3)
        if (selectedChat.typeId === 3) {
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
        // Если это голосовой чат (typeId !== 3)
        return (
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

    if (leftVoiceChat) {
        return (
            <div className="no-chat-selected">
                <h3>Вы покинули голосовой чат</h3>
                <button onClick={() => setLeftVoiceChat(false)}>
                    Вернуться к списку каналов
                </button>
            </div>
        );
    }

    return (
        <div className="no-chat-selected">
            <h3>Select a chat to start messaging</h3>
        </div>
    );
};

export default ChatArea;