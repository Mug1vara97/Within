import { useState, useCallback, useRef, useEffect } from 'react';

export const useBatchMessages = (connection, chatId, username) => {
    const [batchQueue, setBatchQueue] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const batchTimeoutRef = useRef(null);
    const batchSize = 10; // Максимальное количество сообщений в батче
    const batchDelay = 1000; // Задержка перед отправкой батча (мс)

    // Функция для добавления сообщения в батч
    const addToBatch = useCallback((messageData) => {
        setBatchQueue(prev => {
            const newQueue = [...prev, {
                ...messageData,
                timestamp: Date.now()
            }];
            
            // Если достигли максимального размера батча, отправляем немедленно
            if (newQueue.length >= batchSize) {
                clearTimeout(batchTimeoutRef.current);
                setTimeout(() => sendBatch(), 0);
            }
            
            return newQueue;
        });

        // Устанавливаем таймер для отправки батча
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }
        
        batchTimeoutRef.current = setTimeout(() => {
            sendBatch();
        }, batchDelay);
    }, []);

    // Функция для отправки батча
    const sendBatch = useCallback(async () => {
        if (batchQueue.length === 0 || isSending || !connection) return;

        try {
            setIsSending(true);
            
            console.log(`Sending batch of ${batchQueue.length} messages`);
            
            // Подготавливаем данные для отправки
            const messagesToSend = batchQueue.map(msg => ({
                content: msg.content,
                repliedToMessageId: msg.repliedToMessageId,
                forwardedFromMessageId: msg.forwardedFromMessageId,
                forwardedFromChatId: msg.forwardedFromChatId,
                forwardedByUserId: msg.forwardedByUserId,
                forwardedMessageContent: msg.forwardedMessageContent
            }));

            // Отправляем батч на сервер
            const result = await connection.invoke('SendBatchMessages', messagesToSend, username, parseInt(chatId));
            
            console.log(`Batch sent successfully:`, result);
            
            // Очищаем очередь
            setBatchQueue([]);
            
            // Очищаем таймер
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }
            
        } catch (error) {
            console.error('Error sending batch messages:', error);
            
            // В случае ошибки, можно попробовать отправить сообщения по одному
            console.log('Falling back to individual message sending...');
            
            for (const msg of batchQueue) {
                try {
                    await connection.invoke('SendMessage', msg.content, username, parseInt(chatId), 
                        msg.repliedToMessageId, msg.forwardedFromMessageId);
                } catch (individualError) {
                    console.error(`Failed to send individual message:`, individualError);
                }
            }
            
            setBatchQueue([]);
        } finally {
            setIsSending(false);
        }
    }, [batchQueue, isSending, connection, chatId, username]);

    // Функция для принудительной отправки текущего батча
    const forceSendBatch = useCallback(() => {
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }
        sendBatch();
    }, [sendBatch]);

    // Функция для очистки очереди
    const clearBatch = useCallback(() => {
        setBatchQueue([]);
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
        }
    }, []);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
            }
        };
    }, []);

    // Автоматическая отправка при изменении соединения
    useEffect(() => {
        if (!connection && batchQueue.length > 0) {
            console.log('Connection lost, clearing batch queue');
            clearBatch();
        }
    }, [connection, batchQueue.length, clearBatch]);

    return {
        addToBatch,
        forceSendBatch,
        clearBatch,
        batchQueue,
        isSending,
        batchSize: batchQueue.length,
        hasPendingMessages: batchQueue.length > 0
    };
};
