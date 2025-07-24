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
                .withAutomaticReconnect()
                .build();

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

                // Обработка потери соединения
                newConnection.onclose(async () => {
                    console.log('StatusHub connection lost, setting status to offline');
                    try {
                        await statusService.updateUserStatus(userId, 'offline');
                    } catch (error) {
                        console.error('Error setting offline status on connection loss:', error);
                    }
                });

            } catch (err) {
                console.error('Ошибка подключения к StatusHub:', err);
            }
        };

        createConnection();

        return () => {
            if (connection) {
                connection.stop();
            }
        };
    }, []);

    // Обработка событий закрытия браузера и изменения видимости
    useEffect(() => {
        if (!userId || !connection) return;

        let inactivityTimer = null;

        const handleBeforeUnload = async () => {
            try {
                console.log('User is leaving the page, setting status to offline');
                await statusService.updateUserStatus(userId, 'offline');
                if (connection) {
                    await connection.invoke('NotifyStatusChange', userId, 'offline');
                }
            } catch (error) {
                console.error('Error setting offline status:', error);
            }
        };

        const handleVisibilityChange = async () => {
            try {
                if (document.hidden) {
                    console.log('Page is hidden, setting status to idle');
                    await statusService.updateUserStatus(userId, 'idle');
                    if (connection) {
                        await connection.invoke('NotifyStatusChange', userId, 'idle');
                    }
                } else {
                    console.log('Page is visible, setting status to online');
                    await statusService.updateUserStatus(userId, 'online');
                    if (connection) {
                        await connection.invoke('NotifyStatusChange', userId, 'online');
                    }
                }
            } catch (error) {
                console.error('Error updating status on visibility change:', error);
            }
        };

        const resetInactivityTimer = async () => {
            // Очищаем предыдущий таймер
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }

            // Устанавливаем статус "онлайн" при активности
            try {
                await statusService.updateUserStatus(userId, 'online');
                if (connection) {
                    await connection.invoke('NotifyStatusChange', userId, 'online');
                }
            } catch (error) {
                console.error('Error setting online status:', error);
            }

            // Устанавливаем таймер на 5 минут неактивности
            inactivityTimer = setTimeout(async () => {
                try {
                    console.log('User inactive for 5 minutes, setting status to idle');
                    await statusService.updateUserStatus(userId, 'idle');
                    if (connection) {
                        await connection.invoke('NotifyStatusChange', userId, 'idle');
                    }
                } catch (error) {
                    console.error('Error setting idle status:', error);
                }
            }, 5 * 60 * 1000); // 5 минут
        };

        // Обработчики активности пользователя
        const handleUserActivity = () => {
            resetInactivityTimer();
        };

        // Добавляем обработчики событий
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);



        // Устанавливаем статус "онлайн" при загрузке страницы и запускаем таймер
        resetInactivityTimer();

        // Периодически отправляем сигнал активности каждые 30 секунд
        const activityInterval = setInterval(async () => {
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                try {
                    await connection.invoke('NotifyUserActivity', userId);
                } catch (error) {
                    console.error('Error sending activity signal:', error);
                }
            }
        }, 30000); // 30 секунд

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            
            if (activityInterval) {
                clearInterval(activityInterval);
            }
        };
    }, [userId, connection]);

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