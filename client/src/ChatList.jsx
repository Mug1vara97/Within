import React, { useEffect, useState, useRef, useCallback } from 'react';
import CreateGroupChatModal from './CreateGroupChatModal';
import GroupChat from './Chats/GroupChat';
import SearchBar from './SearchBar'; 
import { BASE_URL } from './config/apiConfig';
import UserPanel from './UserPanel';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import './styles/ChatList.css';

const ChatList = ({ userId, username, initialChatId, onChatSelected }) => {
    const [chats, setChats] = useState([]);
    const { chatId: urlChatId } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [connection, setConnection] = useState(null);
    const connectionRef = useRef(null);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Обработчик выбора чата
    const handleChatSelection = useCallback((chat) => {
        if (chat) {
            setSelectedChat(chat);
            
            // Вызываем колбэк, если он предоставлен
            if (onChatSelected) {
                onChatSelected(chat);
            }
            
            if (chat.isGroupChat) {
                navigate(`/channels/@me/${chat.chat_id}`);
            } else {
                navigate(`/channels/@me/${chat.chat_id}`);
            }
        }
    }, [navigate, onChatSelected]);

    // Эффект для отслеживания изменений в списке чатов и автоматического выбора чата из URL
    useEffect(() => {
        console.log('Chats state updated:', chats);
        
        // Если есть chatId в URL и список чатов загружен, выбираем соответствующий чат
        if ((initialChatId || urlChatId) && chats.length > 0) {
            const chatIdToUse = initialChatId || urlChatId;
            const chatToSelect = chats.find(chat => chat.chat_id === parseInt(chatIdToUse));
            if (chatToSelect && !selectedChat) {
                handleChatSelection(chatToSelect);
            }
        }
    }, [chats, urlChatId, initialChatId, selectedChat, handleChatSelection]);

    // Инициализация SignalR соединения
    useEffect(() => {
        const createConnection = async () => {
            if (connectionRef.current) {
                await connectionRef.current.stop();
            }

            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${BASE_URL}/chatlisthub?userId=${userId}`, {
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Debug)
                .build();

            try {
                await newConnection.start();
                console.log('SignalR ChatListHub соединение установлено');
                connectionRef.current = newConnection;
                setConnection(newConnection);

                // Сразу после установки соединения запрашиваем чаты
                await newConnection.invoke("GetUserChats", userId);
            } catch (err) {
                console.error('Ошибка подключения к ChatListHub:', err);
            }
        };

        if (userId) {
            createConnection();
        }

        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop();
            }
        };
    }, [userId]);

    // Подписка на события SignalR и загрузка начальных данных
    useEffect(() => {
        if (!connection || !userId) return;

        const handleReceiveChats = (receivedChats) => {
            console.log('Received updated chats:', receivedChats);
            if (Array.isArray(receivedChats)) {
                // Сортируем чаты по времени последнего сообщения
                const sortedChats = [...receivedChats].sort((a, b) => {
                    const timeA = new Date(a.lastMessageTime).getTime();
                    const timeB = new Date(b.lastMessageTime).getTime();
                    return timeB - timeA;
                });

                setChats(sortedChats);
                console.log('Updated chats state:', sortedChats);
            } else {
                console.error('Received invalid chat data:', receivedChats);
            }
        };

        const handleChatCreated = async (createdUserId, chatId) => {
            console.log('Chat created event received:', { createdUserId, chatId, currentUserId: userId });
            if (createdUserId === parseInt(userId, 10)) {
                console.log('Requesting updated chat list after chat creation');
                try {
                    await connection.invoke("GetUserChats", parseInt(userId, 10));
                } catch (err) {
                    console.error('Error getting chats after creation:', err);
                }
            }
        };

        const handleChatDeleted = (deletedUserId, chatId) => {
            console.log('Chat deleted event received:', { deletedUserId, chatId });
            if (deletedUserId === parseInt(userId, 10)) {
                setChats(prevChats => {
                    const updatedChats = prevChats.filter(chat => chat.chat_id !== chatId);
                    console.log('Updated chats after deletion:', updatedChats);
                    return updatedChats;
                });
                if (selectedChat?.chatId === chatId) {
                    setSelectedChat(null);
                    navigate('/channels/@me');
                }
            }
        };

        const handleError = (errorMessage) => {
            console.error('SignalR error:', errorMessage);
            alert(errorMessage);
        };

        const handleSearchResults = (results) => {
            setSearchResults(results);
        };

        const handleGroupChatCreated = (chatInfo) => {
            connection.invoke("GetUserChats", parseInt(userId, 10));
            setShowModal(false);
        };

        // Подписываемся на события
        connection.on("ReceiveChats", handleReceiveChats);
        connection.on("ChatCreated", handleChatCreated);
        connection.on("ChatDeleted", handleChatDeleted);
        connection.on("Error", handleError);
        connection.on("ReceiveSearchResults", handleSearchResults);
        connection.on("GroupChatCreated", handleGroupChatCreated);

        // Загружаем начальный список чатов
        console.log('Requesting initial chat list for user:', userId);
        connection.invoke("GetUserChats", parseInt(userId, 10))
            .catch(err => console.error('Error loading initial chats:', err));

        return () => {
            // Отписываемся от событий при размонтировании
            if (connection) {
                connection.off("ReceiveChats", handleReceiveChats);
                connection.off("ChatCreated", handleChatCreated);
                connection.off("ChatDeleted", handleChatDeleted);
                connection.off("Error", handleError);
                connection.off("ReceiveSearchResults", handleSearchResults);
                connection.off("GroupChatCreated", handleGroupChatCreated);
            }
        };
    }, [connection, userId, selectedChat, navigate]);

    const handleSearchChange = async (value) => {
        setSearchTerm(value);
        
        if (value.trim() === '') {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        
        if (connection) {
            try {
                await connection.invoke("SearchUsers", value.trim());
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }
    };

    const handlePrivateMessage = async (user) => {
        if (!connection) return;
        
        try {
            // Проверяем, существует ли уже чат с этим пользователем
            const existingChat = chats.find(chat => 
                !chat.isGroupChat && chat.user_id === user.user_id
            );
            
            if (existingChat) {
                // Если чат существует, открываем его
                handleChatSelection(existingChat);
                setSearchTerm('');
                setIsSearching(false);
                setSearchResults([]);
                return;
            }

            // Если чата нет, создаем новый
            const tempChat = {
                chat_id: null,
                user_id: user.user_id,
                username: user.username,
                isGroupChat: false
            };

            // Создаем обработчик для события создания чата
            const handleChatCreated = async (createdUserId, chatId) => {
                if (createdUserId === parseInt(userId, 10)) {
                    // Обновляем временный объект чата с полученным ID
                    tempChat.chat_id = chatId;
                    
                    // Сразу открываем чат
                    handleChatSelection(tempChat);
                     
                     // Закрываем поиск
                     setSearchTerm('');
                     setIsSearching(false);
                     setSearchResults([]);

                    // Обновляем список чатов
                    await connection.invoke("GetUserChats", parseInt(userId, 10));
                    
                    // Отписываемся от события
                    connection.off("ChatCreated", handleChatCreated);
                }
            };

            // Подписываемся на событие создания чата перед его созданием
            connection.on("ChatCreated", handleChatCreated);

            // Создаем чат
            await connection.invoke("CreatePrivateChat", parseInt(userId, 10), parseInt(user.user_id, 10));

        } catch (error) {
            console.error('Ошибка при открытии/создании чата:', error);
            // Отписываемся от события в случае ошибки
            if (connection) {
                connection.off("ChatCreated");
            }
            alert('Произошла ошибка при открытии чата');
        }
    };

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation();
        
        if (window.confirm('Вы уверены, что хотите удалить этот чат?')) {
            if (connection) {
                await connection.invoke("DeleteChat", chatId, userId);
            }
            }
        };

    const handleCreateGroupChat = async (chatName, selectedUsers) => {
        if (!connection) return;

        try {
            if (!chatName || !selectedUsers || selectedUsers.length === 0) {
                alert('Пожалуйста, введите название чата и выберите участников');
                return;
            }

            // Преобразуем выбранных пользователей в массив ID
            const userIds = selectedUsers.map(user => user.user_id);
            // Добавляем текущего пользователя в список участников
            userIds.push(userId);

            await connection.invoke("CreateGroupChat", chatName, userIds);
        } catch (error) {
            console.error('Ошибка при создании группового чата:', error);
            alert('Произошла ошибка при создании группового чата');
        }
    };

    // Рендеринг списка чатов
    const renderChatList = () => {
        console.log('Rendering chat list with chats:', chats);
        return (
            <ul className="chat-list" key={`chat-list-${forceUpdate}`}>
                <div className="create-group-chat">
                    <span className="chat-header-text">Личные сообщения</span>
                    <button className="create-group-button" onClick={() => setShowModal(true)}>
                        +
                    </button>
                </div>
                {chats && chats.length > 0 ? (
                    chats.map((chat, index) => (
                        <li
                            key={`${chat.chat_id}-${chat.lastMessageTime}-${forceUpdate}-${index}`}
                            className={`chat-item ${selectedChat?.chatId === chat.chat_id ? 'active' : ''}`}
                            onClick={() => handleChatSelection(chat)}
                        >
                            <div className="chat-item-content">
                                <div className="username">{chat.username}</div>
                                {chat.isGroupChat && <span className="group-indicator">(Group)</span>}
                               
                             </div>
                            {!chat.isGroupChat && (
                                <button 
                                    className="delete-chat-button"
                                    onClick={(e) => handleDeleteChat(chat.chat_id, e)}
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    ))
                ) : (
                    <p>No chats available.</p>
                )}
            </ul>
        );
    };

    return (
        <div className="chat-list-container">
            <div className="chat-sidebar">
                <SearchBar onSearchChange={handleSearchChange} />
                {isSearching ? (
                    <div className="search-results-container">
                        <h3>Search Results</h3>
                        <ul>
                            {searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <li 
                                        key={user.user_id} 
                                        className="search-result-item"
                                        onClick={() => handlePrivateMessage(user)}
                                    >
                                        {user.username}
                                    </li>
                                ))
                            ) : (
                                <p>No users found.</p>
                            )}
                        </ul>
                    </div>
                ) : (
                    renderChatList()
                )}
                {showModal && (
                    <CreateGroupChatModal 
                        userId={userId} 
                        onClose={() => setShowModal(false)} 
                        onChatCreated={(chatName, selectedUsers) => {
                            handleCreateGroupChat(chatName, selectedUsers);
                        }} 
                        connection={connection}
                    />
                )}
                <UserPanel userId={userId} username={username} isOpen={true}/>
            </div>
        </div>
    );
};

export default ChatList;