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
                    setUserStatuses(prev => ({
                        ...prev,
                        [userId]: status
                    }));
                });

                newConnection.on('UserActivity', (userId, lastSeen) => {
                    // Можно добавить логику для обновления времени последней активности
                    console.log(`User ${userId} activity: ${lastSeen}`);
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