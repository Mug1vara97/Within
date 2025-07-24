import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { BASE_URL } from '../config/apiConfig';
import statusService from '../services/statusService';

const StatusContext = createContext();

export const StatusProvider = ({ children, userId }) => {
    const [userStatuses, setUserStatuses] = useState({});
    const [connection, setConnection] = useState(null);
    const [isUserActive, setIsUserActive] = useState(true);

    // Обработчик закрытия вкладки
    useEffect(() => {
        const handleBeforeUnload = async () => {
            if (userId) {
                try {
                    // Используем sendBeacon для надежной отправки статуса offline
                    const data = JSON.stringify({ status: 'offline' });
                    const url = `${BASE_URL}/api/status/${userId}`;
                    
                    // Отправляем запрос через sendBeacon (более надежно при закрытии вкладки)
                    if (navigator.sendBeacon) {
                        const blob = new Blob([data], { type: 'application/json' });
                        const success = navigator.sendBeacon(url, blob);
                        console.log('StatusContext: User status set to offline via sendBeacon', success);
                    } else {
                        // Fallback для старых браузеров
                        await statusService.updateUserStatus(userId, 'offline');
                        console.log('StatusContext: User status set to offline via fetch');
                    }
                } catch (error) {
                    console.error('Error setting user status to offline:', error);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Страница стала невидимой (переключение вкладок)
                setIsUserActive(false);
            } else {
                // Страница снова стала видимой
                setIsUserActive(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [userId]);

    // Инициализация SignalR соединения
    useEffect(() => {
        if (!userId) return;

        const createConnection = async () => {
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${BASE_URL}/statushub?userId=${userId}`)
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: retryContext => {
                        // Если пользователь не активен, не переподключаемся
                        if (!isUserActive) {
                            return null; // Остановить переподключение
                        }
                        return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                    }
                })
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

                // Обработчик переподключения
                newConnection.onreconnecting(() => {
                    console.log('StatusContext: Attempting to reconnect...');
                });

                newConnection.onreconnected(() => {
                    console.log('StatusContext: Reconnected successfully');
                    // При переподключении устанавливаем статус online только если пользователь активен
                    if (isUserActive && userId) {
                        setUserOnline();
                    }
                });

                // Обработчик потери соединения
                newConnection.onclose(() => {
                    console.log('StatusContext: Connection closed');
                    // При потере соединения устанавливаем статус offline
                    if (userId) {
                        statusService.updateUserStatus(userId, 'offline').catch(error => {
                            console.error('Error setting status to offline on connection close:', error);
                        });
                    }
                });

                // При первом подключении устанавливаем статус online
                if (isUserActive && userId) {
                    setUserOnline();
                }

                // Загружаем актуальные статусы всех пользователей из базы данных
                await loadAllUserStatuses();

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
    }, [userId, isUserActive]);

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

    // Установить статус online при активном использовании
    const setUserOnline = async () => {
        if (userId && isUserActive) {
            try {
                await statusService.updateUserStatus(userId, 'online');
                setUserStatuses(prev => ({
                    ...prev,
                    [userId]: 'online'
                }));

                // Уведомляем других пользователей через SignalR
                if (connection) {
                    await connection.invoke('NotifyStatusChange', userId, 'online');
                }
                console.log('StatusContext: User status set to online due to activity');
            } catch (error) {
                console.error('Error setting user status to online:', error);
            }
        }
    };

    // Дебаунсинг для активности пользователя
    const debouncedSetUserOnline = useRef(null);
    const debouncedSetUserOnlineFn = () => {
        if (debouncedSetUserOnline.current) {
            clearTimeout(debouncedSetUserOnline.current);
        }
        debouncedSetUserOnline.current = setTimeout(() => {
            setUserOnline();
        }, 1000); // Задержка 1 секунда
    };

    // Обработчик активности пользователя
    useEffect(() => {
        if (!userId || !isUserActive) return;

        const handleUserActivity = () => {
            debouncedSetUserOnlineFn();
        };

        // Слушаем события активности пользователя
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, handleUserActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleUserActivity);
            });
            if (debouncedSetUserOnline.current) {
                clearTimeout(debouncedSetUserOnline.current);
            }
        };
    }, [userId, isUserActive]);

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

    // Загрузить статусы всех пользователей
    const loadAllUserStatuses = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/status/all`);
            if (response.ok) {
                const allStatuses = await response.json();
                const statusesMap = {};
                allStatuses.forEach(user => {
                    statusesMap[user.userId] = user.status;
                });
                setUserStatuses(prev => ({ ...prev, ...statusesMap }));
                console.log('Loaded all user statuses:', statusesMap);
            }
        } catch (error) {
            console.error('Error loading all user statuses:', error);
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
        setUserOnline,
        isUserActive,
        loadServerUserStatuses,
        loadChatUserStatuses,
        loadAllUserStatuses,
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