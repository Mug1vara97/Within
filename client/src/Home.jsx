import React, { useState, useEffect, useRef, useMemo } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerPage from './ServerPage';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import VoiceChat from './VoiceChat';
import GroupChat from './Chats/GroupChat';

const Home = ({ user }) => {
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [voiceRoom, setVoiceRoom] = useState(() => {
        // Восстанавливаем состояние голосового чата из localStorage
        const savedVoiceRoom = localStorage.getItem('voiceRoom');
        try {
            return savedVoiceRoom ? JSON.parse(savedVoiceRoom) : null;
        } catch (error) {
            console.error('Ошибка при восстановлении состояния голосового чата:', error);
            return null;
        }
    });
    
    // Состояние для отображения сообщения о выходе из голосового канала
    const [leftVoiceChannel, setLeftVoiceChannel] = useState(false);
    
    // Определяем, отображается ли VoiceChat в основной области
    const isVoiceChatVisible = useMemo(() => {
        if (!voiceRoom) {
            console.log('isVoiceChatVisible: false - no voiceRoom');
            return false;
        }
        
        console.log('Checking voice chat visibility:', {
            voiceRoom,
            pathname: location.pathname
        });
        
        // Проверяем, соответствует ли текущий маршрут голосовому каналу
        if (location.pathname.startsWith('/channels/@me/')) {
            const chatId = location.pathname.split('/').pop();
            const result = chatId && voiceRoom.roomId === chatId;
            console.log('Direct message voice check:', { chatId, roomId: voiceRoom.roomId, result });
            return result;
        } else if (location.pathname.startsWith('/channels/')) {
            const pathParts = location.pathname.split('/');
            const serverId = pathParts[2];
            const chatId = pathParts[3];
            const result = chatId && voiceRoom.roomId === chatId && voiceRoom.serverId === serverId;
            console.log('Server voice check:', { 
                serverId, 
                chatId, 
                roomId: voiceRoom.roomId, 
                voiceServerId: voiceRoom.serverId, 
                result 
            });
            return result;
        }
        
        console.log('isVoiceChatVisible: false - no matching path');
        return false;
    }, [voiceRoom, location.pathname]);
    
    // Обработчик подключения к голосовому каналу
    const handleJoinVoiceChannel = (data) => {
        console.log('Joining voice channel with data:', data);
        setVoiceRoom(data);
        setLeftVoiceChannel(false);
    };
    
    // Обработчик выхода из голосового канала
    const handleLeaveVoiceChannel = () => {
        console.log('Leaving voice channel');
        setVoiceRoom(null);
        setLeftVoiceChannel(true);
        
        // Сбрасываем флаг через 5 секунд
        setTimeout(() => {
            setLeftVoiceChannel(false);
        }, 5000);
    };

    // Сохраняем состояние голосового чата в localStorage
    useEffect(() => {
        if (voiceRoom) {
            localStorage.setItem('voiceRoom', JSON.stringify(voiceRoom));
        } else {
            localStorage.removeItem('voiceRoom');
        }
    }, [voiceRoom]);

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

    return (
        <div className="home-container">
            <ServerList 
                userId={user?.userId} 
                onDiscoverClick={handleDiscoverModeChange}
            />
            
            <div className="main-content" style={{ width: '100%', display: 'flex' }}>
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
                                    voiceRoom={voiceRoom}
                                    onLeaveVoiceChannel={handleLeaveVoiceChannel}
                                    isVoiceChatVisible={isVoiceChatVisible}
                                />
                            } />
                            <Route path="/channels/:serverId/:chatId?" element={
                                <ServerPageWrapper 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    voiceRoom={voiceRoom}
                                    onLeaveVoiceChannel={handleLeaveVoiceChannel}
                                    isVoiceChatVisible={isVoiceChatVisible}
                                />
                            } />
                        </Routes>
                        
                        {/* Сообщение о выходе из голосового канала */}
                        {leftVoiceChannel && <LeftVoiceChannelMessage />}
                        
                        {/* Фоновый VoiceChat - работает когда подключен к голосовому каналу, но не просматривает его */}
                        {voiceRoom && !isVoiceChatVisible && (
                            <div style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                zIndex: -1,
                                visibility: 'hidden',
                                display: 'none'
                            }}>
                                <VoiceChat
                                    key={`${voiceRoom.roomId}-${voiceRoom.serverId || 'direct'}-background`}
                                    roomId={voiceRoom.roomId}
                                    userName={voiceRoom.userName}
                                    userId={voiceRoom.userId}
                                    serverId={voiceRoom.serverId}
                                    autoJoin={true}
                                    showUI={false}
                                    onLeave={handleLeaveVoiceChannel}
                                />
                            </div>
                        )}                       

                    </>
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user, onJoinVoiceChannel, voiceRoom, onLeaveVoiceChannel, isVoiceChatVisible }) => {
    const { chatId } = useParams();
    const chatListRef = useRef(null);
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ChatList
    const handleChatSelected = (chat) => {
        console.log('Home ChatListWrapper handleChatSelected received:', chat);
        
        if (chat) {
            setSelectedChat({
                chatId: chat.chat_id,
                groupName: chat.username,
                chatType: chat.isGroupChat ? 2 : 1,
                typeId: chat.chatType
            });
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 || chat.typeId === 4) {
                console.log('Connecting to voice channel:', chat);
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
            <div style={{ width: '240px', minWidth: '240px', borderRight: '1px solid #2f3136' }}>
                <ChatList 
                    userId={user?.userId} 
                    username={user?.username} 
                    initialChatId={chatId}
                    ref={chatListRef}
                    onChatSelected={handleChatSelected}
                />
            </div>
            <div style={{ flex: 1, width: 'calc(100% - 240px)', height: '100%' }}>
                {/* Показываем VoiceChat если это голосовой канал и он видимый */}
                {voiceRoom && isVoiceChatVisible && !voiceRoom.serverId && (
                    <VoiceChat
                        key={`${voiceRoom.roomId}-direct`}
                        roomId={voiceRoom.roomId}
                        userName={voiceRoom.userName}
                        userId={voiceRoom.userId}
                        serverId={voiceRoom.serverId}
                        autoJoin={true}
                        showUI={true}
                        onLeave={onLeaveVoiceChannel}
                    />
                )}
                
                {/* Показываем GroupChat если есть выбранный чат И это НЕ голосовой канал ИЛИ голосовой канал не видимый */}
                {selectedChat && (!voiceRoom || !isVoiceChatVisible || voiceRoom.serverId) && (
                    <GroupChat
                        username={user?.username}
                        userId={user?.userId}
                        chatId={selectedChat.chatId}
                        groupName={selectedChat.groupName || selectedChat.name}
                        isServerChat={false}
                    />
                )}
                
                {/* Показываем заглушку если нет выбранного чата и нет голосового чата */}
                {!selectedChat && !voiceRoom && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        width: '100%',
                        color: '#8e9297'
                    }}>
                        <h3>Выберите чат для начала общения</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

const ServerPageWrapper = ({ user, onJoinVoiceChannel, voiceRoom, onLeaveVoiceChannel, isVoiceChatVisible }) => {
    const { serverId, chatId } = useParams();
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ServerPage
    const handleChatSelected = (chat) => {
        console.log('Home ServerPageWrapper handleChatSelected received:', chat);
        
        if (chat) {
            setSelectedChat(chat);
            console.log('Home ServerPageWrapper setSelectedChat with:', chat);
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 || chat.typeId === 4) {
                console.log('Connecting to voice channel:', chat);
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
            <div style={{ width: '240px', minWidth: '240px', borderRight: '1px solid #2f3136' }}>
                <ServerPage
                    username={user?.username}
                    userId={user?.userId}
                    serverId={serverId}
                    initialChatId={chatId}
                    onChatSelected={handleChatSelected}
                />
            </div>
            
            <div className="server-content" style={{ flex: 1, width: 'calc(100% - 240px)', height: '100%' }}>
                {/* Показываем VoiceChat если это серверный голосовой канал и он видимый */}
                {(() => {
                    console.log('ServerPageWrapper render check:', {
                        voiceRoom,
                        isVoiceChatVisible,
                        serverId,
                        voiceRoomServerId: voiceRoom?.serverId,
                        shouldShowVoiceChat: voiceRoom && isVoiceChatVisible && voiceRoom.serverId === serverId
                    });
                    return null;
                })()}
                {voiceRoom && isVoiceChatVisible && voiceRoom.serverId === serverId && (
                    <VoiceChat
                        key={`${voiceRoom.roomId}-${voiceRoom.serverId}`}
                        roomId={voiceRoom.roomId}
                        userName={voiceRoom.userName}
                        userId={voiceRoom.userId}
                        serverId={voiceRoom.serverId}
                        autoJoin={true}
                        showUI={true}
                        onLeave={onLeaveVoiceChannel}
                    />
                )}
                
                {/* Показываем GroupChat если есть выбранный чат И это НЕ голосовой канал ИЛИ голосовой канал не видимый */}
                {selectedChat && (!voiceRoom || !isVoiceChatVisible || voiceRoom.serverId !== serverId) && (
                    <GroupChat
                        username={user?.username}
                        userId={user?.userId}
                        chatId={selectedChat.chatId}
                        groupName={selectedChat.groupName || selectedChat.name}
                        isServerChat={true}
                        serverId={serverId}
                        userPermissions={selectedChat.userPermissions}
                        isServerOwner={selectedChat.isServerOwner}
                    />
                )}
                
                {/* Показываем заглушку если нет выбранного чата и нет голосового чата */}
                {!selectedChat && !(voiceRoom && voiceRoom.serverId === serverId) && (
                    <div className="no-chat-selected" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        width: '100%',
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