import React, { useEffect, useState, useRef, useCallback } from 'react';
import ServerSidebar from './ServerSidebar';
import { BASE_URL } from './config/apiConfig';
import Modals from './Modals/Modals';
import { HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';

const ServerPage = ({ username, userId, serverId, initialChatId, onChatSelected, voiceRoom, isMuted, isAudioEnabled, onToggleMute, onToggleAudio }) => {
    const [server, setServer] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const [users, setUsers] = useState([]);
    const contextMenuRef = useRef(null);
    const [userPermissions, setUserPermissions] = useState({});
    const [isServerOwner, setIsServerOwner] = useState(false);
    const [connection, setConnection] = useState(null);
    const [roles, setRoles] = useState([]);
    const [userRoles, setUserRoles] = useState([]);

    const updateServerState = useCallback((updater) => {
        setServer(prev => {
            const newState = typeof updater === 'function' ? updater(prev) : updater;
            return newState;
        });
    }, []);

    // Добавляем функцию для агрегации прав
    const aggregatePermissions = useCallback((roles) => {
        return roles.reduce((acc, role) => {
            try {
                const permissions = typeof role.permissions === 'string' 
                    ? JSON.parse(role.permissions) 
                    : role.permissions;
                
                Object.entries(permissions).forEach(([key, value]) => {
                    if (value) acc[key] = true;
                });
            } catch (e) {
                console.error('Error processing permissions:', e);
            }
            return acc;
        }, {});
    }, []);
    
    useEffect(() => {
        const newConnection = new HubConnectionBuilder()
            .withUrl(`${BASE_URL}/serverhub`, {
                skipNegotiation: true,
                transport: HttpTransportType.WebSockets,
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        newConnection.onclose((error) => {
            console.log('SignalR connection closed:', error);
        });

        newConnection.onreconnecting((error) => {
            console.log('SignalR reconnecting:', error);
        });

        newConnection.onreconnected((connectionId) => {
            console.log('SignalR reconnected:', connectionId);
            if (serverId) {
                newConnection.invoke("JoinServerGroup", serverId.toString())
                    .catch(console.error);
            }
        });

        setConnection(newConnection);

        return () => {
            if (newConnection) {
                newConnection.stop();
            }
        };
    }, []);

    useEffect(() => {
        const startConnection = async () => {
            if (connection && serverId) {
                try {
                    if (connection.state === 'Disconnected') {
                        console.log('Starting connection...');
                        await connection.start();
                        console.log('SignalR connected:', connection.state);
                        
                        await connection.invoke("JoinServerGroup", serverId.toString());
                        console.log('Joined server group:', serverId);
                        
                        await loadUserPermissions();
                    }
                } catch (err) {
                    console.error('Connection failed:', err);
                    // Пробуем переподключиться через 5 секунд
                    setTimeout(startConnection, 5000);
                }
            }
        };

        startConnection();
    }, [connection, serverId]);

    useEffect(() => {
        if (!connection) return;

        const handlers = {
            "CategoriesReordered": (updatedCategories) => {
                console.log('CategoriesReordered received:', updatedCategories);
                setServer(prev => {
                    const newState = { 
                        ...prev, 
                        categories: updatedCategories.map(cat => ({
                            ...cat,
                            chats: (cat.chats || []).map(chat => ({
                                ...chat,
                                chatId: parseInt(chat.chatId, 10),
                                categoryId: parseInt(cat.categoryId, 10)
                            }))
                        }))
                    };
                    console.log('New server state:', newState);
                    return newState;
                });
            },
            "ChatsReordered": (updatedCategories) => {
                console.log('ChatsReordered received:', updatedCategories);
                setServer(prev => {
                    const newState = { 
                        ...prev, 
                        categories: updatedCategories.map(cat => ({
                            ...cat,
                            chats: (cat.chats || []).map(chat => ({
                                ...chat,
                                chatId: parseInt(chat.chatId, 10),
                                categoryId: parseInt(cat.categoryId, 10)
                            }))
                        }))
                    };
                    console.log('New server state:', newState);
                    return newState;
                });
            },
            "ChatUpdated": (updatedChat) => {
                setServer(prev => ({
                    ...prev,
                    categories: prev.categories.map(cat => 
                        cat.categoryId === updatedChat.categoryId ? 
                        { ...cat, chats: cat.chats.map(chat => 
                            chat.chatId === updatedChat.chatId ? updatedChat : chat) } 
                        : cat
                    )
                }));
            },
            
            "CategoryCreated": (newCategory) => {
                setServer(prev => ({
                    ...prev,
                    categories: [...prev.categories, newCategory]
                        .sort((a, b) => a.categoryOrder - b.categoryOrder)
                }));
            },
            "CategoryDeleted": (deletedCategoryId) => {
                setServer(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        categories: prev.categories ? prev.categories.filter(c => c.categoryId !== deletedCategoryId) : []
                    };
                });
            },
            "ChatDeleted": (deletedChatId, categoryId) => {
                setServer(prev => ({
                    ...prev,
                    categories: prev.categories.map(cat => 
                        cat.categoryId === categoryId ? 
                        { ...cat, chats: cat.chats.filter(chat => chat.chatId !== deletedChatId) } 
                        : cat
                    )
                }));
            },
           "ServerMembersLoaded": (loadedMembers) => {
                // Обрабатываем загруженных участников сервера
                if (server) {
                    setServer(prev => ({
                        ...prev,
                        members: loadedMembers
                    }));
                }
            },

          "RolesLoaded": (loadedRoles) => {
                setRoles(loadedRoles);
            },

          "UserRolesLoaded": (roles) => {
                console.log('Received user roles via SignalR:', roles);
                
                if (!roles || !Array.isArray(roles)) {
                    console.error('Invalid roles format received');
                    return;
                }
                
                roles.forEach((role, index) => {
                    console.log(`Role ${index + 1}:`, {
                        id: role.roleId,
                        name: role.roleName,
                        permissions: role.permissions
                    });
                });
                
                // Store the role IDs
                setUserRoles(roles.map(role => role.roleId));
                
                const mergedPermissions = aggregatePermissions(roles);
                console.log('Merged permissions from SignalR:', mergedPermissions);
                setUserPermissions(mergedPermissions);
                localStorage.setItem(`permissions-${serverId}`, JSON.stringify(mergedPermissions));
            },

          "RoleAssigned": (assignedUserId, roleData) => {
            setServer(prev => {
                if (!prev) return null;
                
                const updatedMembers = prev.members ? prev.members.map(m => 
                    m.userId === assignedUserId 
                        ? { 
                            ...m, 
                            roles: [...(m.roles || []), roleData]
                        } 
                        : m
                ) : [];

                // Обновляем права только для текущего пользователя
                if (assignedUserId === userId) {
                    const newRoles = [...(updatedMembers.find(m => m.userId === userId)?.roles || []), roleData];
                    const merged = aggregatePermissions(newRoles);
                    setUserPermissions(merged);
                    localStorage.setItem(`permissions-${serverId}`, JSON.stringify(merged));
                }

                return {
                    ...prev,
                    members: updatedMembers
                };
            });

            // Обновляем список участников сервера
            connection.invoke("GetServerMembers", parseInt(serverId, 10))
                .catch(error => console.error('Error updating server members:', error));
        },
        "RoleRemoved": (removedUserId, roleId) => {
            setServer(prev => {
                if (!prev) return null;
                
                const updatedMembers = prev.members ? prev.members.map(m => 
                    m.userId === removedUserId 
                        ? { 
                            ...m, 
                            roles: (m.roles || []).filter(r => r.roleId !== roleId)
                        } 
                        : m
                ) : [];

                // Обновляем права только для текущего пользователя
                if (removedUserId === userId) {
                    const newRoles = updatedMembers.find(m => m.userId === userId)?.roles.filter(r => r.roleId !== roleId) || [];
                    const merged = aggregatePermissions(newRoles);
                    setUserPermissions(merged);
                    localStorage.setItem(`permissions-${serverId}`, JSON.stringify(merged));
                }

                return {
                    ...prev,
                    members: updatedMembers
                };
            });

            // Обновляем список участников сервера
            connection.invoke("GetServerMembers", parseInt(serverId, 10))
                .catch(error => console.error('Error updating server members:', error));
        },

        "ServerNameUpdated": (serverId, newName) => {
            setServer(prev => ({
                ...prev,
                name: newName
            }));
        },

        "MemberKicked": (kickedUserId) => {
            setServer(prev => {
                if (!prev || !prev.members) return prev;
                return {
                    ...prev,
                    members: prev.members.filter(m => m.userId !== kickedUserId)
                };
            });
        },

        "UserRolesError": (error) => {
            console.error('Error loading user roles:', error);
        },

        "UserPermissionsUpdated": (updatedUserId, updatedPermissions) => {
            // Обновляем права только для конкретного пользователя в списке участников
            setServer(prev => ({
                ...prev,
                members: prev.members.map(m => 
                    m.userId === updatedUserId
                        ? { ...m, permissions: updatedPermissions }
                        : m
                )
            }));

            // Если это текущий пользователь, обновляем его права
            if (updatedUserId === userId) {
                setUserPermissions(updatedPermissions);
                localStorage.setItem(`permissions-${serverId}`, JSON.stringify(updatedPermissions));
            }
        },

        "MemberAdded": (member) => {
            setServer(prev => ({
                ...prev,
                members: [...(prev.members || []), {
                    userId: member.userId,
                    username: member.username,
                    roles: []
                }]
            }));

            // Обновляем список участников сервера
            connection.invoke("GetServerMembers", parseInt(serverId, 10))
                .catch(error => console.error('Error updating server members:', error));
        }
    };

    Object.entries(handlers).forEach(([name, handler]) => {
        connection.on(name, handler);
    });

    return () => {
        Object.entries(handlers).forEach(([name, handler]) => {
            connection.off(name, handler);
        });
    };
}, [connection]);

const loadUserPermissions = useCallback(async () => {
    if (!connection || !serverId || !userId) return;
    
    try {
        console.log('Requesting user roles...');
        await connection.invoke("GetUserRoles", 
            parseInt(userId, 10), 
            parseInt(serverId, 10)
        );
    } catch (err) {
        console.error('Permissions load error:', err);
    }
}, [connection, serverId, userId]);

useEffect(() => {
    if (connection && connection.state === 'Connected') {
        loadUserPermissions();
    }
}, [connection, loadUserPermissions]);

  
  useEffect(() => {
    if (!connection) return;
  
    const errorHandler = (error) => {
      console.error('Chat creation error:', error);
      alert(`Ошибка создания чата: ${error}`);
    };
  
    connection.on("ChatCreatedError", errorHandler);
    return () => connection.off("ChatCreatedError", errorHandler);
  }, [connection]);
  

  useEffect(() => {
    if (!connection) return;

    const handlePermissionsUpdate = (updatedUserId, updatedPermissions) => {
        // Обновляем права только для текущего пользователя, если это он
        if (updatedUserId === userId) {
            console.log('Updating permissions for current user:', updatedPermissions);
            setUserPermissions(updatedPermissions);
            localStorage.setItem(`permissions-${serverId}`, JSON.stringify(updatedPermissions));
        }
        
        // Обновляем права только для конкретного пользователя в списке участников
        setServer(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                members: prev.members?.map(m => 
                    m.userId === updatedUserId
                        ? { ...m, permissions: updatedPermissions }
                        : m
                ) || []
            };
        });
    };

    connection.on("UserPermissionsUpdated", handlePermissionsUpdate);
    
    return () => {
        connection.off("UserPermissionsUpdated", handlePermissionsUpdate);
    };
}, [connection, userId, serverId]);

// Состояния контекстных меню
const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
const [contextMenuCategory, setContextMenuCategory] = useState({
    visible: false,
    x: 0,
    y: 0,
    categoryId: null,
    categoryName: ''
});
const [contextMenuChat, setContextMenuChat] = useState({
    visible: false,
    x: 0,
    y: 0,
    chatId: null,
    chatName: '',
    chatType: null
});

// Состояния модальных окон
const [newChatName, setNewChatName] = useState('');
const [newCategoryName, setNewCategoryName] = useState('');
const [modalsState, setModalsState] = useState({
    showAddMemberModal: false,
    showCreateChatModal: { isOpen: false, categoryId: null, chatType: 3 },
    showChatSettingsModal: { isOpen: false, chatId: null, chatName: '' },
    showCreateCategoryModal: false,
    showDeleteCategoryModal: false,
    showServerSettings: false
});

// Загрузка данных сервера
const fetchServerData = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/messages/zxc/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            setServer(data);
            setIsServerOwner(data.ownerId === userId);
            
            // Запрашиваем роли пользователя через SignalR
            if (connection) {
                try {
                    await connection.invoke("GetUserRoles", parseInt(userId, 10), parseInt(serverId, 10));
                } catch (err) {
                    console.error('Error fetching user roles:', err);
                }
            }
            
            // Если есть initialChatId, выбираем соответствующий чат
            if (initialChatId) {
                const foundChat = data.categories
                    .flatMap(cat => cat.chats)
                    .find(c => c.chatId === parseInt(initialChatId));
                
                if (foundChat) {
                    handleChatSelect(foundChat);
                }
            }
        }
    } catch (err) {
        console.error('Error fetching server data:', err);
    }
};

// Загрузка пользователей
const fetchUsers = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/messages/${serverId}/available-users?userId=${userId}`);
        if (response.ok) {
            const data = await response.json();
            setUsers(data);
        }
    } catch (err) {
        console.error('Error fetching users:', err);
    }
};

// Обработчики действий
const handleAddMember = async (userIdToAdd) => {
    try {
        const response = await fetch(`${BASE_URL}/api/messages/${serverId}/add-member`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ RequestingUserId: userId, UserIdToAdd: userIdToAdd }),
        });

        if (response.ok) {
            alert('User added successfully');
            setModalsState(prev => ({ ...prev, showAddMemberModal: false }));
            fetchServerData();
        } else {
            alert('Failed to add user: ' + (await response.text()));
        }
    } catch (err) {
        alert('Failed to add user: ' + err.message);
    }
};

const handleCreateChat = async () => {
    if (!newChatName.trim()) {
        alert('Название чата не может быть пустым');
        return;
    }

    try {
        await connection.invoke("CreateChat", 
            parseInt(serverId, 10),
            modalsState.showCreateChatModal.categoryId || null,
            newChatName,
            modalsState.showCreateChatModal.chatType
        );

            setNewChatName('');
            setModalsState(prev => ({ 
                ...prev, 
                showCreateChatModal: { isOpen: false, categoryId: null, chatType: 3 }
            }));
    } catch (err) {
        console.error('Ошибка при создании чата:', err);
        alert('Не удалось создать чат: ' + err.message);
    }
};

// Обновление названия чата
const handleUpdateChatName = async (chatId, newName) => {
    try {
        await connection.invoke("UpdateChatName", 
            parseInt(serverId, 10), 
            chatId, 
            newName
        );
    } catch (err) {
        alert(`Ошибка обновления: ${err.message}`);
    }
};

// Удаление чата
const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот чат?')) return;
    
    try {
        await connection.invoke("DeleteChat", 
            parseInt(serverId, 10), 
            chatId
        );
    } catch (err) {
        alert(`Ошибка удаления: ${err.message}`);
    }
};

// Удаление категории

// Создание категории
const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
        alert('Название категории не может быть пустым');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/server/${serverId}/create-category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryName: newCategoryName }),
        });

        if (response.ok) {
            setNewCategoryName('');
            setModalsState(prev => ({ ...prev, showCreateCategoryModal: false }));
            fetchServerData();
        } else {
            const errorData = await response.json();
            alert(`Ошибка: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Ошибка при создании категории:', error);
        alert('Не удалось создать категорию');
    }
};

// Обработчик контекстного меню
const handleContextMenu = (e) => {
    if (e.target.className.includes('server-sidebar') || 
        e.target.className.includes('tree') || 
        e.target.className.includes('no-chat-selected')) {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    }
};

// Обработчик контекстного меню категории
const handleCategoryContextMenu = (e, categoryId, categoryName) => {
    if (e.target.closest('.channel-list') || e.target.closest('.channel')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setModalsState(prev => ({
        ...prev,
        contextMenuCategory: { // Сохраняем в состоянии модалок
            categoryId,
            categoryName
        }
    }));
    
    setContextMenuCategory({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        categoryId,
        categoryName
    });
};

const handleDeleteCategory = async (categoryId) => {
    if (!connection) {
        alert("Нет соединения с сервером");
        return;
    }
    
    try {
        await connection.invoke("DeleteCategory", 
            Number(serverId),
            Number(categoryId)
        );
    } catch (err) {
        alert(`Ошибка удаления: ${err.message}`);
    }
};

// Обработчик контекстного меню чата
const handleChatContextMenu = (e, chatId, chatName, chatType) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenuChat({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        chatId,
        chatName,
        chatType
    });
    
    // Скрываем другие меню
    setContextMenu({ visible: false });
    setContextMenuCategory({ visible: false });
};

// Дополняем useEffect обработкой Escape
useEffect(() => {
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setContextMenu({ visible: false });
            setContextMenuCategory({ visible: false });
            setContextMenuChat({ visible: false });
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

// Остальные обработчики (handleCreateChat, handleDeleteCategory и т.д.) аналогично

useEffect(() => {
    fetchServerData();
}, [serverId]);

// Обработчики закрытия контекстных меню
useEffect(() => {
    const handleClickOutside = (event) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
            setContextMenu({ visible: false, x: 0, y: 0 });
            setContextMenuCategory({ visible: false, x: 0, y: 0, categoryId: null, categoryName: '' });
            setContextMenuChat({ visible: false, x: 0, y: 0, chatId: null, chatName: '', chatType: null });
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// Обработчик выбора чата
const handleChatSelect = (chat) => {
    console.log('ServerPage handleChatSelect received:', chat);
    
    // Нормализуем данные о чате
    let normalizedChat = { ...chat };
    
    // Обрабатываем разные форматы данных
    if (chat.typeId && !chat.chatType) {
        normalizedChat.chatType = chat.typeId;
    }
    
    if (chat.name && !chat.groupName) {
        normalizedChat.groupName = chat.name;
    }
    
    console.log('Normalized chat data:', normalizedChat);
    
    const enhancedChat = {
        ...normalizedChat,
        userPermissions,
        isServerOwner
    };
    
    console.log('ServerPage enhanced chat:', enhancedChat);
    
    setSelectedChat(enhancedChat);
    
    // Вызываем колбэк, если он предоставлен
    if (onChatSelected) {
        console.log('Calling onChatSelected with:', enhancedChat);
        onChatSelected(enhancedChat);
    } else {
        console.log('onChatSelected is not defined');
    }
};

// Обработчик события исключения участника
const handleMemberKicked = (kickedUserId) => {
    setServer(prev => {
        if (!prev || !prev.members) return prev;
        return {
            ...prev,
            members: prev.members.filter(m => m.userId !== kickedUserId)
        };
    });
};

useEffect(() => {
    if (connection) {
        connection.on("MemberKicked", handleMemberKicked);

        return () => {
            connection.off("MemberKicked", handleMemberKicked);
        };
    }
}, [connection]);

const handleKickMember = async (memberId) => {
    try {
        const serverIdNum = parseInt(serverId, 10);
        const memberIdNum = parseInt(memberId, 10);
        const currentUserIdNum = parseInt(userId, 10);

        if (isNaN(serverIdNum) || isNaN(memberIdNum) || isNaN(currentUserIdNum)) {
            throw new Error('Invalid ID values');
        }

        await connection.invoke("KickMember", serverIdNum, memberIdNum, currentUserIdNum);
        
        // Обновляем локальное состояние после успешного исключения
        handleMemberKicked(memberIdNum);
    } catch (err) {
        console.error('Error kicking member:', err);
        alert('Ошибка при исключении участника');
    }
};

if (!server) return <div>Loading...</div>;

return (
    <div className="server-page" style={{ display: 'flex', width: '100%', height: '100%' }} onContextMenu={handleContextMenu}>
            <ServerSidebar 
                server={server}
                serverId={serverId}
                userId={userId}
                username={username}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
                setModalsState={setModalsState}
                setContextMenuCategory={setContextMenuCategory}
                setContextMenuChat={setContextMenuChat}
                fetchUsers={fetchUsers}
                fetchServerData={fetchServerData}
                userPermissions={userPermissions}
                isServerOwner={isServerOwner}
                connection={connection}
                userRoles={userRoles}
                onChatSelect={handleChatSelect}
                onContextMenu={handleContextMenu}
                onChatContextMenu={handleChatContextMenu}
                onCategoryContextMenu={handleCategoryContextMenu}
                voiceRoom={voiceRoom}
                isMuted={isMuted}
                isAudioEnabled={isAudioEnabled}
                onToggleMute={onToggleMute}
                onToggleAudio={onToggleAudio}
            />

            <Modals
                modalsState={modalsState}
                setModalsState={setModalsState}
                contextMenu={contextMenu}
                contextMenuCategory={contextMenuCategory}
                contextMenuChat={contextMenuChat}
                setContextMenu={setContextMenu}
                setContextMenuCategory={setContextMenuCategory}
                setContextMenuChat={setContextMenuChat}
                newChatName={newChatName}
                setNewChatName={setNewChatName}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                handleAddMember={handleAddMember}
                serverId={serverId}
                userId={userId}
                users={users}
                fetchServerData={fetchServerData}
                handleCreateChat={handleCreateChat}
                handleUpdateChatName={handleUpdateChatName}
                handleDeleteChat={handleDeleteChat}
                handleDeleteCategory={handleDeleteCategory}
                handleCreateCategory={handleCreateCategory}
                userPermissions={userPermissions}
                isServerOwner={isServerOwner}
                serverMembers={server?.members || []}
                connection={connection}
                setUserPermissions={setUserPermissions}
                aggregatePermissions={aggregatePermissions}
                roles={roles}
                server={server}
                updateServerState={updateServerState}
                onKickMember={handleKickMember}
            />
    </div>
);
};

export default ServerPage;