import { useEffect, useCallback } from 'react';
import hotkeyStorage from '../utils/hotkeyStorage';

const useHotkeys = (actions) => {
    const handleKeyDown = useCallback((event) => {
        // Игнорируем, если фокус на input, textarea или contenteditable элементах
        const activeElement = document.activeElement;
        if (
            activeElement &&
            (activeElement.tagName === 'INPUT' ||
             activeElement.tagName === 'TEXTAREA' ||
             activeElement.contentEditable === 'true')
        ) {
            return;
        }

        // Получаем текущие горячие клавиши
        const hotkeys = hotkeyStorage.getHotkeys();
        const pressedKey = hotkeyStorage.parseKeyEvent(event);

        // Проверяем каждое действие
        Object.entries(hotkeys).forEach(([action, hotkey]) => {
            if (hotkey === pressedKey && actions[action]) {
                event.preventDefault();
                event.stopPropagation();
                actions[action]();
            }
        });
    }, [actions]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
};

export default useHotkeys;