import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerPage from './ServerPage';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import VoiceChat from './VoiceChat';
import GroupChat from './Chats/GroupChat';
import NotificationButton from './components/NotificationButton';
import IncomingCallModal from './components/IncomingCallModal';
import { useNotifications } from './hooks/useNotifications';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys';
import useHotkeys from './hooks/useHotkeys';
import useMouseNavigationBlocker from './hooks/useMouseNavigationBlocker';
import { NotificationContext } from './contexts/NotificationContext';

// Старые компоненты подсказок удалены - теперь используются настраиваемые горячие клавиши

const Home = ({ user }) => {
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { initializeForUser } = useNotifications();
    const { stopIncomingCallSound } = useContext(NotificationContext);
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
    
    // Состояние активного приватного звонка
    const [activePrivateCall, setActivePrivateCall] = useState(null); // { chatId, callData }
    
    // Состояние входящего звонка
    const [incomingCall, setIncomingCall] = useState(null); // { chatId, caller, callerId, roomId }
    
    // Глобальное состояние для отслеживания звонков в других чатах
    const [otherUsersInCall, setOtherUsersInCall] = useState(new Map()); // Map<chatId, { callerId, callerName }>
    
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
        
        // Для личных звонков VoiceChat рендерится, но isVisible = false (показывается только в портале GroupChat)
        if (voiceRoom.isPrivateCall) {
            console.log('Private call detected - VoiceChat will render but be hidden (shown only in GroupChat portal)');
            return false;
        }
        
        // В личных сообщениях голосовой чат скрыт (кроме личных звонков)
        if (location.pathname.startsWith('/channels/@me')) {
            console.log('Personal messages - hiding voice chat');
            return false;
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
        if (data === null) {
            // Если передан null, это означает выход из звонка
            handleLeaveVoiceChannel();
        } else {
            setVoiceRoom(data);
            setLeftVoiceChannel(false);
            
            // Если это приватный звонок, сохраняем информацию о нем
            if (data.isPrivateCall && data.chatId) {
                setActivePrivateCall({
                    chatId: data.chatId,
                    callData: data
                });
            }
        }
    };
    

    
    // Обработчик ответа на входящий звонок
    const handleAcceptCall = () => {
        if (incomingCall) {
            // Останавливаем звук входящего звонка
            stopIncomingCallSound();
            
            // Создаем данные звонка для присоединения
            const callData = {
                roomId: incomingCall.roomId,
                roomName: `Звонок с ${incomingCall.caller}`,
                userName: user?.username,
                userId: user?.userId,
                isPrivateCall: true,
                chatId: incomingCall.chatId
            };
            
            setVoiceRoom(callData);
            setActivePrivateCall({
                chatId: incomingCall.chatId,
                callData: callData
            });
            setIncomingCall(null);
        }
    };
    
    // Обработчик отклонения входящего звонка
    const handleRejectCall = () => {
        // Останавливаем звук входящего звонка
        stopIncomingCallSound();
        setIncomingCall(null);
    };
    
    // Глобальная функция для уведомления о завершении звонка
    const notifyCallEnded = useCallback((chatId, userId) => {
        // Эта функция будет вызываться из GroupChat для отправки NotifyCallEnded
        // Она должна быть передана как prop в GroupChat
        window.dispatchEvent(new CustomEvent('callEnded', { 
            detail: { chatId, userId } 
        }));
    }, []);

    // Функции для управления состоянием звонков в других чатах
    const setOtherUserInCall = useCallback((chatId, callerId, callerName) => {
        setOtherUsersInCall(prev => new Map(prev).set(chatId, { callerId, callerName }));
        console.log('🎯 Global: Setting other user in call for chat', chatId, { callerId, callerName });
    }, []);

    const removeOtherUserFromCall = useCallback((chatId) => {
        setOtherUsersInCall(prev => {
            const newMap = new Map(prev);
            newMap.delete(chatId);
            return newMap;
        });
        console.log('🎯 Global: Removing other user from call for chat', chatId);
    }, []);

    const isOtherUserInCall = useCallback((chatId) => {
        return otherUsersInCall.has(chatId);
    }, [otherUsersInCall]);

    const getOtherUserInCall = useCallback((chatId) => {
        return otherUsersInCall.get(chatId);
    }, [otherUsersInCall]);

    // Обработчик выхода из голосового канала
    const handleLeaveVoiceChannel = () => {
        // Останавливаем звук входящего звонка если он играет
        stopIncomingCallSound();
        
        // Уведомляем о завершении звонка для приватных звонков
        if (activePrivateCall) {
            notifyCallEnded(activePrivateCall.chatId, user?.userId);
        }
        
        setVoiceRoom(null);
        setActivePrivateCall(null); // Очищаем состояние приватного звонка
        setIncomingCall(null); // Очищаем состояние входящего звонка
        setLeftVoiceChannel(true);
        // НЕ сбрасываем состояния мьюта - сохраняем пользовательские настройки
        // setIsMuted(false);
        // setIsAudioEnabled(true);
        
        // Убираем автоматический сброс - надпись будет висеть до переключения
    };
    
    // Функции управления мьютом для UserPanel
    const handleToggleMute = useCallback(() => {
        if (voiceRoom && voiceChatRef.current && voiceChatRef.current.handleMute) {
            // Если в голосовом чате - управляем реальным мьютом
            voiceChatRef.current.handleMute();
        } else {
            // Если не в голосовом чате - управляем локальным состоянием
            setLocalMuted(!localMuted);
        }
    }, [voiceRoom, localMuted]);
    
    const handleToggleAudio = useCallback(() => {
        if (voiceRoom && voiceChatRef.current && voiceChatRef.current.toggleAudio) {
            // Если в голосовом чате - управляем реальным звуком
            voiceChatRef.current.toggleAudio();
        } else {
            // Если не в голосовом чате - управляем локальным состоянием
            setLocalAudioEnabled(!localAudioEnabled);
        }
    }, [voiceRoom, localAudioEnabled]);
    
    // Коллбеки для получения состояний от VoiceChat
    const handleMuteStateChange = (muted) => {
        setIsMuted(muted);
    };
    
    const handleAudioStateChange = (enabled) => {
        setIsAudioEnabled(enabled);
    };

    // Глобальные горячие клавиши
    useHotkeys({
        toggleMic: handleToggleMute,
        toggleAudio: handleToggleAudio
    });

    // Блокировщик навигации для боковых кнопок мыши
    useMouseNavigationBlocker();

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

    // Обработчик входящих звонков через NotificationHub
    useEffect(() => {
        const handleIncomingCall = (event) => {
            console.log("IncomingCall event received:", event);
            
            if (!event.detail) {
                console.error("IncomingCall event has no detail:", event);
                return;
            }
            
            const { chatId, caller, callerId, roomId } = event.detail;
            console.log("IncomingCall event detail:", { chatId, caller, callerId, roomId });
            
            // Проверяем, что звонок не от нас самих
            if (callerId !== user?.userId) {
                setIncomingCall({
                    chatId: parseInt(chatId),
                    caller: caller,
                    callerId: callerId,
                    roomId: roomId
                });
            }
        };

        window.addEventListener('incomingCall', handleIncomingCall);

        return () => {
            window.removeEventListener('incomingCall', handleIncomingCall);
        };
    }, [user?.userId]);

    // Инициализация уведомлений при входе пользователя
    useEffect(() => {
        if (user.userId) {
            initializeForUser(user.userId);
        }
    }, [user.userId, initializeForUser]);

    // Глобальный обработчик горячих клавиш
    // Используем хук для глобальных горячих клавиш
    const { isElectron } = useGlobalHotkeys(handleToggleMute, handleToggleAudio);
    
    // Старые жестко закодированные горячие клавиши удалены
    
    // Логируем информацию о режиме работы
    useEffect(() => {
        if (isElectron()) {
            console.log('Приложение запущено в Electron - глобальные горячие клавиши доступны');
        } else {
            console.log('Приложение запущено в браузере - только локальные горячие клавиши');
        }
    }, []);

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
                                    activePrivateCall={activePrivateCall}
                                    setOtherUserInCall={setOtherUserInCall}
                                    removeOtherUserFromCall={removeOtherUserFromCall}
                                    isOtherUserInCall={isOtherUserInCall}
                                    getOtherUserInCall={getOtherUserInCall}
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
                                    activePrivateCall={activePrivateCall}
                                />
                            } />
                        </Routes>
                        

                        
                    </>
                )}
                
                {/* Единственный VoiceChat - позиционируется динамически и работает во всех режимах */}
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
                        isPrivateCall={voiceRoom.isPrivateCall}
                    />
                )}
                
                {/* Модальное окно входящего звонка */}
                {incomingCall && (
                    <IncomingCallModal
                        incomingCall={incomingCall}
                        onAcceptCall={handleAcceptCall}
                        onRejectCall={handleRejectCall}
                    />
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user, onJoinVoiceChannel, voiceRoom, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio, activePrivateCall, setOtherUserInCall, removeOtherUserFromCall, isOtherUserInCall, getOtherUserInCall }) => {
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
                                onJoinVoiceChannel={onJoinVoiceChannel}
                                chatTypeId={selectedChat.typeId || selectedChat.chatType}
                                activePrivateCall={activePrivateCall}
                                setOtherUserInCall={setOtherUserInCall}
                                removeOtherUserFromCall={removeOtherUserFromCall}
                                isOtherUserInCall={isOtherUserInCall}
                                getOtherUserInCall={getOtherUserInCall}
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

const ServerPageWrapper = ({ user, onJoinVoiceChannel, voiceRoom, isVoiceChatVisible, leftVoiceChannel, setLeftVoiceChannel, isMuted, isAudioEnabled, onToggleMute, onToggleAudio, activePrivateCall }) => {
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
                                onJoinVoiceChannel={onJoinVoiceChannel}
                                chatTypeId={selectedChat.typeId || selectedChat.chatType}
                                activePrivateCall={activePrivateCall}
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