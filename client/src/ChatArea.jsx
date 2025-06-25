import React, { useEffect, useRef } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, leftVoiceChat, setLeftVoiceChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    // Храним состояние активного голосового чата
    const activeVoiceChatRef = useRef(null);

    // Сбрасываем leftVoiceChat при смене чата
    useEffect(() => {
        if (selectedChat?.chatType === 3) {
            setLeftVoiceChat(false);
        }
    }, [selectedChat, setLeftVoiceChat]);

    // Если пользователь покинул голосовой чат
    if (leftVoiceChat && (!selectedChat || selectedChat.chatType !== 3)) {
        // При выходе из голосового чата сбрасываем activeVoiceChatRef
        if (activeVoiceChatRef.current) {
            activeVoiceChatRef.current = null;
        }
        return (
            <div className="no-chat-selected">
                <h3>Вы покинули голосовой чат</h3>
            </div>
        );
    }

    if (selectedChat) {
        // Для текстового чата
        if (selectedChat.chatType === 3) {
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
        
        // Для голосового чата
        // Проверяем, не находимся ли мы уже в этом голосовом чате
        const isAlreadyInCall = activeVoiceChatRef.current === selectedChat.chatId.toString();
        
        return (
            <VoiceChat
                roomId={selectedChat.chatId.toString()}
                userName={username}
                userId={userId}
                serverId={serverId}
                // Автоматически подключаемся только если мы еще не в этом чате
                autoJoin={!isAlreadyInCall}
                onLeave={() => {
                    activeVoiceChatRef.current = null;
                    setLeftVoiceChat(true);
                }}
                onJoin={() => {
                    activeVoiceChatRef.current = selectedChat.chatId.toString();
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