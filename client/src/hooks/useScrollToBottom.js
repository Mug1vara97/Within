import { useRef, useCallback } from 'react';

const useScrollToBottom = () => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
                behavior: behavior,
                block: "nearest"
            });
        }, 100);
    }, []);

    return { messagesEndRef, scrollToBottom };
};

export default useScrollToBottom;