import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
// import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom, setShowVoiceUI, leaveVoiceRoom } = useVoiceChat();

    useEffect(() => {
        // Если пользователь переключился на другой сервер, но находится в голосовом звонке
        if (isVoiceChatActive && voiceRoom && voiceRoom.serverId !== serverId) {
            // Не покидаем звонок, но скрываем UI для текущего сервера
            setShowVoiceUI(false);
        }
        // Если пользователь находится в голосовом канале текущего сервера
        else if (selectedChat?.chatType === 4) {
            joinVoiceRoom({
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId
            });
            setShowVoiceUI(true);
        } else {
            setShowVoiceUI(false);
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom, setShowVoiceUI, isVoiceChatActive, voiceRoom, leaveVoiceRoom]);

    // Показываем VoiceChat только когда пользователь находится в голосовом канале текущего сервера
    if (selectedChat?.chatType === 4 && isVoiceChatActive && voiceRoom && voiceRoom.serverId === serverId) {
        return (
            <div 
              id="voicechat-root" 
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            />
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