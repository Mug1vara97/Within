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
    const audioContextRef = useRef(null);

    // Функция для проигрывания звука уведомления
    const playNotificationSound = useCallback(() => {
        try {
            // Сначала пробуем проиграть реальный аудиофайл
            const audioElement = new Audio('/notification-sound.mp3');
            audioElement.volume = 0.5;
            
            audioElement.play().catch(() => {
                // Если MP3 не найден, пробуем WAV
                const wavAudio = new Audio('/notification-sound.wav');
                wavAudio.volume = 0.5;
                
                wavAudio.play().catch(() => {
                    // Если файлы не найдены, используем заглушку
                    console.log("Audio files not found, using fallback sound");
                    playFallbackSound();
                });
            });
            
            console.log("Notification sound played");
        } catch (error) {
            console.error("Error playing notification sound:", error);
            // В случае ошибки тоже используем fallback
            playFallbackSound();
        }
    }, []);

    // Функция для проигрывания fallback звука
    const playFallbackSound = useCallback(() => {
        try {
            // Создаем или используем существующий AudioContext
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const audioContext = audioContextRef.current;
            
            // Проверяем состояние AudioContext и возобновляем если нужно
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed");
                    playFallbackSound(); // Повторяем попытку после возобновления
                });
                return;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Создаем более заметный звук
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
            
            console.log("Fallback sound played successfully");
        } catch (error) {
            console.error("Error playing fallback sound:", error);
        }
    }, []);

    // Инициализация SignalR соединения
    const initializeConnection = useCallback((userId) => {
        // Останавливаем существующее соединение если есть
        if (connectionRef.current) {
            try {
                connectionRef.current.stop();
                console.log("Stopped existing connection");
            } catch (error) {
                console.log("Error stopping existing connection:", error);
            }
            connectionRef.current = null;
        }

        userIdRef.current = userId;
        
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`/notificationhub?userId=${userId}`)
            .withAutomaticReconnect([0, 2000, 10000, 30000]) // Более агрессивное переподключение
            .build();

        connection.on("ReceiveNotification", (notification) => {
            console.log("Received notification:", notification);
            console.log("Current unread count before update:", unreadCount);
            console.log("Current notifications count before update:", notifications.length);
            
            // Проверяем, нет ли уже такого уведомления
            setNotifications(prev => {
                const existingNotification = prev.find(n => 
                    n.notificationId === notification.notificationId ||
                    (n.chatId === notification.chatId && n.messageId === notification.messageId)
                );
                
                if (existingNotification) {
                    console.log("Notification already exists, skipping:", notification);
                    return prev;
                }
                
                // Добавляем уведомление только если оно непрочитанное
                if (!notification.isRead) {
                    const newNotifications = [notification, ...prev];
                    console.log("Updated notifications:", newNotifications);
                    console.log("New notifications count:", newNotifications.length);
                    
                    // Обновляем счетчик непрочитанных сообщений
                    setUnreadCount(prev => {
                        const newCount = prev + 1;
                        console.log("Updated unread count:", newCount);
                        return newCount;
                    });
                    
                    // Проигрываем звук при получении нового сообщения
                    playNotificationSound();
                    
                    // Показываем desktop уведомление только для непрочитанных
                    if (Notification.permission === "granted") {
                        new Notification("Новое сообщение", {
                            body: notification.content,
                            icon: "/vite.svg"
                        });
                    }
                    
                    return newNotifications;
                } else {
                    console.log("Received read notification, skipping:", notification);
                    return prev;
                }
            });
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

        // Обработчик обновления чата для обновления списка чатов в реальном времени
        connection.on("ChatUpdated", (chatId, lastMessage, lastMessageTime) => {
            console.log("ChatUpdated received in NotificationContext:", { chatId, lastMessage, lastMessageTime });
            // Отправляем событие для обновления списка чатов
            window.dispatchEvent(new CustomEvent('chatUpdated', {
                detail: { chatId, lastMessage, lastMessageTime }
            }));
        });

        // Обработчик входящего звонка
        connection.on("IncomingCall", (chatId, caller, callerId, roomId) => {
            console.log("IncomingCall received in NotificationContext:", { chatId, caller, callerId, roomId });
            console.log("IncomingCall types:", { 
                chatId: typeof chatId, 
                caller: typeof caller, 
                callerId: typeof callerId, 
                roomId: typeof roomId 
            });
            
            // Отправляем событие для обработки входящего звонка
            const eventDetail = { 
                chatId: parseInt(chatId), 
                caller, 
                callerId: parseInt(callerId), 
                roomId 
            };
            console.log("Dispatching incomingCall event with detail:", eventDetail);
            
            window.dispatchEvent(new CustomEvent('incomingCall', {
                detail: eventDetail
            }));
        });

        // Обработчики состояния соединения
        connection.onreconnecting((error) => {
            console.log("SignalR reconnecting:", error);
        });

        connection.onreconnected((connectionId) => {
            console.log("SignalR reconnected:", connectionId);
        });

        connection.onclose((error) => {
            console.log("SignalR connection closed:", error);
        });

        // Запускаем соединение с задержкой и повторными попытками
        const startConnection = async () => {
            try {
                await connection.start();
                console.log("Connected to NotificationHub");
                connectionRef.current = connection;
            } catch (err) {
                console.error("Error connecting to NotificationHub:", err);
                // Повторяем попытку через 5 секунд
                setTimeout(() => {
                    if (userIdRef.current === userId) { // Проверяем, что пользователь не изменился
                        console.log("Retrying connection...");
                        startConnection();
                    }
                }, 5000);
            }
        };

        startConnection();
    }, [playNotificationSound, unreadCount, notifications.length]);

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

    // Инициализация AudioContext при взаимодействии пользователя
    const initializeAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized");
        }
    }, []);

    useEffect(() => {
        requestNotificationPermission();
        
        // Инициализируем AudioContext при первом взаимодействии пользователя
        const handleUserInteraction = () => {
            initializeAudioContext();
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };
        
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);
        
        return () => {
            if (connectionRef.current) {
                try {
                    connectionRef.current.off("ReceiveNotification");
                    connectionRef.current.off("UnreadCountChanged");
                    connectionRef.current.off("MessageRead");
                    connectionRef.current.off("ChatUpdated");
                    connectionRef.current.stop();
                    console.log("Cleaned up SignalR connection");
                } catch (error) {
                    console.log("Error cleaning up SignalR connection:", error);
                }
                connectionRef.current = null;
            }
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };
    }, [initializeAudioContext]);

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
        playNotificationSound, // Экспортируем функцию для тестирования
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