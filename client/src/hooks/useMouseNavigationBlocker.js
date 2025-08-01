import { useEffect } from 'react';
import hotkeyStorage from '../utils/hotkeyStorage';

const useMouseNavigationBlocker = () => {
    useEffect(() => {
        const handleMouseDown = (event) => {
            // Блокируем только боковые кнопки (Mouse4 и Mouse5)
            if (event.button !== 3 && event.button !== 4) {
                return;
            }

            // Получаем текущие горячие клавиши
            const hotkeys = hotkeyStorage.getHotkeys();
            const pressedMouse = hotkeyStorage.parseMouseEvent(event);

            // Проверяем, есть ли бинд на эту кнопку мыши
            const hasBinding = Object.values(hotkeys).some(hotkey => hotkey === pressedMouse);
            
            // Если есть бинд на боковые кнопки, блокируем навигацию
            if (hasBinding) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const handleMouseUp = (event) => {
            // Блокируем только боковые кнопки (Mouse4 и Mouse5)
            if (event.button !== 3 && event.button !== 4) {
                return;
            }

            // Получаем текущие горячие клавиши
            const hotkeys = hotkeyStorage.getHotkeys();
            const pressedMouse = hotkeyStorage.parseMouseEvent(event);

            // Проверяем, есть ли бинд на эту кнопку мыши
            const hasBinding = Object.values(hotkeys).some(hotkey => hotkey === pressedMouse);
            
            // Если есть бинд на боковые кнопки, блокируем навигацию
            if (hasBinding) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        // Добавляем обработчики на весь документ с capture: true для раннего перехвата
        document.addEventListener('mousedown', handleMouseDown, { capture: true });
        document.addEventListener('mouseup', handleMouseUp, { capture: true });

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, { capture: true });
            document.removeEventListener('mouseup', handleMouseUp, { capture: true });
        };
    }, []);
};

export default useMouseNavigationBlocker;