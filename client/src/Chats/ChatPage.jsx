import React, { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { BASE_URL } from '../config/apiConfig';
import MediaMessage from './MediaMessage';
import { useMediaHandlers } from '../hooks/useMediaHandlers';
import useScrollToBottom from '../hooks/useScrollToBottom';


const ChatPage = ({ userId, username, chatId, chatPartnerUsername, PartnerId }) => {
    const [messages, setMessages] = useState([]);
    const [connection, setConnection] = useState(null);
    const [message, setMessage] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const { isRecording, fileInputRef, handleSendMedia, handleAudioRecording } = useMediaHandlers(connection, username, chatId);
    const { messagesEndRef, scrollToBottom } = useScrollToBottom();
    const connectionRef = useRef(null);

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        messageId: null
    });

    const handleContextMenu = (e, messageId) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            messageId: messageId
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ ...contextMenu, visible: false });
    };

    useEffect(() => {
        const handleClickOutside = () => closeContextMenu();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);


    // Подключение к SignalR
   useEffect(() => {
    const connect = async () => {
        if (!chatId) return;
        
        const newConnection = new HubConnectionBuilder()
            .withUrl(`${BASE_URL}/chathub`)
            .withAutomaticReconnect()
            .build();

        try {
            await newConnection.start();
            connectionRef.current = newConnection;
            setConnection(newConnection);
            
            await newConnection.invoke('JoinGroup', String(chatId));
            
            const response = await fetch(`${BASE_URL}/api/messages/${String(chatId)}?userId=${userId}`);
            const data = await response.json();
            setMessages(data.map(msg => ({
                id: msg.messageId,
                username: msg.user.username,
                content: msg.content,
                userId: msg.userId,
                createdAt: msg.createdAt,
                isRead: msg.isRead,
                readBy: msg.readBy || []
            })));
            
            // Обработчики событий
            newConnection.on('ReceiveMessage', (user, content, messageId) => {
                setMessages(prev => [...prev, { 
                    id: messageId,
                    username: user, 
                    content,
                    userId: user === username ? userId : PartnerId,
                    isRead: false,
                    readBy: []
                }]);
                scrollToBottom();
            });

            newConnection.on('MessageEdited', (messageId, newContent) => {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, content: newContent } : msg
                ));
            });

            newConnection.on('MessageDeleted', messageId => {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            });

        } catch (err) {
            console.error('Connection error: ', err);
        }
    };

    connect();

    return () => {
        const cleanup = async () => {
            if (connectionRef.current) {
                try {
                    // Удаляем все обработчики
                    connectionRef.current.off('ReceiveMessage');
                    connectionRef.current.off('MessageEdited');
                    connectionRef.current.off('MessageDeleted');
                    
                    // Покидаем группу только если соединение активно
                    if (connectionRef.current.state === 'Connected') {
                        await connectionRef.current.invoke('LeaveGroup', String(chatId));
                    }
                    
                    // Останавливаем соединение
                    await connectionRef.current.stop();
                } catch (err) {
                    console.error('Cleanup error:', err);
                } finally {
                    connectionRef.current = null;
                    setConnection(null);
                }
            }
        };
        
        cleanup();
    };
}, [chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (connection) {
            scrollToBottom();
        }
    }, [connection]);

    useEffect(() => {
        if (connection) {
            const receiveMessageHandler = (user, content, messageId) => {
                setMessages(prevMessages => [...prevMessages, { 
                    id: messageId,
                    username: user, 
                    content: content,
                    userId: user === username ? userId : PartnerId,
                    isRead: false,
                    readBy: []
                }]);
                scrollToBottom();
            };

            const messageEditedHandler = (messageId, newContent) => {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, content: newContent } : msg
                ));
            };

            const messageDeletedHandler = (messageId) => {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            };

            connection.on('ReceiveMessage', receiveMessageHandler);
            connection.on('MessageEdited', messageEditedHandler);
            connection.on('MessageDeleted', messageDeletedHandler);

            return () => {
                connection.off('ReceiveMessage', receiveMessageHandler);
                connection.off('MessageEdited', messageEditedHandler);
                connection.off('MessageDeleted', messageDeletedHandler);
            };
        }
    }, [connection, username, userId, PartnerId]);

    // Отправка текстового сообщения или сохранение изменений
    const sendMessage = async () => {
        if (!connection || connection.state !== 'Connected' || !message) return;

        try {
            if (editingMessageId) {
                // Редактирование существующего сообщения
                await connection.invoke('EditMessage', editingMessageId, message, username);
                setEditingMessageId(null);
            } else {
                // Отправка нового сообщения
                await connection.invoke('SendMessage', username, message, String(chatId));
            }
            setMessage('');
        } catch (err) {
            console.error('Ошибка при отправке сообщения: ', err);
        }
    };

    // Начало редактирования сообщения
    const startEditing = (messageId, currentContent) => {
        setEditingMessageId(messageId);
        setMessage(currentContent);
        scrollToBottom(); // Прокрутка к полю ввода
    };

    // Отмена редактирования
    const cancelEditing = () => {
        setEditingMessageId(null);
        setMessage('');
    };

    // Удаление сообщения
    const deleteMessage = async (messageId) => {
        try {
            await connection.invoke('DeleteMessage', messageId, username);
            if (editingMessageId === messageId) {
                cancelEditing();
            }
        } catch (err) {
            console.error('Ошибка при удалении сообщения: ', err);
        }
    };

    // Отметка сообщений как прочитанных
    const markMessagesAsRead = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/messages/mark-as-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    chatId: chatId
                })
            });
            
            if (response.ok) {
                // Обновляем локальное состояние сообщений
                setMessages(prevMessages => 
                    prevMessages.map(msg => 
                        msg.userId !== userId ? { ...msg, isRead: true } : msg
                    )
                );
            }
        } catch (err) {
            console.error('Ошибка при отметке сообщений как прочитанных: ', err);
        }
    };

    // Автоматическая отметка сообщений как прочитанных при входе в чат
    useEffect(() => {
        if (chatId && userId && messages.length > 0) {
            // Отмечаем как прочитанные с небольшой задержкой, чтобы пользователь успел увидеть сообщения
            const timer = setTimeout(() => {
                markMessagesAsRead();
            }, 1000);
            
            return () => clearTimeout(timer);
        }
    }, [chatId, userId, messages]);

    

    return (
        <div className="chat-page-container">
            <div className="chat-header">
                <div className="header-left">
                    <div className="user-info">
                        <h2 className="username">{chatPartnerUsername}</h2>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Поиск"
                            className="search-input"
                        />
                    </div>
                </div>
            </div>
    
            <div className="messages">
                {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.username === username ? 'my-message' : 'user-message'}`}
                    onContextMenu={(e) => msg.username === username && handleContextMenu(e, msg.id)}>
                    <div className="message-content">
                        <strong className="message-username">{msg.username}</strong>
                        <MediaMessage content={msg.content} />
                    </div>
                    {msg.username === username && (
                        <div className="message-status">
                            {msg.isRead ? (
                                <span className="read-status" title="Прочитано">✓✓</span>
                            ) : (
                                <span className="unread-status" title="Отправлено">✓</span>
                            )}
                        </div>
                    )}
                </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
    
            <div className="input-container">
                {editingMessageId && (
                    <div className="editing-notice">
                        <span className='editing-text'>Редактирование сообщения</span>
                        <button onClick={cancelEditing} className="cancel-edit-button">×</button>
                    </div>
                )}
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={editingMessageId ? "Редактируйте сообщение..." : "Type a message..."}
                    className="message-input"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="send-button">
                    {editingMessageId ? 'Save' : 'Send'}
                </button>
                {!editingMessageId && (
                    <>
                        <button
                        onClick={handleAudioRecording}
                        className={`record-button ${isRecording ? 'recording' : ''}`}
                        >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </button>
                        <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => handleSendMedia(e.target.files[0])}
                        accept="image/*, video/*, audio/*"
                        />
                        <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="media-button"
                        >
                        📎
                        </button>
                    </>
                )}
            </div>
            {contextMenu.visible && (
                <div 
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenu.x}px`,
                        top: `${contextMenu.y}px`,
                        zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => {
                            startEditing(contextMenu.messageId, 
                                messages.find(m => m.id === contextMenu.messageId)?.content);
                            closeContextMenu();
                        }}
                        className="context-menu-button"
                    >
                        Редактировать
                    </button>
                    <button 
                        onClick={() => {
                            deleteMessage(contextMenu.messageId);
                            closeContextMenu();
                        }}
                        className="context-menu-button"
                    >
                        Удалить
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatPage;