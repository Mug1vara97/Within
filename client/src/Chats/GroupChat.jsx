import React, { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallIcon from '@mui/icons-material/Call';
import '../styles/Chat.css';
import './group-chat.css';
import '../styles/links.css';
import { BASE_URL } from '../config/apiConfig';
import MediaMessage from './MediaMessage';
import { useMediaHandlers } from '../hooks/useMediaHandlers';
import useScrollToBottom from '../hooks/useScrollToBottom';
import { useGroupSettings, AddMembersModal, GroupChatSettings } from '../Modals/GroupSettings';
import { processLinks } from '../utils/linkUtils.jsx';
import { useMessageVisibility } from '../hooks/useMessageVisibility';
import CallTypeModal from '../components/CallTypeModal';

const UserAvatar = ({ username, avatarUrl, avatarColor }) => {
  return (
      <div 
          className="user-avatar"
          style={{ 
              backgroundColor: avatarColor || '#5865F2',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: 0
          }}
      >
          {avatarUrl ? (
              <img 
                  src={avatarUrl} 
                  alt="User avatar" 
                  style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                  }}
              />
          ) : (
              username?.charAt(0).toUpperCase()
          )}
      </div>
  );
};

const GroupChat = ({ username, userId, chatId, groupName, isServerChat = false, userPermissions, chatListConnection,
  isGroupChat = false, isServerOwner, onJoinVoiceChannel, chatTypeId, activePrivateCall }) => {
  

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [connection, setConnection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { 
    isRecording, 
    recordingTime, 
    fileInputRef, 
    handleSendMedia,
    handleAudioRecording,
    formatRecordingTime,
    cancelRecording
  } = useMediaHandlers(connection, username, chatId);
  const { messagesEndRef, scrollToBottom } = useScrollToBottom();
  const { addMessageRef } = useMessageVisibility(userId, chatId, messages);
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    isAddMembersModalOpen,
    setIsAddMembersModalOpen,
    members,
    fetchMembers,
    handleLeaveGroup,
    handleAddMember
  } = useGroupSettings(chatId, userId);
  const connectionRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [messageToForward, setMessageToForward] = useState(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [availableChats, setAvailableChats] = useState([]);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    isOwnMessage: false,
    canDelete: false
  });
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [forwardMessageText, setForwardMessageText] = useState('');
  const forwardTextareaRef = useRef(null);
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  const [isCallTypeModalOpen, setIsCallTypeModalOpen] = useState(false);
  const [otherUserInCall, setOtherUserInCall] = useState(false); // Состояние для отображения, что собеседник в звонке

  // Определяем, является ли это личным чатом
  useEffect(() => {
    // TypeId = 1 означает личный чат
    setIsPrivateChat(chatTypeId === 1 || (!isGroupChat && !isServerChat));
  }, [chatTypeId, isGroupChat, isServerChat]);

  // Определяем, есть ли активный звонок в этом чате
  const isCallActiveInThisChat = activePrivateCall && 
    String(activePrivateCall.chatId) === String(chatId) && 
    isPrivateChat;

  // Отслеживаем завершение звонка
  useEffect(() => {
    // Если звонок был активен в этом чате, но теперь его нет, уведомляем о завершении
    if (isPrivateChat && !activePrivateCall && connection) {
      // Здесь можно добавить логику для определения, был ли звонок активен ранее
      console.log('Call ended in private chat, notifying...');
      // connection.invoke('NotifyCallEnded', chatId, userId);
    }
  }, [activePrivateCall, isPrivateChat, connection, chatId, userId]);

  const handleStartCall = () => {
    if (isPrivateChat && !isCallActiveInThisChat) {
      // Открываем модальное окно выбора типа звонка
      setIsCallTypeModalOpen(true);
    }
  };

  // Функция для присоединения к существующему звонку
  const handleJoinCall = () => {
    if (isPrivateChat && !isCallActiveInThisChat) {
      const callData = {
        roomId: chatId.toString(),
        roomName: `Звонок с ${groupName}`,
        userName: username,
        userId: userId,
        isPrivateCall: true,
        chatId: chatId
      };

      // Скрываем панель, так как мы присоединяемся
      setOtherUserInCall(false);

      if (onJoinVoiceChannel) {
        onJoinVoiceChannel(callData);
      }
    }
  };

  const handleCallWithNotification = () => {
    // Создаем данные звонка с уведомлением
    const callData = {
      roomId: chatId.toString(),
      roomName: `Звонок с ${groupName}`,
      userName: username,
      userId: userId,
      isPrivateCall: true,
      chatId: chatId
    };
    
    // Отправляем уведомление о звонке через SignalR
    if (connection) {
      console.log('📞 Sending call notification and call started:', { chatId, userId, username });
      console.log('📞 Connection state:', connection.state);
      
      connection.invoke('SendCallNotification', chatId, username, userId, groupName)
        .then(() => {
          console.log('✅ SendCallNotification sent successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to send SendCallNotification:', error);
        });
      
      // Уведомляем о начале звонка
      connection.invoke('NotifyCallStarted', chatId, userId)
        .then(() => {
          console.log('✅ NotifyCallStarted sent successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to send NotifyCallStarted:', error);
        });
    } else {
      console.error('❌ No SignalR connection available!');
    }
    
    // Вызываем глобальный обработчик для начала звонка
    if (onJoinVoiceChannel) {
      onJoinVoiceChannel(callData);
    }
    
    setIsCallTypeModalOpen(false);
  };

  const handleCallWithoutNotification = () => {
    // Создаем данные звонка без уведомления
    const callData = {
      roomId: chatId.toString(),
      roomName: `Звонок с ${groupName}`,
      userName: username,
      userId: userId,
      isPrivateCall: true,
      chatId: chatId
    };
    
    // Уведомляем о начале звонка (даже без уведомления собеседнику нужно показать панель)
    if (connection) {
      console.log('📞 Sending call started (without notification):', { chatId, userId });
      console.log('📞 Connection state:', connection.state);
      
      connection.invoke('NotifyCallStarted', chatId, userId)
        .then(() => {
          console.log('✅ NotifyCallStarted sent successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to send NotifyCallStarted:', error);
        });
    } else {
      console.error('❌ No SignalR connection available!');
    }
    
    // Вызываем глобальный обработчик для начала звонка (без отправки уведомления)
    if (onJoinVoiceChannel) {
      onJoinVoiceChannel(callData);
    }
    
    setIsCallTypeModalOpen(false);
  };

  const handleEndCall = () => {
    // Вызываем глобальный обработчик для завершения звонка
    if (onJoinVoiceChannel) {
      onJoinVoiceChannel(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const contextMenuElement = document.querySelector('.context-menu');
      if (contextMenuElement && !contextMenuElement.contains(e.target)) {
        closeContextMenu();
      }
    };
  
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };
  
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
  
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [contextMenu.visible]);

  // Обработчик контекстного меню
  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    const message = messages.find(m => m.messageId === messageId);
    const isOwnMessage = message?.senderUsername === username;
    const canDelete = isOwnMessage || 
      (isServerChat && (userPermissions?.deleteMessages || isServerOwner));
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId: messageId,
      isOwnMessage: isOwnMessage,
      canDelete: canDelete
    });
    setHighlightedMessageId(messageId);
  };

  // Закрытие контекстного меню
  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
    setHighlightedMessageId(null);
  };

  // Начать ответ на сообщение
  const startReply = (message) => {
    setReplyingToMessage(message);
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Начать пересылку сообщения
  const startForward = (message) => {
    setMessageToForward(message);
    setForwardModalVisible(true);
    fetchAvailableChats();
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Получение списка доступных чатов для пересылки
  const fetchAvailableChats = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/available-chats/${userId}`);
      if (response.ok) {
        const chats = await response.json();
        setAvailableChats(chats);
      }
    } catch (error) {
      console.error('Error fetching available chats:', error);
    }
  };

  // Переслать сообщение
  const handleForward = async (targetChatId) => {
    try {
      await connection.invoke('ForwardMessage', 
        messageToForward.messageId, 
        parseInt(targetChatId), 
        username,
        forwardMessageText
      );
      setForwardModalVisible(false);
      setMessageToForward(null);
      setForwardMessageText('');
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Ошибка при пересылке сообщения');
    }
  };

  // Компонент модального окна пересылки
  const ForwardModal = () => {
    useEffect(() => {
      if (forwardModalVisible && forwardTextareaRef.current) {
        forwardTextareaRef.current.focus();
      }
    }, [forwardModalVisible]);

    if (!forwardModalVisible) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content forward-modal">
          <h3>Переслать сообщение</h3>
          
                              <div className="forwarded-message-preview">
                      <strong>{messageToForward?.senderUsername}</strong>
                      <p>{processLinks(messageToForward?.content)}</p>
                    </div>

          <div className="forward-message-input">
            <input
              ref={forwardTextareaRef}
              type="text"
              placeholder="Добавьте комментарий к пересылаемому сообщению..."
              value={forwardMessageText}
              onChange={(e) => setForwardMessageText(e.target.value)}
              className="forward-input"
              autoFocus
            />
          </div>

          <div className="chat-list">
            <h4>Выберите чат для пересылки:</h4>
            {availableChats.map(chat => (
              <div
                key={chat.chatId}
                className="chat-item"
                onClick={() => handleForward(chat.chatId)}
              >
                {chat.name || `Чат с ${chat.username}`}
              </div>
            ))}
          </div>
          <div className="forward-modal-buttons">
            <button 
              className="cancel-button" 
              onClick={() => {
                setForwardModalVisible(false);
                setForwardMessageText('');
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Редактирование сообщения
  const startEditing = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setNewMessage(currentContent);
    scrollToBottom();
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingMessageId(null);
    setNewMessage('');
  };

  // Удаление сообщения
  const deleteMessage = async (messageId) => {
    try {
      const message = messages.find(m => m.messageId === messageId);
      if (!message) return;

      const canDelete = message.senderUsername === username || 
        (isServerChat && (userPermissions?.manageMessages || isServerOwner));

      if (!canDelete) {
        alert('У вас нет прав на удаление этого сообщения');
        return;
      }

      await connection.invoke('DeleteMessage', messageId, username);
      if (editingMessageId === messageId) cancelEditing();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Ошибка при удалении сообщения');
    }
  };

  // Подключение к SignalR
  useEffect(() => {
    const connect = async () => {
      const newConnection = new HubConnectionBuilder()
        .withUrl(`${BASE_URL}/groupchathub`)
        .withAutomaticReconnect()
        .build();

      try {
        await newConnection.start();
        connectionRef.current = newConnection;
        setConnection(newConnection);

        if (chatId) {
          await newConnection.invoke('JoinGroup', parseInt(chatId));
          
          const messages = await newConnection.invoke('GetMessages', parseInt(chatId));
          setMessages(messages.map(msg => ({
            messageId: msg.messageId,
            senderUsername: msg.senderUsername,
            content: msg.content,
            avatarUrl: msg.avatarUrl,
            avatarColor: msg.avatarColor,
            repliedMessage: msg.repliedMessage,
            forwardedMessage: msg.forwardedMessage,
            createdAt: msg.createdAt
          })));
          
          // Сообщения теперь помечаются как прочитанные при их видимости
        }
      } catch (error) {
        console.error('Connection failed: ', error);
      }
    };

    connect();

    return () => {
      const cleanup = async () => {
        if (connectionRef.current) {
          try {
            // Удаляем обработчики событий
            connectionRef.current.off('ReceiveMessage');
            connectionRef.current.off('MessageEdited');
            connectionRef.current.off('MessageDeleted');
            
            // Покидаем группу только если соединение активно
            if (connectionRef.current.state === 'Connected') {
              await connectionRef.current.invoke('LeaveGroup', parseInt(chatId));
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

  // Подключение к ChatListHub
  useEffect(() => {
    const connectToChatList = async () => {
        if (!chatListConnection) {
            console.log('No chatListConnection provided');
            return;
        }

        try {
            // Подписываемся на события обновления чатов
            chatListConnection.on('ReceiveChats', (chats) => {
                console.log('Received updated chats in GroupChat:', chats);
            });
        } catch (error) {
            console.error('ChatListHub connection failed: ', error);
        }
    };

    connectToChatList();

    return () => {
        if (chatListConnection) {
            chatListConnection.off('ReceiveChats');
        }
    };
}, [chatListConnection]);

  useEffect(() => {
    scrollToBottom();
}, [messages]);

  // Обработка входящих сообщений
  useEffect(() => {
    if (connection) {
      const receiveMessageHandler = async (username, content, messageId, avatarUrl, avatarColor, repliedMessage, forwardedMessage) => {
        setMessages(prev => [...prev, {
          messageId,
          senderUsername: username,
          content,
          createdAt: new Date().toISOString(),
          avatarUrl,
          avatarColor,
          repliedMessage,
          forwardedMessage
        }]);
        scrollToBottom();
      };

      const messageEditedHandler = (messageId, newContent) => {
        setMessages(prev => prev.map(msg => 
          msg.messageId === messageId ? { ...msg, content: newContent } : msg
        ));
      };

      const messageDeletedHandler = (messageId) => {
        setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
      };

                  connection.on('ReceiveMessage', receiveMessageHandler);
            connection.on('MessageEdited', messageEditedHandler);
            connection.on('MessageDeleted', messageDeletedHandler);
            connection.on('MessageRead', (messageId, readByUserId, readAt) => {
                console.log(`Message ${messageId} read by user ${readByUserId} at ${readAt}`);
                // Здесь можно добавить визуальную индикацию прочтения сообщения
                // Например, обновить состояние сообщения или показать иконку "прочитано"
            });

            // Обработчики для статуса звонков
            const handleCallStarted = (callChatId, callerId) => {
                console.log('🟢 CallStarted received:', { 
                    callChatId, 
                    callerId, 
                    currentChatId: chatId, 
                    userId: userId,
                    isCurrentChat: String(callChatId) === String(chatId),
                    isNotMe: callerId !== userId
                });
                
                // Если звонок в этом чате и звонит не мы, показываем панель
                if (String(callChatId) === String(chatId) && callerId !== userId) {
                    console.log('🎯 Setting otherUserInCall to TRUE');
                    setOtherUserInCall(true);
                } else {
                    console.log('❌ Not setting panel because:', {
                        wrongChat: String(callChatId) !== String(chatId),
                        isMe: callerId === userId
                    });
                }
            };

            const handleCallEnded = (callChatId) => {
                console.log('🔴 CallEnded received:', { 
                    callChatId, 
                    currentChatId: chatId,
                    isCurrentChat: String(callChatId) === String(chatId)
                });
                
                // Если звонок закончился в этом чате, скрываем панель
                if (String(callChatId) === String(chatId)) {
                    console.log('🎯 Setting otherUserInCall to FALSE');
                    setOtherUserInCall(false);
                } else {
                    console.log('❌ Not hiding panel because wrong chat');
                }
            };

            connection.on('CallStarted', handleCallStarted);
            connection.on('CallEnded', handleCallEnded);

        return () => {
        connection.off('ReceiveMessage', receiveMessageHandler);
        connection.off('MessageEdited', messageEditedHandler);
        connection.off('MessageDeleted', messageDeletedHandler);
        connection.off('CallStarted', handleCallStarted);
        connection.off('CallEnded', handleCallEnded);
      };
    }
  }, [connection, chatId]);

  // Обработчик события завершения звонка из Home.jsx
  useEffect(() => {
    const handleCallEndedEvent = (event) => {
      const { chatId: endedChatId, userId } = event.detail;
      console.log('📞 Call ended event received:', { endedChatId, userId, currentChatId: chatId });
      
      // Если звонок завершился в этом чате, отправляем уведомление
      if (String(endedChatId) === String(chatId) && connection) {
        console.log('📞 Sending NotifyCallEnded:', { chatId: endedChatId, userId });
        connection.invoke('NotifyCallEnded', endedChatId, userId);
      }
    };

    window.addEventListener('callEnded', handleCallEndedEvent);
    
    return () => {
      window.removeEventListener('callEnded', handleCallEndedEvent);
    };
  }, [connection, chatId]);

  // Отправка текстового сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !connection) return;

    try {
      if (editingMessageId) {
        await connection.invoke('EditMessage', editingMessageId, newMessage, username);
        cancelEditing();
      } else {
        await connection.invoke('SendMessage', 
          newMessage, 
          username, 
          parseInt(chatId), 
          replyingToMessage?.messageId || null,
          null // forwardedFromMessageId
        );
        setReplyingToMessage(null);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Обработчик клика для открытия настроек
  const handleSettingsClick = async () => {
    setIsSettingsOpen(true);
    await fetchMembers();
  };

  // Добавляем функцию поиска
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${BASE_URL}/api/messages/search/${chatId}?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error('Search failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };

  // Функция для перехода к сообщению
  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlighted');
      setTimeout(() => messageElement.classList.remove('highlighted'), 2000);
    }
  };

  return (
    <div className="group-chat-container">
      <div className="chat-header">
        <div className="header-left">
          <div className="user-info" onClick={isGroupChat ? handleSettingsClick : undefined}>
            <h2 className="username">{groupName}</h2>
          </div>
        </div>
        <div className="header-actions">
          {isPrivateChat && !isCallActiveInThisChat && (
            <button
              onClick={handleStartCall}
              className="voice-call-button"
              title="Начать звонок"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b9bbbe',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                transition: 'background-color 0.2s, color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#4f545c';
                e.target.style.color = '#dcddde';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#b9bbbe';
              }}
            >
              <CallIcon style={{ fontSize: '20px' }} />
            </button>
          )}
          {isGroupChat && (
            <button
              onClick={() => setIsAddMembersModalOpen(true)}
              className="add-member-button"
            >
              Добавить участника
            </button>
          )}
          <div className="search-container">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Поиск сообщений..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            {isSearching && searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-results-header">
                  <div className="search-results-title">
                    <span>Найдено сообщений: {searchResults.length}</span>
                  </div>
                  <button 
                    className="clear-search"
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="search-results-list">
                  {searchResults.map((msg) => (
                    <div
                      key={msg.messageId}
                      className="search-result-item"
                      onClick={() => scrollToMessage(msg.messageId)}
                    >
                      <div className="search-result-user">
                        <UserAvatar 
                          username={msg.senderUsername}
                          avatarUrl={msg.avatarUrl ? `${BASE_URL}${msg.avatarUrl}` : null}
                          avatarColor={msg.avatarColor}
                        />
                      </div>
                      <div className="search-result-main">
                        <div className="search-result-header">
                          <strong className="search-result-username">{msg.senderUsername}</strong>
                          <span className="search-result-date">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="search-result-content">
                          {processLinks(msg.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Всплывающее окно настроек */}
      {isGroupChat && isSettingsOpen && (
        <GroupChatSettings
          onClose={() => setIsSettingsOpen(false)}
          members={members}
          onLeaveGroup={handleLeaveGroup}
          groupName={groupName}
        />
      )}

      {isGroupChat && isAddMembersModalOpen && (
        <AddMembersModal
          onClose={() => setIsAddMembersModalOpen(false)}
          onAddMembers={handleAddMember}
          userId={userId}
          chatId={chatId}
        />
      )}

      {/* Интерфейс звонка для личных чатов */}
      {isCallActiveInThisChat && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '400px', // Фиксированная высота для лучшего отображения
          backgroundColor: '#18191c',
          borderBottom: '1px solid #202225',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Область для глобального VoiceChat */}
          <div style={{ 
            flex: 1, 
            position: 'relative', 
            height: '100%', // Используем всю высоту контейнера
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8e9297'
          }}>
            <div id="voice-chat-container-private" style={{ 
              width: '100%', 
              height: '100%'
            }} />
          </div>
        </div>
      )}

      {/* Панель звонка в стиле Discord */}
      {isPrivateChat && otherUserInCall && !isCallActiveInThisChat && (
        <div style={{
          backgroundColor: '#5865f2',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #202225',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Анимированная иконка звонка */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3ba55c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'callPulse 1.5s infinite'
            }}>
              <CallIcon style={{ fontSize: '18px', color: 'white' }} />
            </div>
            
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {groupName} в голосовом звонке
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Нажмите для присоединения
              </div>
            </div>
          </div>
          
          <button
            onClick={handleJoinCall}
            style={{
              backgroundColor: '#3ba55c',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2d7d32';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3ba55c';
            }}
          >
            Присоединиться
          </button>
        </div>
      )}

  <div className="messages">
    {messages.map((msg) => (
        <div
            key={msg.messageId}
            id={`message-${msg.messageId}`}
            className={`message ${msg.senderUsername === username ? 'my-message' : 'user-message'} ${
              highlightedMessageId === msg.messageId ? 'highlighted' : ''
            }`}
            onContextMenu={(e) => handleContextMenu(e, msg.messageId)}
            ref={(el) => addMessageRef(msg.messageId, el)}
        >
            <UserAvatar 
                username={msg.senderUsername}
                avatarUrl={msg.avatarUrl ? `${BASE_URL}${msg.avatarUrl}` : null}
                avatarColor={msg.avatarColor}
            />
            <div className="message-content">
                <strong className="message-username">{msg.senderUsername}</strong>
                {msg.repliedMessage && (
                  <div className="replied-message" onClick={() => scrollToMessage(msg.repliedMessage.messageId)}>
                    <div className="replied-message-header">
                      <strong>{msg.repliedMessage.senderUsername}</strong>
                    </div>
                    <div className="replied-message-content">
                      <MediaMessage content={msg.repliedMessage.content} />
                    </div>
                  </div>
                )}
                {msg.forwardedMessage && (
                  <>
                    <div className="forwarded-message">
                      <div className="forwarded-message-header">
                        <span>Переслано от</span>
                        <strong>{msg.forwardedMessage.senderUsername}</strong>
                        <span>из</span>
                        <strong>{msg.forwardedMessage.originalChatName}</strong>
                      </div>
                      <div className="forwarded-message-content">
                        <MediaMessage content={msg.forwardedMessage.content} />
                      </div>
                    </div>
                    {msg.content && (
                      <div className="message-text">
                        <MediaMessage content={msg.content} />
                      </div>
                    )}
                  </>
                )}
                {!msg.forwardedMessage && (
                  <div className="message-text">
                    <MediaMessage content={msg.content} />
                  </div>
                )}
            </div>
        </div>
    ))}

        {contextMenu.visible && (
          <div 
            className="context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => startReply(messages.find(m => m.messageId === contextMenu.messageId))}
              className="context-menu-button"
            >
              Ответить
            </button>
            <button 
              onClick={() => startForward(messages.find(m => m.messageId === contextMenu.messageId))}
              className="context-menu-button"
            >
              Переслать
            </button>
            {contextMenu.isOwnMessage && (
              <button 
                onClick={() => {
                  startEditing(contextMenu.messageId, 
                    messages.find(m => m.messageId === contextMenu.messageId)?.content);
                  closeContextMenu();
                }}
                className="context-menu-button"
              >
                Редактировать
              </button>
            )}
            {contextMenu.canDelete && (
              <button 
                onClick={() => {
                  deleteMessage(contextMenu.messageId);
                  closeContextMenu();
                }}
                className="context-menu-button"
              >
                Удалить
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={`input-container ${replyingToMessage ? 'replying' : ''}`} onSubmit={handleSendMessage}>
        {editingMessageId && (
          <div className="editing-notice">
            <span className='editing-text'>Редактирование сообщения</span>
            <button onClick={cancelEditing} className="cancel-edit-button">×</button>
          </div>
        )}
        {replyingToMessage && (
          <div className="reply-preview">
            <div className="reply-info">
              <div className="reply-header">
                <strong>{replyingToMessage.senderUsername}</strong>
                <span>Ответ на сообщение</span>
              </div>
              <div className="reply-content">
                <MediaMessage content={replyingToMessage.content} />
              </div>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="cancel-reply-button">
              ×
            </button>
          </div>
        )}
        {isRecording ? (
          <div className="recording-indicator-input">
            <span className="recording-dot">●</span>
            <span className="recording-time">{formatRecordingTime(recordingTime)}</span>
            <span className="recording-hint">Запись... (ESC для отмены)</span>
            <button 
              type="button"
              onClick={cancelRecording}
              className="cancel-recording-button"
              title="Отменить запись"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                editingMessageId 
                  ? "Редактируйте сообщение..." 
                  : replyingToMessage 
                    ? "Напишите ответ..." 
                    : "Введите сообщение..."
              }
              className="message-input"
            />
            <button type="submit" className="send-button">
              {editingMessageId ? 'Сохранить' : replyingToMessage ? 'Отправить' : 'Отправить'}
            </button>
          </>
        )}
        
        {!editingMessageId && (
          <>
            {/* Голосовые сообщения - кнопка записи как в Telegram */}
            {((!isServerChat || userPermissions?.sendVoiceMessages) || isServerOwner) && (
                              <div className="voice-message-wrapper">
                  {isRecording && (
                    <button 
                      type="button"
                      onClick={cancelRecording}
                      className="cancel-recording-button-left"
                      title="Отменить запись"
                    >
                      Отменить
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAudioRecording}
                    className={`voice-record-button ${isRecording ? 'recording' : ''}`}
                    title={isRecording ? "Нажмите для остановки и отправки" : "Нажмите для начала записи"}
                  >
                    {isRecording ? <StopIcon /> : <MicIcon />}
                  </button>
                </div>
            )}
            
            {/* Загрузка файлов */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleSendMedia(e.target.files[0])}
              accept="image/*, video/*, audio/*"
            />
            {((!isServerChat || userPermissions?.attachFiles) || isServerOwner) && (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="media-button"
              >
                <AttachFileIcon />
              </button>
            )}
          </>
        )}
      </form>
      <ForwardModal />
      
      {/* Модальное окно выбора типа звонка */}
      <CallTypeModal
        isOpen={isCallTypeModalOpen}
        onClose={() => setIsCallTypeModalOpen(false)}
        onCallWithNotification={handleCallWithNotification}
        onCallWithoutNotification={handleCallWithoutNotification}
        targetUser={groupName}
      />
    </div>
  );
};

export default GroupChat;