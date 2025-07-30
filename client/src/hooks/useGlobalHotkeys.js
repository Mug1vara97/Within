import { useEffect, useCallback } from 'react';

export const useGlobalHotkeys = (onToggleMic, onToggleAudio) => {
  const handleGlobalShortcut = useCallback((shortcut) => {
    console.log('Получена глобальная горячая клавиша:', shortcut);
    
    switch (shortcut) {
      case 'toggle-mic':
        if (onToggleMic) {
          onToggleMic();
          console.log('Выполнена команда: переключение микрофона');
        }
        break;
      case 'toggle-audio':
        if (onToggleAudio) {
          onToggleAudio();
          console.log('Выполнена команда: переключение наушников');
        }
        break;
      default:
        console.log('Неизвестная горячая клавиша:', shortcut);
    }
  }, [onToggleMic, onToggleAudio]);

  useEffect(() => {
    // Проверяем, что мы в Electron
    if (window.electronAPI && window.electronAPI.onGlobalShortcut) {
      // Регистрируем слушатель глобальных горячих клавиш
      window.electronAPI.onGlobalShortcut(handleGlobalShortcut);
      
      console.log('Глобальные горячие клавиши активированы в Electron');
      
      // Очистка при размонтировании
      return () => {
        if (window.electronAPI && window.electronAPI.removeGlobalShortcutListener) {
          window.electronAPI.removeGlobalShortcutListener();
        }
      };
    } else {
      console.log('Приложение запущено в браузере - глобальные горячие клавиши недоступны');
    }
  }, [handleGlobalShortcut]);

  // Возвращаем функцию для проверки, запущено ли приложение в Electron
  const isElectron = () => {
    return window.electronAPI && window.electronAPI.isElectron;
  };

  return { isElectron };
}; 