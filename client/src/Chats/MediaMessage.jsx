import React from 'react';
import AudioMessage from './AudioMessage';
import VideoPlayer from './VideoPlayer';
import { BASE_URL } from '../config/apiConfig';

const MediaMessage = ({ content }) => {
  // Проверяем, является ли контент путем к файлу
  const isMediaPath = content && typeof content === 'string' && (
    content.includes('/Uploads/') || 
    content.includes('/uploads/') ||
    content.startsWith('Uploads/') ||
    content.startsWith('uploads/')
  );

  if (!isMediaPath) return content;

  const src = `${BASE_URL}${content}`;
  const extension = content.split('.').pop().toLowerCase();

  switch (extension) {
    case 'mp4':
    case 'mov':
      return <VideoPlayer controls src={src} style={{ maxWidth: '100%' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <img src={src} alt="Uploaded content" style={{ maxWidth: '100%' }} />;
    case 'wav':
      return <AudioMessage src={src} />;
    default:
      return <a href={src} target="_blank" rel="noopener noreferrer">Download file</a>;
  }
};

export default MediaMessage;