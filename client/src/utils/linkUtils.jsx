import React from 'react';

// Функция для обработки ссылок в тексте
export const processLinks = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Регулярное выражение для поиска URL (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Проверяем, является ли часть URL
    if (urlRegex.test(part)) {
      let url = part;
      // Добавляем протокол, если его нет
      if (part.startsWith('www.')) {
        url = 'https://' + part;
      }
      
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#00b0f4',
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {part}
        </a>
      );
    }
    
    // Если это не URL, возвращаем как обычный текст
    return part;
  }).filter(Boolean);
};

// Функция для проверки, содержит ли текст ссылки
export const containsLinks = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  return urlRegex.test(text);
}; 