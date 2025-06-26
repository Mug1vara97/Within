import React, { useEffect, useState, useRef } from 'react';
import GroupChat from './Chats/GroupChat';
import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner, onJoinVoiceChannel, onLeaveVoiceChannel }) => {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceRoomData, setVoiceRoomData] = useState(null);
    const [leftVoiceChannel, setLeftVoiceChannel] = useState(false);
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
            // Проверяем, что это новый голосовой канал или первое подключение
            if (!voiceRoomData || voiceRoomData.roomId !== selectedChat.chatId) {
                const data = {
                    roomId: selectedChat.chatId,
                    userName: username,
                    userId: userId,
                    serverId: serverId
                };
                setVoiceRoomData(data);
                setIsVoiceActive(true);
                setLeftVoiceChannel(false);
                if (onJoinVoiceChannel) onJoinVoiceChannel(data);
            }
        }
    }, [selectedChat?.chatType, selectedChat?.chatId, username, userId, userLeftVoiceManually, onJoinVoiceChannel]);

    // Обработчик выхода из голосового чата вручную
    const handleManualLeave = () => {
        setUserLeftVoiceManually(true);
        setIsVoiceActive(false);
        setVoiceRoomData(null);
        if (onLeaveVoiceChannel) onLeaveVoiceChannel();
    };

    // Показываем VoiceChat только если мы находимся в голосовом канале
    if (selectedChat?.chatType === 4 && isVoiceActive && voiceRoomData && !userLeftVoiceManually) {
        return (
            <VoiceChat
                roomId={voiceRoomData.roomId}
                userName={voiceRoomData.userName}
                userId={voiceRoomData.userId}
                serverId={voiceRoomData.serverId}
                autoJoin={true}
                onLeave={handleManualLeave}
                showUI={true}
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

    // Если есть активный звонок, но мы не в голосовом канале,
    // добавляем VoiceChat с showUI={false} для работы в фоне
    const backgroundVoiceChat = isVoiceActive && voiceRoomData && !userLeftVoiceManually ? (
        <VoiceChat
            roomId={voiceRoomData.roomId}
            userName={voiceRoomData.userName}
            userId={voiceRoomData.userId}
            serverId={voiceRoomData.serverId}
            autoJoin={true}
            onLeave={handleManualLeave}
            showUI={false}
        />
    ) : null;

    if (selectedChat) {
        return (
            <>
                {backgroundVoiceChat}
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
            </>
        );
    }

    return (
        <>
            {backgroundVoiceChat}
            <div className="no-chat-selected">
                <h3>Select a chat to start messaging</h3>
            </div>
        </>
    );
};

export default ChatArea;