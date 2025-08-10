import { useState, useCallback, useRef } from 'react';
import { BASE_URL } from '../config/apiConfig';

export const useLazyMessages = (chatId, connection) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const isLoadingRef = useRef(false);

    const loadMessages = useCallback(async (page = 1, append = false) => {
        if (!chatId || !connection || isLoadingRef.current) return;

        try {
            setIsLoading(true);
            isLoadingRef.current = true;

            console.log(`Loading messages: page=${page}, append=${append}`);
            const newMessages = await connection.invoke('GetMessagesWithPagination', parseInt(chatId), page, pageSize);
            console.log(`Received ${newMessages.length} messages for page ${page}`);
            
            if (newMessages.length === 0) {
                console.log('No messages received, setting hasMore to false');
                setHasMore(false);
                return;
            }

            if (append) {
                console.log('Appending old messages to beginning of list');
                setMessages(prev => {
                    const newState = [...newMessages, ...prev];
                    console.log('Messages state updated (append):', {
                        newMessagesCount: newMessages.length,
                        prevMessagesCount: prev.length,
                        totalMessagesCount: newState.length
                    });
                    return newState;
                });
                setCurrentPage(page); // Обновляем текущую страницу
            } else {
                console.log('Setting new messages (replacing all)');
                setMessages(newMessages);
                setCurrentPage(page);
            }

            // Убираем дублирующий setCurrentPage
            const newHasMore = newMessages.length === pageSize;
            console.log('Setting hasMore:', {
                newMessagesCount: newMessages.length,
                pageSize,
                hasMore: newHasMore
            });
            setHasMore(newHasMore);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [chatId, connection, pageSize]);

    const loadMoreMessages = useCallback(() => {
        console.log('loadMoreMessages called:', {
            hasMore,
            isLoading,
            isLoadingRef: isLoadingRef.current,
            currentPage,
            willLoad: hasMore && !isLoading && !isLoadingRef.current
        });
        
        if (hasMore && !isLoading && !isLoadingRef.current) {
            console.log('Starting to load more messages...');
            loadMessages(currentPage + 1, true);
        } else {
            console.log('Cannot load more messages - conditions not met');
        }
    }, [hasMore, isLoading, currentPage, loadMessages]);

    const refreshMessages = useCallback(() => {
        setMessages([]);
        setCurrentPage(1);
        setHasMore(true);
        loadMessages(1, false);
    }, [loadMessages]);

    const addNewMessage = useCallback((message) => {
        console.log('Adding new message to end of list:', {
            messageId: message.messageId,
            currentMessagesCount: messages.length
        });
        setMessages(prev => {
            const newState = [...prev, message];
            console.log('Messages state updated (new message):', {
                prevCount: prev.length,
                newCount: newState.length
            });
            return newState;
        });
    }, [messages.length]);

    const updateMessage = useCallback((messageId, updates) => {
        setMessages(prev => prev.map(msg => 
            msg.messageId === messageId ? { ...msg, ...updates } : msg
        ));
    }, []);

    const removeMessage = useCallback((messageId) => {
        setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    }, []);

    return {
        messages,
        isLoading,
        hasMore,
        currentPage,
        loadMessages,
        loadMoreMessages,
        refreshMessages,
        addNewMessage,
        updateMessage,
        removeMessage
    };
};
