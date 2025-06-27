import React, { useState } from 'react';
import SearchBar from './SearchBar'; 
import UserPanel from './UserPanel';
import './styles/ChatList.css';

const ChatList = ({ userId, username, chats, onChatSelect, connection }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Обработчик поиска
    const handleSearchChange = async (value) => {
        setSearchTerm(value);
        setIsSearching(value.length > 0);

        if (value && connection) {
            await connection.invoke("SearchUsers", value, userId);
        } else {
            setSearchResults([]);
        }
    };

    // Обработчик выбора пользователя из результатов поиска
    const handlePrivateMessage = async (user) => {
        if (!connection) return;

        try {
            // Сначала проверяем существующий чат
            const existingChat = chats.find(chat => 
                !chat.isGroupChat && 
                chat.user_id === user.user_id
            );

            if (existingChat) {
                // Если чат существует, открываем его
                onChatSelect(existingChat);
                setSearchTerm('');
                setIsSearching(false);
                setSearchResults([]);
                return;
            }

            // Если чата нет, создаем новый
            await connection.invoke("CreatePrivateChat", userId, user.user_id);
            
            // Закрываем поиск
            setSearchTerm('');
            setIsSearching(false);
            setSearchResults([]);
        } catch (error) {
            console.error('Error creating private chat:', error);
        }
    };

    // Рендер списка чатов
    const renderChatList = () => {
        if (!chats || chats.length === 0) {
            return <div className="no-chats">Нет активных чатов</div>;
        }

        return (
            <ul className="chat-list">
                {chats.map(chat => (
                    <li 
                        key={chat.chat_id} 
                        className="chat-item"
                        onClick={() => onChatSelect(chat)}
                    >
                        <div className="chat-avatar">
                            {chat.avatar_url ? (
                                <img src={chat.avatar_url} alt="Avatar" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {chat.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="chat-info">
                            <div className="chat-name">{chat.username}</div>
                            <div className="chat-last-message">
                                {chat.last_message || 'Нет сообщений'}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="chat-list-container">
            <UserPanel username={username} userId={userId} />
            
            <div className="search-and-create">
                <SearchBar 
                    placeholder="Поиск пользователей..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>
            
            {isSearching ? (
                <div className="search-results">
                    <h3>Результаты поиска</h3>
                    <ul>
                        {searchResults.map(user => (
                            <li 
                                key={user.user_id} 
                                onClick={() => handlePrivateMessage(user)}
                                className="search-result-item"
                            >
                                {user.username}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="chats-list">
                    {renderChatList()}
                </div>
            )}
        </div>
    );
};

export default ChatList;