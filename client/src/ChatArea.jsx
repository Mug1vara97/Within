/*
import React, { useEffect, useRef } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner, onJoinVoiceChannel, onLeaveVoiceChannel }) => {
    const { userLeftVoiceManually, leaveVoiceRoom } = useVoiceChat();
    const prevChatId = useRef(selectedChat?.chatId);

    // Сброс флага только при смене чата, но не при смене сервера
    useEffect(() => {
        if (prevChatId.current !== selectedChat?.chatId) {
            // Мы больше не сбрасываем флаг, так как теперь он управляется через контекст
            // и сбрасывается при вызове joinVoiceRoom
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
    }, [selectedChat?.chatType, selectedChat?.chatId, username, userId, userLeftVoiceManually, onJoinVoiceChannel, serverId]);

    // Обработчик выхода из голосового чата вручную
    const handleManualLeave = () => {
        leaveVoiceRoom(); // Это обновит userLeftVoiceManually в контексте
        if (onLeaveVoiceChannel) onLeaveVoiceChannel();
    };

    // Если это голосовой канал и пользователь не вышел вручную,
    // показываем специальный UI для голосового чата
    if (selectedChat?.chatType === 4 && !userLeftVoiceManually) {
        return (
            <div className="voice-chat-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                backgroundColor: '#36393f',
                color: '#dcddde'
            }}>
                <h2 style={{ marginBottom: '20px' }}>{selectedChat.groupName}</h2>
                <div style={{ 
                    fontSize: '16px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    Вы находитесь в голосовом канале
                </div>
                <button
                    onClick={handleManualLeave}
                    style={{
                        backgroundColor: '#ed4245',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    Отключиться
                </button>
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
*/