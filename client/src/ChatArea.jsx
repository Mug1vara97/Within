import React, { useEffect } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
// import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom, setShowVoiceUI, leaveVoiceRoom } = useVoiceChat();

    useEffect(() => {
        if (selectedChat?.chatType === 4) {
            // Входим в голосовой канал
            joinVoiceRoom({
                roomId: selectedChat.chatId,
                userName: username,
                userId: userId,
                serverId: serverId,
                leaveVoiceRoom: () => {
                    // Функция для выхода из голосового канала
                    leaveVoiceRoom();
                }
            });
            setShowVoiceUI(true);
        } else {
            // Если переключились на не-голосовой канал, очищаем состояние
            if (isVoiceChatActive) {
                console.log('Switching to non-voice channel, leaving voice room...');
                leaveVoiceRoom();
            }
            setShowVoiceUI(false);
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom, setShowVoiceUI, isVoiceChatActive, leaveVoiceRoom]);

    if (selectedChat) {
        // Если это голосовой канал (chatType === 4) и голосовой чат активен
        if (selectedChat.chatType === 4 && isVoiceChatActive && voiceRoom) {
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