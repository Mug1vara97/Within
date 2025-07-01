import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, createAudioRecorder } from '../services/mediaService';

export const useMediaHandlers = (connection, username, chatId) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const audioRecorder = useRef(null);
  const recordingTimer = useRef(null);
  const recordingStartTime = useRef(null);
  const startPosition = useRef({ x: 0, y: 0 });
  const [isDragCancel, setIsDragCancel] = useState(false);

  const handleSendMedia = async (file) => {
    try {
      const { url } = await uploadFile(file, '/api/media/upload/media');
      await connection.invoke('SendMediaMessage', username, url, chatId);
    } catch (error) {
      console.error('Failed to send media:', error);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      audioRecorder.current = createAudioRecorder();
      await audioRecorder.current.start();
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      
      // Запускаем таймер для отображения времени записи
      recordingTimer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime.current) / 1000);
        setRecordingTime(elapsed);
      }, 100);
    } catch (error) {
      console.error('Recording start failed:', error);
    }
  }, []);

  const stopRecording = useCallback(async (shouldSend = true) => {
    try {
      if (!audioRecorder.current) return;
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      const audioBlob = await audioRecorder.current.stop();
      
      // Отправляем только если запись длилась больше 1 секунды и shouldSend = true
      if (shouldSend && recordingTime >= 1) {
        const { url } = await uploadFile(audioBlob, '/api/upload/audio');
        await connection.invoke('SendAudioMessage', username, url, chatId);
      }
    } catch (error) {
      console.error('Recording stop failed:', error);
    } finally {
      setIsRecording(false);
      setRecordingTime(0);
      audioRecorder.current = null;
    }
  }, [connection, username, chatId, recordingTime]);

  const cancelRecording = useCallback(async () => {
    await stopRecording(false);
  }, [stopRecording]);

  const handleAudioRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  // Новые функции для поддержки нажатия и удержания
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    startPosition.current = { x: e.clientX, y: e.clientY };
    setIsDragCancel(false);
    startRecording();
  }, [startRecording]);

  const handleMouseMove = useCallback((e) => {
    if (!isRecording) return;
    
    const deltaX = e.clientX - startPosition.current.x;
    
    // Если пользователь провел влево больше чем на 100px, отменяем запись
    if (deltaX < -100) {
      setIsDragCancel(true);
    } else {
      setIsDragCancel(false);
    }
  }, [isRecording]);

  const handleMouseUp = useCallback((e) => {
    e.preventDefault();
    if (isRecording) {
      if (isDragCancel) {
        cancelRecording();
      } else {
        stopRecording();
      }
    }
    setIsDragCancel(false);
  }, [isRecording, isDragCancel, stopRecording, cancelRecording]);

  const handleMouseLeave = useCallback((e) => {
    e.preventDefault();
    if (isRecording) {
      cancelRecording();
    }
    setIsDragCancel(false);
  }, [isRecording, cancelRecording]);

  // Для поддержки тач-устройств
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startPosition.current = { x: touch.clientX, y: touch.clientY };
    setIsDragCancel(false);
    startRecording();
  }, [startRecording]);

  const handleTouchMove = useCallback((e) => {
    if (!isRecording) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPosition.current.x;
    
    // Если пользователь провел влево больше чем на 100px, отменяем запись
    if (deltaX < -100) {
      setIsDragCancel(true);
    } else {
      setIsDragCancel(false);
    }
  }, [isRecording]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (isRecording) {
      if (isDragCancel) {
        cancelRecording();
      } else {
        stopRecording();
      }
    }
    setIsDragCancel(false);
  }, [isRecording, isDragCancel, stopRecording, cancelRecording]);

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Глобальные обработчики для отслеживания движения за пределами кнопки
  useEffect(() => {
    if (!isRecording) return;

    const handleGlobalMouseMove = (e) => {
      const deltaX = e.clientX - startPosition.current.x;
      if (deltaX < -100) {
        setIsDragCancel(true);
      } else {
        setIsDragCancel(false);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragCancel) {
        cancelRecording();
      } else {
        stopRecording();
      }
      setIsDragCancel(false);
    };

    const handleGlobalTouchMove = (e) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startPosition.current.x;
      if (deltaX < -100) {
        setIsDragCancel(true);
      } else {
        setIsDragCancel(false);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragCancel) {
        cancelRecording();
      } else {
        stopRecording();
      }
      setIsDragCancel(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isRecording, isDragCancel, stopRecording, cancelRecording]);

  return {
    isRecording,
    recordingTime,
    fileInputRef,
    handleSendMedia,
    handleAudioRecording,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp, 
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    formatRecordingTime,
    cancelRecording,
    isDragCancel
  };
};