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
    
    // Состояния мьюта для UserPanel (инициализируются из localStorage)
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('localMuted');
        return saved ? JSON.parse(saved) : false;
    });
    const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('localAudioEnabled');
        return saved ? JSON.parse(saved) : true;
    });
    
    // Состояние для отслеживания пользователей в голосовых каналах
    const [voiceChannelUsers, setVoiceChannelUsers] = useState({});
    
    // Состояние для выбранного чата на сервере (нужно для правильной логики отображения VoiceChat)
    const [selectedServerChat, setSelectedServerChat] = useState(null);
    
    // Локальные настройки для кнопок (независимые от активного голосового чата)
    const [localMuted, setLocalMuted] = useState(() => {
        const saved = localStorage.getItem('localMuted');
        return saved ? JSON.parse(saved) : false;
    });
    const [localAudioEnabled, setLocalAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('localAudioEnabled');
        return saved ? JSON.parse(saved) : true;
    });
    
    // Определяем, отображается ли VoiceChat в основной области (только для серверов)
    const isVoiceChatVisible = useMemo(() => {
        console.log('🔍 isVoiceChatVisible calculation:', { 
            voiceRoom: !!voiceRoom, 
            pathname: location.pathname,
            voiceRoomData: voiceRoom,
            selectedServerChat
        });
        
        if (!voiceRoom) {
            console.log('No voice room - hiding voice chat');
            return false;
        }
        
        // В личных сообщениях голосовой чат всегда скрыт (даже если подключен к серверному каналу)
        if (location.pathname.startsWith('/channels/@me')) {
            console.log('Personal messages - hiding voice chat');
            return false;
        }
        
        // На серверах проверяем соответствие маршрута голосовому каналу
        if (location.pathname.startsWith('/channels/')) {
            const pathParts = location.pathname.split('/');
            const serverId = pathParts[2];
            
            // Проверяем что это не личные сообщения (serverId не должен быть @me)
            if (serverId === '@me') {
                console.log('Personal messages detected by serverId - hiding voice chat');
                return false;
            }
            
            // Проверяем что мы на том же сервере
            const onSameServer = voiceRoom.serverId && String(voiceRoom.serverId) === String(serverId);
            if (!onSameServer) {
                console.log('Not on same server as voice room');
                return false;
            }
            
            // Если выбран текстовый канал - скрываем голосовой чат
            if (selectedServerChat && (selectedServerChat.chatType === 3 || selectedServerChat.typeId === 3)) {
                console.log('Text channel selected - hiding voice chat');
                return false;
            }
            
            // Показываем голосовой чат если:
            // 1. Выбран голосовой канал ИЛИ
            // 2. Не выбран никакой канал, но подключен к голосовому
            const isVisible = !selectedServerChat || (selectedServerChat.chatType === 4 || selectedServerChat.typeId === 4);
            
            console.log('Server voice chat visibility check:', { 
                serverId, 
                voiceRoomId: voiceRoom.roomId, 
                voiceServerId: voiceRoom.serverId,
                serverIdMatch: onSameServer,
                selectedServerChat,
                selectedChatType: selectedServerChat?.chatType || selectedServerChat?.typeId,
                isVisible 
            });
            return isVisible;
        }
        
        console.log('Default case - hiding voice chat');
        return false;
    }, [voiceRoom, location.pathname, selectedServerChat]);
    
    console.log('🎙️ Final isVoiceChatVisible:', isVoiceChatVisible);
    
    // Ref для VoiceChat
    const voiceChatRef = useRef(null);
    
    // Обработчик подключения к голосовому каналу
    const handleJoinVoiceChannel = (data) => {
        setVoiceRoom(data);
        setLeftVoiceChannel(false);
    };
    
    // Обработчик выхода из голосового канала
    const handleLeaveVoiceChannel = () => {
        setVoiceRoom(null);
        setLeftVoiceChannel(true);
        // НЕ сбрасываем состояния мьюта - сохраняем пользовательские настройки
        // setIsMuted(false);
        // setIsAudioEnabled(true);
        
        // Убираем автоматический сброс - надпись будет висеть до переключения
    };
    
    // Функции управления мьютом для UserPanel
    const handleToggleMute = () => {
        if (voiceRoom && voiceChatRef.current && voiceChatRef.current.handleMute) {
            // Если в голосовом чате - управляем реальным мьютом
            voiceChatRef.current.handleMute();
        } else {
            // Если не в голосовом чате - управляем локальным состоянием
            setLocalMuted(!localMuted);
        }
    };
    
    const handleToggleAudio = () => {
        if (voiceRoom && voiceChatRef.current && voiceChatRef.current.toggleAudio) {
            // Если в голосовом чате - управляем реальным звуком
            voiceChatRef.current.toggleAudio();
        } else {
            // Если не в голосовом чате - управляем локальным состоянием
            setLocalAudioEnabled(!localAudioEnabled);
        }
    };
    
    // Коллбеки для получения состояний от VoiceChat
    const handleMuteStateChange = (muted) => {
        setIsMuted(muted);
    };
    
    const handleAudioStateChange = (enabled) => {
        setIsAudioEnabled(enabled);
    };

    // Коллбек для обновления данных о пользователях в голосовом канале
    const handleVoiceChannelUsersChange = (roomId, users) => {
        setVoiceChannelUsers(prev => ({
            ...prev,
            [roomId]: users
        }));
    };



    // Сохраняем состояние голосового чата в localStorage
    useEffect(() => {
        if (voiceRoom) {
            localStorage.setItem('voiceRoom', JSON.stringify(voiceRoom));
        } else {
            localStorage.removeItem('voiceRoom');
        }
    }, [voiceRoom]);
    
    // Сохраняем локальные настройки в localStorage
    useEffect(() => {
        localStorage.setItem('localMuted', JSON.stringify(localMuted));
        // Синхронизируем с основными состояниями если не в голосовом чате
        if (!voiceRoom) {
            setIsMuted(localMuted);
        }
    }, [localMuted, voiceRoom]);
    
    useEffect(() => {
        localStorage.setItem('localAudioEnabled', JSON.stringify(localAudioEnabled));
        // Синхронизируем с основными состояниями если не в голосовом чате
        if (!voiceRoom) {
            setIsAudioEnabled(localAudioEnabled);
        }
    }, [localAudioEnabled, voiceRoom]);

    // Синхронизируем состояние с текущим маршрутом
    useEffect(() => {
        if ((location.pathname === '/discover' || location.pathname === '/discover/servers') && !isDiscoverMode) {
            setIsDiscoverMode(true);
        } else if (!location.pathname.startsWith('/discover') && isDiscoverMode) {
            setIsDiscoverMode(false);
        }
    }, [location.pathname, isDiscoverMode]);
    
    // Сбрасываем выбранный чат сервера при изменении маршрута
    useEffect(() => {
        // Всегда сбрасываем при смене маршрута для упрощения логики
        setSelectedServerChat(null);
    }, [location.pathname]);

    const handleDiscoverModeChange = (mode) => {
        setIsDiscoverMode(mode);
        if (!mode) {
            navigate('/channels/@me');
        }
    };



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
                                    leftVoiceChannel={leftVoiceChannel}
                                    setLeftVoiceChannel={setLeftVoiceChannel}
                                    isMuted={voiceRoom ? isMuted : localMuted}
                                    isAudioEnabled={voiceRoom ? isAudioEnabled : localAudioEnabled}
                                    onToggleMute={handleToggleMute}
                                    onToggleAudio={handleToggleAudio}
                                />
                            } />
                            <Route path="/channels/:serverId/:chatId?" element={
                                <ServerPageWrapper 
                                    user={user} 
                                    onJoinVoiceChannel={handleJoinVoiceChannel}
                                    voiceRoom={voiceRoom}
                                    isVoiceChatVisible={isVoiceChatVisible}
                                    leftVoiceChannel={leftVoiceChannel}
                                    setLeftVoiceChannel={setLeftVoiceChannel}
                                    isMuted={voiceRoom ? isMuted : localMuted}
                                    isAudioEnabled={voiceRoom ? isAudioEnabled : localAudioEnabled}
                                    onToggleMute={handleToggleMute}
                                    onToggleAudio={handleToggleAudio}
                                    voiceChannelUsers={voiceChannelUsers}
                                    onServerChatSelected={setSelectedServerChat}
                                />
                            } />
                        </Routes>
                        

                        
                        {/* Единственный VoiceChat - позиционируется динамически */}
                        {voiceRoom && (
                            <VoiceChat
                                ref={voiceChatRef}
                                key={`${voiceRoom.roomId}-${voiceRoom.serverId || 'direct'}-unified`}
                                roomId={voiceRoom.roomId}
                                roomName={voiceRoom.roomName}
                                userName={voiceRoom.userName}
                                userId={voiceRoom.userId}
                                serverId={voiceRoom.serverId}
                                autoJoin={true}
                                showUI={true}
                                isVisible={isVoiceChatVisible}
                                onLeave={handleLeaveVoiceChannel}
                                onMuteStateChange={handleMuteStateChange}
                                onAudioStateChange={handleAudioStateChange}
                                initialMuted={localMuted}
                                initialAudioEnabled={localAudioEnabled}
                                onVoiceChannelUsersChange={handleVoiceChannelUsersChange}
                            />
                        )}                       

                    </>
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user, onJoinVoiceChannel, voiceRoom, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio }) => {
    console.log('📱 ChatListWrapper rendering:', { voiceRoom: !!voiceRoom, leftVoiceChannel });
    // Компонент для отображения сообщения о выходе из голосового канала
    const LeftVoiceChannelComponent = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: '#36393f',
            color: '#dcddde'
        }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600' }}>
                Вы покинули голосовой канал
            </h2>
            <p style={{ margin: 0, fontSize: '16px', color: '#8e9297' }}>
                Выберите голосовой канал для подключения
            </p>
        </div>
    );
    const { chatId } = useParams();
    const chatListRef = useRef(null);
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ChatList
    const handleChatSelected = (chat) => {
        if (chat) {
            setSelectedChat({
                chatId: chat.chat_id,
                groupName: chat.username,
                chatType: chat.isGroupChat ? 2 : 1,
                typeId: chat.chatType
            });
            
            // Убираем надпись о выходе из голосового канала при выборе любого чата
            setLeftVoiceChannel(false);
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 || chat.typeId === 4) {
                onJoinVoiceChannel({
                    roomId: chat.chat_id,
                    roomName: chat.username || chat.name, // Добавляем название комнаты
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
                    voiceRoom={voiceRoom}
                    isMuted={isMuted}
                    isAudioEnabled={isAudioEnabled}
                    onToggleMute={onToggleMute}
                    onToggleAudio={onToggleAudio}
                />
            </div>
            <div style={{ flex: 1, width: 'calc(100% - 240px)', height: '100%' }}>
                {/* Приоритет 1: Сообщение о выходе из голосового канала */}
                {leftVoiceChannel && !voiceRoom ? (
                    <LeftVoiceChannelComponent />
                ) : (
                    <>

                        
                        {/* Показываем GroupChat если есть выбранный чат */}
                        {selectedChat && (
                            <GroupChat
                                username={user?.username}
                                userId={user?.userId}
                                chatId={selectedChat.chatId}
                                groupName={selectedChat.groupName || selectedChat.name}
                                isServerChat={false}
                            />
                        )}
                        
                        {/* Показываем заглушку если нет выбранного чата */}
                        {!selectedChat && (
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
                    </>
                )}
            </div>
        </div>
    );
};

const ServerPageWrapper = ({ user, onJoinVoiceChannel, voiceRoom, isVoiceChatVisible, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio, voiceChannelUsers, onServerChatSelected }) => {
    console.log('🖥️ ServerPageWrapper rendering:', { voiceRoom: !!voiceRoom, isVoiceChatVisible, leftVoiceChannel });
    // Компонент для отображения сообщения о выходе из голосового канала
    const LeftVoiceChannelComponent = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: '#36393f',
            color: '#dcddde'
        }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600' }}>
                Вы покинули голосовой канал
            </h2>
            <p style={{ margin: 0, fontSize: '16px', color: '#8e9297' }}>
                Выберите голосовой канал для подключения
            </p>
        </div>
    );
    const { serverId, chatId } = useParams();
    const [selectedChat, setSelectedChat] = useState(null);
    
    // Обработчик для получения выбранного чата из ServerPage
    const handleChatSelected = (chat) => {
        if (chat) {
            setSelectedChat(chat);
            // Добавляем serverId к данным чата для правильной логики сброса
            onServerChatSelected({
                ...chat,
                serverId: serverId
            });
            
            // Убираем надпись о выходе из голосового канала при выборе любого чата
            setLeftVoiceChannel(false);
            
            // Если это голосовой канал, подключаемся к нему
            if (chat.chatType === 4 || chat.typeId === 4) {
                onJoinVoiceChannel({
                    roomId: chat.chatId,
                    roomName: chat.groupName, // Название голосового канала это groupName
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
                    voiceRoom={voiceRoom}
                    isMuted={isMuted}
                    isAudioEnabled={isAudioEnabled}
                    onToggleMute={onToggleMute}
                    onToggleAudio={onToggleAudio}
                    voiceChannelUsers={voiceChannelUsers}
                />
            </div>
            
            <div className="server-content" style={{ flex: 1, width: 'calc(100% - 240px)', height: '100%' }}>
                {/* Приоритет 1: Сообщение о выходе из голосового канала */}
                {leftVoiceChannel && !voiceRoom ? (
                    <LeftVoiceChannelComponent />
                ) : (
                    <>
                        {/* Контейнер для VoiceChat на сервере */}
                        <div id="voice-chat-container-server" style={{ 
                            width: '100%', 
                            height: '100%',
                            display: isVoiceChatVisible ? 'block' : 'none'
                        }} />
                        
                        {/* Показываем GroupChat если есть выбранный чат И голосовой чат не видимый */}
                        {selectedChat && !isVoiceChatVisible && (
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
                        
                        {/* Показываем заглушку если нет выбранного чата и голосовой чат не видимый */}
                        {!selectedChat && !isVoiceChatVisible && (
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
                    </>
                )}
            </div>
        </div>
    );
};

export default Home;