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

    // Функция для проигрывания звука уведомления
    const playNotificationSound = useCallback(() => {
        try {
            // Попытка проиграть реальный аудиофайл (если он есть)
            // Сначала пробуем MP3, затем WAV
            const audioElement = new Audio('/notification-sound.mp3');
            audioElement.volume = 0.5;
            
            audioElement.play().catch(() => {
                // Если MP3 не найден, пробуем WAV
                const wavAudio = new Audio('/notification-sound.wav');
                wavAudio.volume = 0.5;
                
                wavAudio.play().catch(() => {
                    // Если файлы не найдены, используем заглушку
                    console.log("Audio files not found, using fallback sound");
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
                    
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                });
            });
            
            console.log("Notification sound played");
        } catch (error) {
            console.error("Error playing notification sound:", error);
        }
    }, []);

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
            console.log("Current unread count before update:", unreadCount);
            console.log("Current notifications count before update:", notifications.length);
            
            // Добавляем уведомление только если оно непрочитанное
            if (!notification.isRead) {
                setNotifications(prev => {
                    const newNotifications = [notification, ...prev];
                    console.log("Updated notifications:", newNotifications);
                    console.log("New notifications count:", newNotifications.length);
                    return newNotifications;
                });
                // Обновляем счетчик непрочитанных сообщений
                setUnreadCount(prev => {
                    const newCount = prev + 1;
                    console.log("Updated unread count:", newCount);
                    return newCount;
                });
                
                // Проигрываем звук при получении нового сообщения
                playNotificationSound();
            } else {
                console.log("Received read notification, skipping:", notification);
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
            console.log("Unread count changed from server:", count);
            setUnreadCount(count);
        });

        connection.on("MessageRead", (chatId, messageId) => {
            console.log(`Message ${messageId} read in chat ${chatId}`);
            // Удаляем уведомления для этого сообщения из списка
            setNotifications(prev => {
                const filtered = prev.filter(n => !(n.chatId === chatId && n.messageId === messageId));
                console.log(`Removed notifications for message ${messageId} in chat ${chatId}, remaining: ${filtered.length}`);
                return filtered;
            });
            // Обновляем счетчик непрочитанных сообщений
            setUnreadCount(prev => {
                const newCount = Math.max(0, prev - 1);
                console.log("Updated unread count after message read:", newCount);
                return newCount;
            });
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
            const data = await notificationService.getNotifications(userId, page, 20, unreadOnly);
            console.log('Loaded notifications:', data);
            
            if (append) {
                setNotifications(prev => {
                    const newNotifications = [...prev, ...data];
                    console.log('Appended notifications, total count:', newNotifications.length);
                    return newNotifications;
                });
            } else {
                console.log('Setting notifications directly, count:', data.length);
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
            setNotifications(prev => {
                const filtered = prev.filter(n => n.notificationId !== notificationId);
                console.log(`Removed notification ${notificationId}, remaining: ${filtered.length}`);
                return filtered;
            });
            // Обновляем счетчик непрочитанных сообщений
            setUnreadCount(prev => {
                const newCount = Math.max(0, prev - 1);
                console.log("Updated unread count after marking as read:", newCount);
                return newCount;
            });
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
            setNotifications(prev => {
                const filtered = prev.filter(n => n.chatId !== chatId);
                const removedCount = prev.length - filtered.length;
                console.log(`Removed ${removedCount} notifications for chat ${chatId}, remaining: ${filtered.length}`);
                
                // Обновляем счетчик непрочитанных сообщений
                setUnreadCount(prevCount => {
                    const newCount = Math.max(0, prevCount - removedCount);
                    console.log("Updated unread count after marking chat as read:", newCount);
                    return newCount;
                });
                
                return filtered;
            });
        } catch (error) {
            console.error("Error marking chat notifications as read:", error);
        }
    }, []);

    // Удалить уведомление
    const deleteNotification = useCallback(async (notificationId) => {
        if (!userIdRef.current) return;
        
        try {
            await notificationService.deleteNotification(notificationId, userIdRef.current);
            // Удаляем уведомление из списка и обновляем счетчик
            setNotifications(prev => {
                const notification = prev.find(n => n.notificationId === notificationId);
                const filtered = prev.filter(n => n.notificationId !== notificationId);
                console.log(`Deleted notification ${notificationId}, remaining: ${filtered.length}`);
                
                // Обновляем счетчик непрочитанных сообщений только если уведомление было непрочитанным
                if (notification && !notification.isRead) {
                    setUnreadCount(prevCount => {
                        const newCount = Math.max(0, prevCount - 1);
                        console.log("Updated unread count after deleting notification:", newCount);
                        return newCount;
                    });
                }
                
                return filtered;
            });
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
        try {
            initializeConnection(userId);
            await loadNotifications(userId, 1, false);
            await loadUnreadCount(userId);
            console.log('Notifications initialization completed for user:', userId);
            console.log('Initial notifications count:', notifications.length);
            console.log('Initial unread count:', unreadCount);
        } catch (error) {
            console.error('Error initializing notifications for user:', userId, error);
        }
    }, [initializeConnection, loadNotifications, loadUnreadCount, notifications.length, unreadCount]);

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