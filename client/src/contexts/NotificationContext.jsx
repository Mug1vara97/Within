import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import * as signalR from '@microsoft/signalr';

const NotificationContext = createContext();

export { NotificationContext };

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const connectionRef = useRef(null);
    const userIdRef = useRef(null);

    // Инициализация SignalR соединения
    const initializeConnection = useCallback((userId) => {
        if (connectionRef.current) {
            connectionRef.current.stop();
        }

        userIdRef.current = userId;
        
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`/notificationhub?userId=${userId}`)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveNotification", (notification) => {
            console.log("Received notification:", notification);
            // Добавляем уведомление только если оно непрочитанное
            if (!notification.isRead) {
                setNotifications(prev => {
                    const newNotifications = [notification, ...prev];
                    console.log("Updated notifications:", newNotifications);
                    return newNotifications;
                });
                setUnreadCount(prev => {
                    const newCount = prev + 1;
                    console.log("Updated unread count:", newCount);
                    return newCount;
                });
            }
            
            // Показываем desktop уведомление только для непрочитанных
            if (!notification.isRead && Notification.permission === "granted") {
                new Notification("Новое сообщение", {
                    body: notification.content,
                    icon: "/vite.svg"
                });
            }
        });

        connection.on("UnreadCountChanged", (count) => {
            console.log("Unread count changed:", count);
            setUnreadCount(count);
        });

        connection.on("MessageRead", (chatId, messageId) => {
            console.log(`Message ${messageId} read in chat ${chatId}`);
            // Удаляем уведомления для этого сообщения из списка
            setNotifications(prev => prev.filter(n => !(n.chatId === chatId && n.messageId === messageId)));
        });

        connection.start()
            .then(() => {
                console.log("Connected to NotificationHub");
            })
            .catch(err => {
                console.error("Error connecting to NotificationHub:", err);
            });

        connectionRef.current = connection;
    }, []);

    // Загрузка уведомлений
    const loadNotifications = useCallback(async (userId, page = 1, append = false, unreadOnly = true) => {
        if (!userId) return;
        
        setIsLoading(true);
        try {
            console.log('Loading notifications for user:', userId, 'page:', page, 'unreadOnly:', unreadOnly);
            const data = await notificationService.getNotifications(userId, page, unreadOnly);
            console.log('Loaded notifications:', data);
            
            if (append) {
                setNotifications(prev => [...prev, ...data]);
            } else {
                setNotifications(data);
            }
            
            setCurrentPage(page);
            setHasMore(data.length === 20); // Предполагаем, что pageSize = 20
        } catch (error) {
            console.error("Error loading notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Загрузка счетчика непрочитанных
    const loadUnreadCount = useCallback(async (userId) => {
        if (!userId) return;
        
        try {
            const count = await notificationService.getUnreadCount(userId);
            setUnreadCount(count);
        } catch (error) {
            console.error("Error loading unread count:", error);
        }
    }, []);

    // Отметить уведомление как прочитанное
    const markAsRead = useCallback(async (notificationId) => {
        if (!userIdRef.current) return;
        
        try {
            await notificationService.markAsRead(notificationId, userIdRef.current);
            // Удаляем уведомление из списка при прочтении
            setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }, []);

    // Отметить все уведомления чата как прочитанные
    const markChatAsRead = useCallback(async (chatId) => {
        if (!userIdRef.current) return;
        
        try {
            await notificationService.markChatAsRead(chatId, userIdRef.current);
            // Удаляем все уведомления этого чата из списка
            setNotifications(prev => prev.filter(n => n.chatId !== chatId));
        } catch (error) {
            console.error("Error marking chat notifications as read:", error);
        }
    }, []);

    // Удалить уведомление
    const deleteNotification = useCallback(async (notificationId) => {
        if (!userIdRef.current) return;
        
        try {
            await notificationService.deleteNotification(notificationId, userIdRef.current);
            setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    }, []);

    // Инициализация для пользователя
    const initializeForUser = useCallback(async (userId) => {
        if (!userId) return;
        
        // Проверяем, не инициализировали ли мы уже для этого пользователя
        if (userIdRef.current === userId && connectionRef.current) {
            console.log('Notifications already initialized for user:', userId);
            return;
        }
        
        console.log('Initializing notifications for user:', userId);
        initializeConnection(userId);
        await loadNotifications(userId, 1, false);
        await loadUnreadCount(userId);
        console.log('Notifications initialization completed for user:', userId);
    }, [initializeConnection, loadNotifications, loadUnreadCount]);

    // Загрузка следующей страницы
    const loadMore = useCallback(async () => {
        if (!userIdRef.current || isLoading || !hasMore) return;
        
        await loadNotifications(userIdRef.current, currentPage + 1, true);
    }, [isLoading, hasMore, currentPage]);

    // Загрузка всех уведомлений (включая прочитанные)
    const loadAllNotifications = useCallback(async (userId, page = 1, append = false) => {
        if (!userId) return;
        
        setIsLoading(true);
        try {
            console.log('Loading all notifications for user:', userId, 'page:', page);
            const data = await notificationService.getNotifications(userId, page, 20, false);
            console.log('Loaded all notifications:', data);
            
            if (append) {
                setNotifications(prev => [...prev, ...data]);
            } else {
                setNotifications(data);
            }
            
            setCurrentPage(page);
            setHasMore(data.length === 20);
        } catch (error) {
            console.error("Error loading all notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Запрос разрешения на desktop уведомления
    const requestNotificationPermission = useCallback(async () => {
        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            console.log("Notification permission:", permission);
        }
    }, []);

    useEffect(() => {
        requestNotificationPermission();
        
        return () => {
            if (connectionRef.current) {
                connectionRef.current.off("ReceiveNotification");
                connectionRef.current.off("UnreadCountChanged");
                connectionRef.current.off("MessageRead");
                connectionRef.current.stop();
            }
        };
    }, []);

    const value = {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        initializeForUser,
        loadMore,
        loadAllNotifications,
        markAsRead,
        markChatAsRead,
        deleteNotification,
        requestNotificationPermission,
        addNotification: (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}; 