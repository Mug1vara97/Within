import React, { useEffect, useState, useCallback } from 'react';
import GroupChat from './Chats/GroupChat';
import { useVoiceChat } from './contexts/VoiceChatContext';
// import VoiceChat from './VoiceChat';

const ChatArea = ({ selectedChat, username, userId, serverId, userPermissions, isServerOwner }) => {
    const { joinVoiceRoom, isVoiceChatActive, voiceRoom, setShowVoiceUI } = useVoiceChat();
    const [voiceCallLeftManually, setVoiceCallLeftManually] = useState(false);

    // Сброс флага при смене канала
    useEffect(() => {
        if (selectedChat?.chatType !== 4) {
            setVoiceCallLeftManually(false);
        }
    }, [selectedChat]);

    // Автоматический join только если звонок неактивен и не был покинут вручную
    useEffect(() => {
        if (selectedChat?.chatType === 4) {
            if (!isVoiceChatActive && !voiceCallLeftManually) {
                joinVoiceRoom({
                    roomId: selectedChat.chatId,
                    userName: username,
                    userId: userId,
                    serverId: serverId
                });
                setShowVoiceUI(true);
            }
        } else {
            setShowVoiceUI(false);
        }
    }, [selectedChat, username, userId, serverId, joinVoiceRoom, setShowVoiceUI, isVoiceChatActive, voiceCallLeftManually]);

    // Callback для VoiceChat чтобы отметить ручной выход
    const handleVoiceChatLeave = useCallback(() => {
        setVoiceCallLeftManually(true);
    }, []);

    // Рендерим VoiceChat только если звонок активен
    if (isVoiceChatActive && voiceRoom) {
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

    // Для любого неактивного звонка (или текстового канала) показываем GroupChat
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
                onVoiceChatLeave={handleVoiceChatLeave}
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