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

            const newMessages = await connection.invoke('GetMessagesWithPagination', parseInt(chatId), page, pageSize);
            
            if (newMessages.length === 0) {
                setHasMore(false);
                return;
            }

            if (append) {
                setMessages(prev => [...newMessages, ...prev]);
            } else {
                setMessages(newMessages);
            }

            setCurrentPage(page);
            setHasMore(newMessages.length === pageSize);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [chatId, connection, pageSize]);

    const loadMoreMessages = useCallback(() => {
        if (hasMore && !isLoading && !isLoadingRef.current) {
            loadMessages(currentPage + 1, true);
        }
    }, [hasMore, isLoading, currentPage, loadMessages]);

    const refreshMessages = useCallback(() => {
        setMessages([]);
        setCurrentPage(1);
        setHasMore(true);
        loadMessages(1, false);
    }, [loadMessages]);

    const addNewMessage = useCallback((message) => {
        setMessages(prev => [...prev, message]);
    }, []);

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
