import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerPage from './ServerPage';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useVoiceChat } from './contexts/VoiceChatContext';
import VoiceChat from './VoiceChat';
import GroupChat from './Chats/GroupChat';

const Home = ({ user }) => {
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { joinVoiceRoom, leaveVoiceRoom, voiceRoom, isVoiceChatActive } = useVoiceChat();
    
    // Состояние для отображения сообщения о выходе из голосового канала
    const [leftVoiceChannel, setLeftVoiceChannel] = useState(false);
    const [userLeftVoiceManually, setUserLeftVoiceManually] = useState(false);
    
    // Обработчик подключения к голосовому каналу
    const handleJoinVoiceChannel = (data) => {
        joinVoiceRoom(data);
        setLeftVoiceChannel(false);
        setUserLeftVoiceManually(false);
    };
    
    // Обработчик выхода из голосового канала
    const handleLeaveVoiceChannel = () => {
        leaveVoiceRoom();
        setLeftVoiceChannel(true);
        setUserLeftVoiceManually(true);
        
        // Сбрасываем флаг через 5 секунд
        setTimeout(() => {
            setLeftVoiceChannel(false);
        }, 5000);
    };

    // Синхронизируем состояние с текущим маршрутом
    useEffect(() => {
        if ((location.pathname === '/discover' || location.pathname === '/discover/servers') && !isDiscoverMode) {
            setIsDiscoverMode(true);
        } else if (!location.pathname.startsWith('/discover') && isDiscoverMode) {
            setIsDiscoverMode(false);
        }
    }, [location.pathname, isDiscoverMode]);

    const handleDiscoverModeChange = (mode) => {
        setIsDiscoverMode(mode);
        if (!mode) {
            navigate('/channels/@me');
        }
    };

    // Компонент для отображения сообщения о выходе из голосового канала
    const LeftVoiceChannelMessage = () => (
        <div className="left-voice-channel-message" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#36393f',
            color: '#dcddde',
            padding: '10px 15px',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            zIndex: 1000
        }}>
            <h3>Вы покинули голосовой канал</h3>
        </div>
    );

    // Компонент для отображения UI голосового канала
    const VoiceChannelUI = ({ selectedChat }) => (
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
                onClick={handleLeaveVoiceChannel}
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

    return (
        <div className="home-container">
            <ServerList 
                userId={user?.userId} 
                onDiscoverClick={handleDiscoverModeChange}
            />
            
            <div className="main-content">
                {isDiscoverMode ? (
                    <Routes>
                        <Route path="/discover" element={<DiscoverLists userId={user?.userId} onBack={() => handleDiscoverModeChange(false)} />} />
                        <Route path="/discover/servers" element={<DiscoverLists userId={user?.userId} onBack={() => handleDiscoverModeChange(false)} />} />
                    </Routes>
                ) : (
                    <>
                        <Routes>
                            <Route path="/channels/@me/:chatId?" element={
                                <ChatListWrapper 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    userLeftVoiceManually={userLeftVoiceManually}
                                    renderVoiceUI={(selectedChat) => <VoiceChannelUI selectedChat={selectedChat} />}
                                />
                            } />
                            <Route path="/channels/:serverId/:chatId?" element={
                                <ServerPageWrapper 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    userLeftVoiceManually={userLeftVoiceManually}
                                    renderVoiceUI={(selectedChat) => <VoiceChannelUI selectedChat={selectedChat} />}
                                />
                            } />
                        </Routes>
                        
                        {/* Глобальный голосовой чат (без UI) */}
                        {isVoiceChatActive && voiceRoom && (
                            <VoiceChat
                                roomId={voiceRoom.roomId}
                                userName={voiceRoom.userName}
                                userId={voiceRoom.userId}
                                serverId={voiceRoom.serverId}
                                autoJoin={true}
                                showUI={false}
                                onLeave={handleLeaveVoiceChannel}
                            />
                        )}
                        
                        {/* Сообщение о выходе из голосового канала */}
                        {leftVoiceChannel && <LeftVoiceChannelMessage />}
                    </>
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user, onJoinVoiceChannel, userLeftVoiceManually, renderVoiceUI }) => {
    const { chatId } = useParams();
    const chatListRef = useRef(null);
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ChatList
    const handleChatSelected = (chat) => {
        if (chat) {
            setSelectedChat({
                chatId: chat.chat_id,
                groupName: chat.username,
                chatType: chat.isGroupChat ? 2 : 1
            });
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 && !userLeftVoiceManually) {
                onJoinVoiceChannel({
                    roomId: chat.chat_id,
                    userName: user.username,
                    userId: user.userId
                });
            }
        }
    };
    
    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div style={{ width: '240px', borderRight: '1px solid #2f3136' }}>
                <ChatList 
                    userId={user?.userId} 
                    username={user?.username} 
                    initialChatId={chatId}
                    ref={chatListRef}
                    onChatSelected={handleChatSelected}
                />
            </div>
            <div style={{ flex: 1, height: '100%' }}>
                {selectedChat ? (
                    selectedChat.chatType === 4 && !userLeftVoiceManually ? (
                        renderVoiceUI(selectedChat)
                    ) : (
                        <GroupChat
                            username={user?.username}
                            userId={user?.userId}
                            chatId={selectedChat.chatId}
                            groupName={selectedChat.groupName}
                            isServerChat={false}
                        />
                    )
                ) : (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#8e9297'
                    }}>
                        <h3>Выберите чат для начала общения</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

const ServerPageWrapper = ({ user, onJoinVoiceChannel, userLeftVoiceManually, renderVoiceUI }) => {
    const { serverId, chatId } = useParams();
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ServerPage
    const handleChatSelected = (chat) => {
        if (chat) {
            setSelectedChat(chat);
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 && !userLeftVoiceManually) {
                onJoinVoiceChannel({
                    roomId: chat.chatId,
                    userName: user.username,
                    userId: user.userId,
                    serverId: serverId
                });
            }
        }
    };
    
    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <ServerPage
                username={user?.username}
                userId={user?.userId}
                serverId={serverId}
                initialChatId={chatId}
                onChatSelected={handleChatSelected}
            />
            
            <div className="server-content" style={{ flex: 1, height: '100%' }}>
                {selectedChat ? (
                    selectedChat.chatType === 4 && !userLeftVoiceManually ? (
                        renderVoiceUI(selectedChat)
                    ) : (
                        <GroupChat
                            username={user?.username}
                            userId={user?.userId}
                            chatId={selectedChat.chatId}
                            groupName={selectedChat.groupName}
                            isServerChat={true}
                            serverId={serverId}
                            userPermissions={selectedChat.userPermissions}
                            isServerOwner={selectedChat.isServerOwner}
                        />
                    )
                ) : (
                    <div className="no-chat-selected" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#8e9297'
                    }}>
                        <h3>Выберите чат для начала общения</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;