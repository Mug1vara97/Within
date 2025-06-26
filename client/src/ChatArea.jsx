import React, { useEffect, useState } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, leftVoiceChat, setLeftVoiceChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const [isInVoiceChat, setIsInVoiceChat] = useState(false);
    const [currentVoiceChatId, setCurrentVoiceChatId] = useState(null);

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
            </div>
        );
    }

    // Определяем, нужно ли показывать голосовой чат
    const shouldShowVoiceChat = selectedChat && selectedChat.chatType !== 3;
    const voiceChatId = shouldShowVoiceChat ? selectedChat.chatId.toString() : null;

    // Если это новый голосовой чат, сбрасываем состояние
    if (voiceChatId && voiceChatId !== currentVoiceChatId) {
        setCurrentVoiceChatId(voiceChatId);
        setIsInVoiceChat(false);
    }

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            {/* Групповой чат */}
            {selectedChat && selectedChat.chatType === 3 && (
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
            )}

            {/* Голосовой чат - рендерится когда есть voiceChatId или когда выбран голосовой канал */}
            {(currentVoiceChatId || voiceChatId) && (
                <div style={{ 
                    display: shouldShowVoiceChat ? 'block' : 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: shouldShowVoiceChat ? 1 : -1
                }}>
                    <VoiceChat
                        roomId={currentVoiceChatId || voiceChatId}
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
                </div>
            )}

            {/* Сообщение о выборе чата */}
            {!selectedChat && (
                <div className="no-chat-selected">
                    <h3>Select a chat to start messaging</h3>
                </div>
            )}
        </div>
    );
};

export default ChatArea;