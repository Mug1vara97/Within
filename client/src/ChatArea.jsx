import React, { useEffect, useState, useRef } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom, setShowVoiceUI, leaveVoiceRoom } = useVoiceChat();
    const [leftVoiceChannel, setLeftVoiceChannel] = useState(false);
    const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(false);
    const prevVoiceActive = useRef(isVoiceChatActive);
    const prevServerId = useRef(serverId);
    const prevChatId = useRef(selectedChat?.chatId);

    // Сброс флага, если пользователь сменил сервер или чат
    useEffect(() => {
        if (
            prevServerId.current !== serverId ||
            prevChatId.current !== selectedChat?.chatId
        ) {
            setUserLeftVoiceManually(false);
        }
        prevServerId.current = serverId;
        prevChatId.current = selectedChat?.chatId;
    }, [serverId, selectedChat?.chatId]);

    useEffect(() => {
        if (selectedChat?.chatType === 4) {
            if (!userLeftVoiceManually) {
                joinVoiceRoom({
                    roomId: selectedChat.chatId,
                    userName: username,
                    userId: userId,
                    serverId: serverId
                });
                setShowVoiceUI(true);
                setLeftVoiceChannel(false); // Скрываем сообщение при входе в голосовой канал
            }
        } else {
            setShowVoiceUI(false);
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom, setShowVoiceUI, userLeftVoiceManually]);

    useEffect(() => {
        // Если пользователь только что покинул голосовой чат
        if (prevVoiceActive.current && !isVoiceChatActive) {
            setLeftVoiceChannel(true);
        }
        prevVoiceActive.current = isVoiceChatActive;
    }, [isVoiceChatActive]);

    // Обработчик выхода из голосового чата вручную
    const handleManualLeave = () => {
        setUserLeftVoiceManually(true);
        leaveVoiceRoom();
    };

    // Отображаем UI голосового чата внутри ChatArea
    if (selectedChat?.chatType === 4 && isVoiceChatActive && voiceRoom && !userLeftVoiceManually) {
        return (
            <div 
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
                {/* Отображаем UI голосового чата */}
                <VoiceChat
                    roomId={voiceRoom.roomId}
                    userName={voiceRoom.userName}
                    userId={voiceRoom.userId}
                    serverId={voiceRoom.serverId}
                    autoJoin={false} // Не подключаемся снова, подключение уже есть через GlobalVoiceChat
                    showUI={true}    // Показываем только UI
                    onManualLeave={handleManualLeave}
                />
            </div>
        );
    }

    // Показываем сообщение, если пользователь только что покинул голосовой канал
    if (leftVoiceChannel) {
        return (
            <div className="left-voice-channel-message" style={{textAlign: 'center', marginTop: '40px', color: '#888'}}>
                <h3>Вы покинули голосовой канал</h3>
            </div>
        );
    }

    // Для остальных чатов
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