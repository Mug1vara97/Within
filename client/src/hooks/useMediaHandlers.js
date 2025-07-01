import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, createAudioRecorder } from '../services/mediaService';

export const useMediaHandlers = (connection, username, chatId) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const audioRecorder = useRef(null);
  const recordingTimer = useRef(null);
  const recordingStartTime = useRef(null);

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

  const stopRecording = useCallback(async () => {
    try {
      if (!audioRecorder.current) return;
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      const audioBlob = await audioRecorder.current.stop();
      
      // Отправляем только если запись длилась больше 1 секунды
      if (recordingTime >= 1) {
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
    try {
      if (!audioRecorder.current) return;
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      await audioRecorder.current.stop();
    } catch (error) {
      console.error('Recording cancel failed:', error);
    } finally {
      setIsRecording(false);
      setRecordingTime(0);
      audioRecorder.current = null;
    }
  }, []);

  const handleAudioRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Обработчик клавиши Escape для отмены записи
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isRecording) {
        cancelRecording();
      }
    };

    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, cancelRecording]);

  return {
    isRecording,
    recordingTime,
    fileInputRef,
    handleSendMedia,
    handleAudioRecording,
    formatRecordingTime,
    cancelRecording
  };
};