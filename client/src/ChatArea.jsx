import React, { useEffect, useState, useRef } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    // Локальное состояние для управления звонком
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceRoomData, setVoiceRoomData] = useState(null);
    const [leftVoiceChannel, setLeftVoiceChannel] = useState(false);
    const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(false);
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
                setVoiceRoomData({
                    roomId: selectedChat.chatId,
                    userName: username,
                    userId: userId,
                    serverId: serverId
                });
                setIsVoiceActive(true);
                setLeftVoiceChannel(false);
            }
        } else {
            setIsVoiceActive(false);
        }
    }, [selectedChat, username, userId, serverId, userLeftVoiceManually]);

    // Обработчик выхода из голосового чата вручную
    const handleManualLeave = () => {
        setUserLeftVoiceManually(true);
        setIsVoiceActive(false);
        setVoiceRoomData(null);
    };

    if (selectedChat?.chatType === 4 && isVoiceActive && voiceRoomData && !userLeftVoiceManually) {
        return (
            <VoiceChat
                roomId={voiceRoomData.roomId}
                userName={voiceRoomData.userName}
                userId={voiceRoomData.userId}
                serverId={voiceRoomData.serverId}
                autoJoin={true}
                onLeave={handleManualLeave}
            />
        );
    }

    if (leftVoiceChannel) {
        return (
            <div className="left-voice-channel-message" style={{textAlign: 'center', marginTop: '40px', color: '#888'}}>
                <h3>Вы покинули голосовой канал</h3>
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