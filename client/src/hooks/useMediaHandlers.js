import { useState, useRef, useCallback } from 'react';
import { uploadFile, createAudioRecorder } from '../services/mediaService';

export const useMediaHandlers = (connection, username, chatId) => {
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const audioRecorder = useRef(null);

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
    } catch (error) {
      console.error('Recording start failed:', error);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (!audioRecorder.current) return;
      
      const audioBlob = await audioRecorder.current.stop();
      const { url } = await uploadFile(audioBlob, '/api/upload/audio');
      await connection.invoke('SendAudioMessage', username, url, chatId);
    } catch (error) {
      console.error('Recording stop failed:', error);
    } finally {
      setIsRecording(false);
      audioRecorder.current = null;
    }
  }, [connection, username, chatId]);

  const handleAudioRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  return {
    isRecording,
    fileInputRef,
    handleSendMedia,
    handleAudioRecording
  };
};