import React, { useEffect, useState } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, leftVoiceChat, setLeftVoiceChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const [isInVoiceChat, setIsInVoiceChat] = useState(false);

    // Сбрасываем leftVoiceChat при смене чата
    useEffect(() => {
        if (selectedChat?.chatType === 3) {
            setLeftVoiceChat(false);
            setIsInVoiceChat(false);
        }
    }, [selectedChat, setLeftVoiceChat]);

    // Если пользователь покинул голосовой чат
    if (leftVoiceChat && (!selectedChat || selectedChat.chatType !== 3)) {
        return (
            <div className="no-chat-selected">
                <h3>Вы покинули голосовой чат</h3>
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
                isInVoiceChat={isInVoiceChat}
                setIsInVoiceChat={setIsInVoiceChat}
                onLeave={() => {
                    setLeftVoiceChat(true);
                    setIsInVoiceChat(false);
                }}
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