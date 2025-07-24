import { useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../config/apiConfig';

export const useMessageVisibility = (userId, chatId, messages) => {
    const observerRef = useRef(null);
    const messageRefs = useRef(new Map());
    
    // Функция для проверки, принадлежит ли сообщение пользователю
    const isOwnMessage = useCallback((messageId) => {
        const message = messages.find(msg => (msg.id || msg.messageId) === messageId);
        return message && message.userId === parseInt(userId);
    }, [messages, userId]);

    // Функция для пометки сообщения как прочитанного
    const markMessageAsRead = useCallback(async (messageId) => {
        if (!userId || !messageId) return;

        try {
            console.log(`Marking message ${messageId} as read for user ${userId}`);
            
            const requestBody = {
                userId: parseInt(userId),
                messageId: parseInt(messageId)
            };
            
            console.log('Request body:', requestBody);
            
            const response = await fetch(`${BASE_URL}/api/messages/mark-message-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                console.error(`Failed to mark message as read. Status: ${response.status}`);
                const errorText = await response.text();
                console.error('Error response:', errorText);
            } else {
                const result = await response.json();
                if (result.reason === "own_message") {
                    console.log(`Message ${messageId} is user's own message, skipping`);
                } else {
                    console.log(`Successfully marked message ${messageId} as read`);
                }
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }, [userId]);

    // Функция для пометки всех видимых сообщений как прочитанных
    const markVisibleMessagesAsRead = useCallback(() => {
        if (!userId || !chatId) return;

        const visibleMessages = [];
        messageRefs.current.forEach((ref, messageId) => {
            if (ref && isElementInViewport(ref)) {
                visibleMessages.push(messageId);
            }
        });

        // Помечаем все видимые сообщения как прочитанные
        visibleMessages.forEach(messageId => {
            markMessageAsRead(messageId);
        });
    }, [userId, chatId, markMessageAsRead]);

    // Функция для проверки, находится ли элемент в области видимости
    const isElementInViewport = (element) => {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // Элемент считается видимым, если он находится в области видимости
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= windowHeight &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    // Создаем Intersection Observer для отслеживания видимости сообщений
    useEffect(() => {
        if (!userId || !chatId) return;

        // Создаем observer для отслеживания видимости сообщений
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const messageId = entry.target.dataset.messageId;
                        console.log('Message became visible:', messageId);
                        if (messageId) {
                            const messageIdInt = parseInt(messageId);
                            // Проверяем, не является ли сообщение собственным
                            if (!isOwnMessage(messageIdInt)) {
                                markMessageAsRead(messageIdInt);
                            } else {
                                console.log(`Skipping own message ${messageIdInt}`);
                            }
                        }
                    }
                });
            },
            {
                root: null, // viewport
                rootMargin: '0px',
                threshold: 0.1 // 10% элемента должно быть видимо
            }
        );

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [userId, chatId, markMessageAsRead]);

    // Функция для добавления ref к сообщению
    const addMessageRef = useCallback((messageId, ref) => {
        if (ref) {
            console.log(`Adding ref for message ${messageId}`);
            messageRefs.current.set(messageId, ref);
            
            // Добавляем data-атрибут для идентификации сообщения
            ref.dataset.messageId = messageId;
            console.log(`Set data-message-id="${messageId}" for element`);
            
            // Начинаем наблюдение за элементом
            if (observerRef.current) {
                observerRef.current.observe(ref);
                console.log(`Started observing message ${messageId}`);
            }
        }
    }, []);

    // Функция для удаления ref сообщения
    const removeMessageRef = useCallback((messageId) => {
        const ref = messageRefs.current.get(messageId);
        if (ref && observerRef.current) {
            observerRef.current.unobserve(ref);
        }
        messageRefs.current.delete(messageId);
    }, []);

    // Очищаем refs при изменении сообщений
    useEffect(() => {
        const currentMessageIds = new Set(messages.map(msg => msg.id || msg.messageId));
        
        // Удаляем refs для сообщений, которых больше нет
        messageRefs.current.forEach((ref, messageId) => {
            if (!currentMessageIds.has(messageId)) {
                removeMessageRef(messageId);
            }
        });
    }, [messages, removeMessageRef]);

    return {
        addMessageRef,
        removeMessageRef,
        markVisibleMessagesAsRead
    };
}; 