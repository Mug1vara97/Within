import { BASE_URL } from '../config/apiConfig';

export const uploadFile = async (file, endpoint) => {
  const formData = new FormData();
  formData.append('file', file, file.name || 'file');

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const createAudioRecorder = () => {
    let mediaRecorder = null;
    let audioChunks = [];
    let stream = null;
  
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
  
        return new Promise((resolve) => {
          mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
          mediaRecorder.start();
          resolve();
        });
      } catch (error) {
        throw error;
      }
    };
  
    const stop = () => {
      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };
        
        mediaRecorder.stop();
      });
    };
  
    return { start, stop };
  };