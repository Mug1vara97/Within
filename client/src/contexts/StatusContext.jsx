import React, { createContext, useContext, useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { BASE_URL } from '../config/apiConfig';
import statusService from '../services/statusService';

const StatusContext = createContext();

export const StatusProvider = ({ children, userId }) => {
    const [userStatuses, setUserStatuses] = useState({});
    const [connection, setConnection] = useState(null);

    // Инициализация SignalR соединения
    useEffect(() => {
        if (!userId) return;

        const createConnection = async () => {
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${BASE_URL}/statushub?userId=${userId}`)
                .withAutomaticReconnect([0, 2000, 10000, 30000]) // Настраиваем интервалы переподключения
                .build();

            // Обработчик переподключения
            newConnection.onreconnecting((error) => {
                console.log('StatusHub: Переподключение...', error);
            });

            newConnection.onreconnected(() => {
                console.log('StatusHub: Переподключение успешно');
            });

            newConnection.onclose((error) => {
                console.log('StatusHub: Соединение закрыто', error);
                // При закрытии соединения не пытаемся переподключиться
                setConnection(null);
            });

            try {
                await newConnection.start();
                console.log('StatusHub соединение установлено');
                setConnection(newConnection);

                // Подписываемся на события изменения статуса
                newConnection.on('UserStatusChanged', (userId, status) => {
                    console.log(`StatusContext: User ${userId} status changed to ${status}`);
                    setUserStatuses(prev => ({
                        ...prev,
                        [userId]: status
                    }));
                });

                newConnection.on('UserActivity', (userId, lastSeen) => {
                    // Можно добавить логику для обновления времени последней активности
                    console.log(`StatusContext: User ${userId} activity: ${lastSeen}`);
                });

            } catch (err) {
                console.error('Ошибка подключения к StatusHub:', err);
            }
        };

        createConnection();

        // Обработчик закрытия страницы/приложения
        const handleBeforeUnload = () => {
            if (connection) {
                console.log('StatusContext: Приложение закрывается, отключаем соединение');
                connection.stop();
            }
        };

        // Обработчик видимости страницы
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                console.log('StatusContext: Страница скрыта, устанавливаем статус idle');
                // Устанавливаем статус idle при скрытии страницы
                if (connection && userId) {
                    try {
                        await statusService.updateUserStatus(userId, 'idle');
                        setUserStatuses(prev => ({
                            ...prev,
                            [userId]: 'idle'
                        }));
                    } catch (error) {
                        console.error('Error setting idle status:', error);
                    }
                }
            } else {
                console.log('StatusContext: Страница снова видна, восстанавливаем статус online');
                // Восстанавливаем статус online при возвращении на страницу
                if (connection && userId) {
                    try {
                        await statusService.updateUserStatus(userId, 'online');
                        setUserStatuses(prev => ({
                            ...prev,
                            [userId]: 'online'
                        }));
                    } catch (error) {
                        console.error('Error restoring online status:', error);
                    }
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (connection) {
                console.log('StatusContext: Очистка соединения');
                connection.stop();
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Получить статус пользователя
    const getUserStatus = (userId) => {
        return userStatuses[userId] || 'offline';
    };

    // Обновить статус пользователя
    const updateUserStatus = async (userId, status) => {
        try {
            await statusService.updateUserStatus(userId, status);
            setUserStatuses(prev => ({
                ...prev,
                [userId]: status
            }));

            // Уведомляем других пользователей через SignalR
            if (connection) {
                await connection.invoke('NotifyStatusChange', userId, status);
            }
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    // Загрузить статусы пользователей сервера
    const loadServerUserStatuses = async (serverId) => {
        try {
            const statuses = await statusService.getServerUserStatuses(serverId);
            const statusesMap = {};
            statuses.forEach(user => {
                statusesMap[user.userId] = user.status;
            });
            setUserStatuses(prev => ({ ...prev, ...statusesMap }));
        } catch (error) {
            console.error('Error loading server user statuses:', error);
        }
    };

    // Загрузить статусы пользователей чата
    const loadChatUserStatuses = async (chatId) => {
        try {
            const statuses = await statusService.getChatUserStatuses(chatId);
            const statusesMap = {};
            statuses.forEach(user => {
                statusesMap[user.userId] = user.status;
            });
            setUserStatuses(prev => ({ ...prev, ...statusesMap }));
            console.log(`Loaded statuses for chat ${chatId}:`, statusesMap);
        } catch (error) {
            console.error('Error loading chat user statuses:', error);
        }
    };

    // Присоединиться к группе сервера
    const joinServerGroup = async (serverId) => {
        if (connection) {
            try {
                await connection.invoke('JoinServerGroup', serverId);
            } catch (error) {
                console.error('Error joining server group:', error);
            }
        }
    };

    // Покинуть группу сервера
    const leaveServerGroup = async (serverId) => {
        if (connection) {
            try {
                await connection.invoke('LeaveServerGroup', serverId);
            } catch (error) {
                console.error('Error leaving server group:', error);
            }
        }
    };

    const value = {
        userStatuses,
        getUserStatus,
        updateUserStatus,
        loadServerUserStatuses,
        loadChatUserStatuses,
        joinServerGroup,
        leaveServerGroup,
        connection
    };

    return (
        <StatusContext.Provider value={value}>
            {children}
        </StatusContext.Provider>
    );
};

export const useStatus = () => {
    const context = useContext(StatusContext);
    if (!context) {
        throw new Error('useStatus must be used within a StatusProvider');
    }
    return context;
}; 