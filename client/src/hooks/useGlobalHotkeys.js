import { useEffect, useRef } from 'react';

// Хук для работы с глобальными горячими клавишами
export const useGlobalHotkeys = (onToggleMic, onToggleAudio) => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Обработчик сообщений от Background Script и Service Worker
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'HOTKEY_ACTION') {
        console.log('Получено действие горячей клавиши:', event.data);
        
        switch (event.data.action) {
          case 'toggle_mic':
            if (onToggleMic) {
              onToggleMic();
              console.log('Выполнено действие: переключение микрофона');
            }
            break;
            
          case 'toggle_audio':
            if (onToggleAudio) {
              onToggleAudio();
              console.log('Выполнено действие: переключение наушников');
            }
            break;
            
          default:
            console.log('Неизвестное действие:', event.data.action);
        }
      }
    };

    // Обработчик сообщений от Service Worker
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'HOTKEY_ACTION') {
        console.log('Получено сообщение от Service Worker:', event.data);
        
        switch (event.data.action) {
          case 'toggle_mic':
            if (onToggleMic) {
              onToggleMic();
              console.log('Service Worker: переключение микрофона');
            }
            break;
            
          case 'toggle_audio':
            if (onToggleAudio) {
              onToggleAudio();
              console.log('Service Worker: переключение наушников');
            }
            break;
        }
      }
    };

    // Добавляем обработчики сообщений
    window.addEventListener('message', handleMessage);
    
    // Обработчик для Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Функция для отправки сообщений в Service Worker
    const sendToServiceWorker = (message) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
      }
    };

    // Инициализация фонового перехвата клавиш
    const initializeBackgroundHotkeys = () => {
      // Создаем скрытый элемент для перехвата клавиш
      const hotkeyListener = document.createElement('div');
      hotkeyListener.style.position = 'fixed';
      hotkeyListener.style.top = '-1000px';
      hotkeyListener.style.left = '-1000px';
      hotkeyListener.style.width = '1px';
      hotkeyListener.style.height = '1px';
      hotkeyListener.style.opacity = '0';
      hotkeyListener.style.pointerEvents = 'none';
      hotkeyListener.style.zIndex = '-1';
      hotkeyListener.tabIndex = -1;
      
      // Добавляем обработчик клавиш
      hotkeyListener.addEventListener('keydown', (event) => {
        // Ctrl + ~ для переключения микрофона
        if (event.ctrlKey && event.key === '`') {
          event.preventDefault();
          event.stopPropagation();
          
          console.log('Глобальная горячая клавиша: Ctrl + ~ (микрофон)');
          
          if (onToggleMic) {
            onToggleMic();
          }
          
          // Отправляем в Service Worker
          sendToServiceWorker({
            type: 'HOTKEY_PRESSED',
            action: 'toggle_mic',
            key: 'Ctrl + ~'
          });
        }
        
        // Ctrl + F1 для переключения наушников
        if (event.ctrlKey && event.key === 'F1') {
          event.preventDefault();
          event.stopPropagation();
          
          console.log('Глобальная горячая клавиша: Ctrl + F1 (наушники)');
          
          if (onToggleAudio) {
            onToggleAudio();
          }
          
          // Отправляем в Service Worker
          sendToServiceWorker({
            type: 'HOTKEY_PRESSED',
            action: 'toggle_audio',
            key: 'Ctrl + F1'
          });
        }
      }, true);
      
      // Добавляем элемент в DOM
      document.body.appendChild(hotkeyListener);
      
      // Фокус на элемент для перехвата клавиш
      hotkeyListener.focus();
      
      // Поддерживаем фокус
      const maintainFocus = () => {
        if (document.activeElement !== hotkeyListener) {
          hotkeyListener.focus();
        }
      };
      
      // Проверяем фокус каждые 100мс
      const focusInterval = setInterval(maintainFocus, 100);
      
      // Очистка при размонтировании
      return () => {
        clearInterval(focusInterval);
        if (hotkeyListener.parentNode) {
          hotkeyListener.parentNode.removeChild(hotkeyListener);
        }
      };
    };

    // Инициализируем фоновый перехват
    const cleanup = initializeBackgroundHotkeys();

    console.log('Глобальные горячие клавиши инициализированы');

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('message', handleMessage);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      
      if (cleanup) {
        cleanup();
      }
      
      console.log('Глобальные горячие клавиши очищены');
    };
  }, [onToggleMic, onToggleAudio]);

  // Функция для принудительного фокуса на перехватчик клавиш
  const focusHotkeyListener = () => {
    const hotkeyListener = document.querySelector('[tabindex="-1"]');
    if (hotkeyListener) {
      hotkeyListener.focus();
    }
  };

  return { focusHotkeyListener };
};