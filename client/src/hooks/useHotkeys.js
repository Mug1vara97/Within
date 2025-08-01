import { useEffect, useCallback } from 'react';
import hotkeyStorage from '../utils/hotkeyStorage';

const useHotkeys = (actions) => {
    const handleKeyDown = useCallback((event) => {
        // В Electron не обрабатываем горячие клавиши здесь - они обрабатываются глобально
        if (window.electronAPI && window.electronAPI.isElectron) {
            return;
        }

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

    const handleMouseDown = useCallback((event) => {
        // В Electron не обрабатываем горячие клавиши здесь - они обрабатываются глобально
        if (window.electronAPI && window.electronAPI.isElectron) {
            return;
        }

        // Обрабатываем только боковые кнопки мыши (3 и 4) и среднюю кнопку (1)
        if (![1, 3, 4].includes(event.button)) {
            return;
        }

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
        const pressedMouse = hotkeyStorage.parseMouseEvent(event);

        // Проверяем каждое действие
        Object.entries(hotkeys).forEach(([action, hotkey]) => {
            if (hotkey === pressedMouse && actions[action]) {
                event.preventDefault();
                event.stopPropagation();
                actions[action]();
            }
        });
    }, [actions]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleMouseDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [handleKeyDown, handleMouseDown]);
};

export default useHotkeys;