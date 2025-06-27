import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerSidebar from './ServerSidebar';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useVoiceChat } from './contexts/VoiceChatContext';
import VoiceChat from './VoiceChat';
import GroupChat from './Chats/GroupChat';
import { BASE_URL } from './config/apiConfig';
import { HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';

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
                                <DirectMessagesContent 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    onLeaveVoiceChannel={handleLeaveVoiceChannel}
                                    userLeftVoiceManually={userLeftVoiceManually}
                                    VoiceChannelUI={VoiceChannelUI}
                                />
                            } />
                            <Route path="/channels/:serverId/:chatId?" element={
                                <ServerContent 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    onLeaveVoiceChannel={handleLeaveVoiceChannel}
                                    userLeftVoiceManually={userLeftVoiceManually}
                                    VoiceChannelUI={VoiceChannelUI}
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

// Компонент для личных сообщений
const DirectMessagesContent = ({ user, onJoinVoiceChannel, onLeaveVoiceChannel, userLeftVoiceManually, VoiceChannelUI }) => {
    const { chatId } = useParams();
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [connection, setConnection] = useState(null);
    const connectionRef = useRef(null);
    
    // Эффект для установки соединения с хабом чатов
    useEffect(() => {
        const createConnection = async () => {
            if (connectionRef.current) {
                await connectionRef.current.stop();
            }

            const newConnection = new HubConnectionBuilder()
                .withUrl(`${BASE_URL}/chatlisthub?userId=${user.userId}`, {
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Debug)
                .build();

            try {
                await newConnection.start();
                console.log('SignalR ChatListHub соединение установлено');
                connectionRef.current = newConnection;
                setConnection(newConnection);

                // Сразу после установки соединения запрашиваем чаты
                await newConnection.invoke("GetUserChats", user.userId);
            } catch (err) {
                console.error('Ошибка подключения к ChatListHub:', err);
            }
        };

        if (user?.userId) {
            createConnection();
        }

        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop();
            }
        };
    }, [user?.userId]);

    // Подписка на события SignalR
    useEffect(() => {
        if (!connection) return;

        const handleReceiveChats = (receivedChats) => {
            if (Array.isArray(receivedChats)) {
                const sortedChats = [...receivedChats].sort((a, b) => {
                    const timeA = new Date(a.lastMessageTime).getTime();
                    const timeB = new Date(b.lastMessageTime).getTime();
                    return timeB - timeA;
                });
                setChats(sortedChats);
                
                // Если есть chatId в URL и список чатов загружен, выбираем соответствующий чат
                if (chatId && !selectedChat) {
                    const chatToSelect = sortedChats.find(chat => chat.chat_id === parseInt(chatId));
                    if (chatToSelect) {
                        setSelectedChat({
                            chatId: chatToSelect.chat_id,
                            groupName: chatToSelect.username,
                            chatType: chatToSelect.isGroupChat ? 2 : 1
                        });
                    }
                }
            }
        };

        connection.on("ReceiveChats", handleReceiveChats);
        
        return () => {
            connection.off("ReceiveChats", handleReceiveChats);
        };
    }, [connection, chatId, selectedChat]);

    // Обработчик выбора чата
    const handleChatSelect = (chat) => {
        setSelectedChat({
            chatId: chat.chat_id,
            groupName: chat.username,
            chatType: chat.isGroupChat ? 2 : 1
        });
    };

    return (
        <div className="direct-messages-content" style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div className="sidebar" style={{ width: '240px', borderRight: '1px solid #2f3136' }}>
                <ChatList 
                    userId={user?.userId}
                    username={user?.username}
                    chats={chats}
                    onChatSelect={handleChatSelect}
                    connection={connection}
                />
            </div>
            <div className="chat-content" style={{ flex: 1, height: '100%' }}>
                {selectedChat ? (
                    selectedChat.chatType === 4 && !userLeftVoiceManually ? (
                        <VoiceChannelUI selectedChat={selectedChat} />
                    ) : (
                        <GroupChat
                            username={user?.username}
                            userId={user?.userId}
                            chatId={selectedChat.chatId}
                            groupName={selectedChat.groupName}
                            isServerChat={false}
                            chatListConnection={connection}
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

// Компонент для серверных чатов
const ServerContent = ({ user, onJoinVoiceChannel, onLeaveVoiceChannel, userLeftVoiceManually, VoiceChannelUI }) => {
    const { serverId, chatId } = useParams();
    const [server, setServer] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const [userPermissions, setUserPermissions] = useState({});
    const [isServerOwner, setIsServerOwner] = useState(false);
    const [connection, setConnection] = useState(null);
    
    // Загрузка данных сервера
    useEffect(() => {
        const fetchServerData = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/server/${serverId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setServer(data);
                    setIsServerOwner(data.ownerId === user.userId);
                    
                    // Если есть chatId в URL, выбираем соответствующий чат
                    if (chatId) {
                        const foundChat = data.categories
                            .flatMap(cat => cat.chats)
                            .find(c => c.chatId === parseInt(chatId));
                        
                        if (foundChat) {
                            setSelectedChat(foundChat);
                            
                            // Если это голосовой канал, подключаемся к нему
                            if (foundChat.chatType === 4 && !userLeftVoiceManually) {
                                onJoinVoiceChannel({
                                    roomId: foundChat.chatId,
                                    userName: user.username,
                                    userId: user.userId,
                                    serverId: serverId
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching server data:', error);
            }
        };
        
        if (serverId && user?.userId) {
            fetchServerData();
        }
    }, [serverId, chatId, user?.userId, user?.username, onJoinVoiceChannel, userLeftVoiceManually]);

    // Установка соединения с хабом сервера
    useEffect(() => {
        const setupConnection = async () => {
            const newConnection = new HubConnectionBuilder()
                .withUrl(`${BASE_URL}/serverhub`, {
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets,
                    accessTokenFactory: () => localStorage.getItem('token')
                })
                .configureLogging(LogLevel.Information)
                .withAutomaticReconnect()
                .build();
                
            try {
                await newConnection.start();
                console.log('SignalR connected:', newConnection.state);
                
                await newConnection.invoke("JoinServerGroup", serverId.toString());
                console.log('Joined server group:', serverId);
                
                setConnection(newConnection);
                
                // Загрузка прав пользователя
                await loadUserPermissions();
            } catch (error) {
                console.error('Connection failed:', error);
            }
        };
        
        if (serverId) {
            setupConnection();
        }
        
        return () => {
            if (connection) {
                connection.stop();
            }
        };
    }, [serverId]);
    
    // Загрузка прав пользователя
    const loadUserPermissions = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/role/user-permissions/${serverId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const permissions = await response.json();
                setUserPermissions(permissions);
            }
        } catch (error) {
            console.error('Error loading user permissions:', error);
        }
    };
    
    // Обработчик выбора чата
    const handleChatSelect = (chat) => {
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
    };

    return (
        <div className="server-content" style={{ display: 'flex', width: '100%', height: '100%' }}>
            <ServerSidebar 
                server={server} 
                onChatSelect={handleChatSelect} 
                selectedChat={selectedChat}
                userPermissions={userPermissions}
                isServerOwner={isServerOwner}
            />
            <div className="chat-content" style={{ flex: 1, height: '100%' }}>
                {selectedChat ? (
                    selectedChat.chatType === 4 && !userLeftVoiceManually ? (
                        <VoiceChannelUI selectedChat={selectedChat} />
                    ) : (
                        <GroupChat
                            username={user?.username}
                            userId={user?.userId}
                            chatId={selectedChat.chatId}
                            groupName={selectedChat.groupName}
                            isServerChat={true}
                            serverId={serverId}
                            userPermissions={userPermissions}
                            isServerOwner={isServerOwner}
                            onLeaveVoiceChat={onLeaveVoiceChannel}
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