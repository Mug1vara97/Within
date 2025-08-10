import { useRef, useCallback, useEffect } from 'react';

const useScrollToBottom = (messages, shouldAutoScroll = true) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const isInitialLoad = useRef(true);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
                behavior: behavior,
                block: "nearest"
            });
        }, 100);
    }, []);

    const scrollToBottomImmediate = useCallback(() => {
        if (messagesEndRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, []);

    // Автоматическая прокрутка к последнему сообщению при загрузке
    useEffect(() => {
        if (messages.length > 0 && isInitialLoad.current) {
            isInitialLoad.current = false;
            scrollToBottomImmediate();
        }
    }, [messages, scrollToBottomImmediate]);

    // Автоматическая прокрутка при новых сообщениях (если включено)
    useEffect(() => {
        if (messages.length > 0 && shouldAutoScroll && !isInitialLoad.current) {
            scrollToBottom();
        }
    }, [messages, shouldAutoScroll, scrollToBottom]);

    return { 
        messagesEndRef, 
        messagesContainerRef,
        scrollToBottom, 
        scrollToBottomImmediate,
        isInitialLoad: isInitialLoad.current
    };
};

export default useScrollToBottom;