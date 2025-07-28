import React, { useState, useEffect, useRef, useMemo } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerPage from './ServerPage';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import VoiceChat from './VoiceChat';
import GroupChat from './Chats/GroupChat';
import NotificationButton from './components/NotificationButton';
import { useNotifications } from './hooks/useNotifications';

const Home = ({ user }) => {
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { initializeForUser } = useNotifications();
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
    
    // Локальные настройки для кнопок (независимые от активного голосового чата)
    const [localMuted, setLocalMuted] = useState(() => {
        const saved = localStorage.getItem('localMuted');
        return saved ? JSON.parse(saved) : false;
    });
    const [localAudioEnabled, setLocalAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('localAudioEnabled');
        return saved ? JSON.parse(saved) : true;
    });
    
    // Определяем, отображается ли VoiceChat в основной области
    const isVoiceChatVisible = useMemo(() => {
        console.log('isVoiceChatVisible calculation:', { 
            voiceRoom: !!voiceRoom, 
            pathname: location.pathname,
            voiceRoomData: voiceRoom 
        });
        
        if (!voiceRoom) {
            console.log('No voice room - hiding voice chat');
            return false;
        }
        
        // Для личных сообщений (групповых чатов) показываем VoiceChat если есть активный звонок
        if (location.pathname.startsWith('/channels/@me')) {
            const pathParts = location.pathname.split('/');
            const chatId = pathParts[3];
            
            // Показываем VoiceChat если звонок активен в текущем чате
            const isVisible = chatId && String(voiceRoom.roomId) === String(chatId) && !voiceRoom.serverId;
            console.log('Personal messages voice chat visibility:', { chatId, voiceRoom, isVisible });
            return isVisible;
        }
        
        // На серверах проверяем соответствие маршрута голосовому каналу
        if (location.pathname.startsWith('/channels/')) {
            const pathParts = location.pathname.split('/');
            const serverId = pathParts[2];
            const chatId = pathParts[3];
            
            // Проверяем что это не личные сообщения (serverId не должен быть @me)
            if (serverId === '@me') {
                console.log('Personal messages detected by serverId - hiding voice chat');
                return false;
            }
            
            const isVisible = chatId && String(voiceRoom.roomId) === String(chatId) && String(voiceRoom.serverId) === String(serverId);
            console.log('Server voice chat visibility:', { serverId, chatId, voiceRoom, isVisible });
            return isVisible;
        }
        
        console.log('Default case - hiding voice chat');
        return false;
    }, [voiceRoom, location.pathname]);
    
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

    // Инициализация уведомлений при входе пользователя
    useEffect(() => {
        if (user.userId) {
            initializeForUser(user.userId);
        }
    }, [user.userId, initializeForUser]);

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
                                    onLeaveVoiceChannel={handleLeaveVoiceChannel}
                                    voiceRoom={voiceRoom}
                                    leftVoiceChannel={leftVoiceChannel}
                                    setLeftVoiceChannel={setLeftVoiceChannel}
                                    isMuted={voiceRoom ? isMuted : localMuted}
                                    isAudioEnabled={voiceRoom ? isAudioEnabled : localAudioEnabled}
                                    onToggleMute={handleToggleMute}
                                    onToggleAudio={handleToggleAudio}
                                    voiceChatRef={voiceChatRef}
                                    handleMuteStateChange={handleMuteStateChange}
                                    handleAudioStateChange={handleAudioStateChange}
                                    localMuted={localMuted}
                                    localAudioEnabled={localAudioEnabled}
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
                                />
                            } />
                        </Routes>
                        

                        
                        {/* VoiceChat для серверных звонков */}
                        {voiceRoom && voiceRoom.serverId && (
                            <VoiceChat
                                ref={voiceChatRef}
                                key={`${voiceRoom.roomId}-${voiceRoom.serverId}-server`}
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
                            />
                        )}                       

                    </>
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user, onJoinVoiceChannel, onLeaveVoiceChannel, voiceRoom, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio, voiceChatRef, handleMuteStateChange, handleAudioStateChange, localMuted, localAudioEnabled }) => {
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
                        {/* Контейнер для VoiceChat в групповых чатах */}
                        <div id="voice-chat-container-server" style={{ 
                            width: '100%', 
                            height: '100%',
                            display: voiceRoom && !voiceRoom.serverId ? 'block' : 'none'
                        }} />
                        
                        {/* VoiceChat для групповых звонков */}
                        {voiceRoom && !voiceRoom.serverId && (
                            <VoiceChat
                                ref={voiceChatRef}
                                key={`${voiceRoom.roomId}-group-chat`}
                                roomId={voiceRoom.roomId}
                                roomName={voiceRoom.roomName}
                                userName={voiceRoom.userName}
                                userId={voiceRoom.userId}
                                serverId={voiceRoom.serverId}
                                autoJoin={true}
                                showUI={true}
                                isVisible={true}
                                onLeave={onLeaveVoiceChannel}
                                onMuteStateChange={handleMuteStateChange}
                                onAudioStateChange={handleAudioStateChange}
                                initialMuted={localMuted}
                                initialAudioEnabled={localAudioEnabled}
                            />
                        )}
                        
                        {/* Показываем GroupChat если есть выбранный чат */}
                        {selectedChat && (
                            <GroupChat
                                username={user?.username}
                                userId={user?.userId}
                                chatId={selectedChat.chatId}
                                groupName={selectedChat.groupName || selectedChat.name}
                                isServerChat={false}
                                onJoinVoiceChannel={onJoinVoiceChannel}
                                onLeaveVoiceChannel={onLeaveVoiceChannel}
                                voiceRoom={voiceRoom}
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

const ServerPageWrapper = ({ user, onJoinVoiceChannel, voiceRoom, isVoiceChatVisible, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio }) => {
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
                            display: voiceRoom && isVoiceChatVisible && voiceRoom.serverId === serverId ? 'block' : 'none'
                        }} />
                        
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
                    </>
                )}
            </div>
        </div>
    );
};

export default Home;