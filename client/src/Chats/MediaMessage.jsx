import React from 'react';
import AudioMessage from './AudioMessage';
import VideoPlayer from './VideoPlayer';
import { BASE_URL } from '../config/apiConfig';
import { processLinks } from '../utils/linkUtils';

const MediaMessage = ({ content }) => {
  // Проверяем, является ли контент пересланным сообщением
  if (content && typeof content === 'object' && content.ForwardedMessageContent) {
    const forwardedContent = content.ForwardedMessageContent;
    if (forwardedContent.toLowerCase().includes('/uploads/') ||
        forwardedContent.toLowerCase().startsWith('uploads/')) {
      const src = `${BASE_URL}${forwardedContent}`;
      const extension = forwardedContent.split('.').pop().toLowerCase();

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
    }
    // Если это пересланное сообщение без медиафайла, обрабатываем ссылки и возвращаем его контент
    return processLinks(forwardedContent);
  }

  // Проверяем, является ли контент медиафайлом
  const isMediaPath = content && typeof content === 'string' && (
    content.toLowerCase().includes('/uploads/') ||
    content.toLowerCase().startsWith('uploads/')
  );

  if (!isMediaPath) {
    // Если это не медиафайл, обрабатываем ссылки и возвращаем контент
    return processLinks(content);
  }

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