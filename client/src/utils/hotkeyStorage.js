class HotkeyStorage {
    constructor() {
        this.storageKey = 'voiceChatHotkeys';
        this.defaultHotkeys = {
            toggleMic: 'F1',
            toggleAudio: 'F2'
        };
    }

    // Получить все горячие клавиши
    getHotkeys() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return { ...this.defaultHotkeys, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Failed to load hotkeys:', error);
        }
        return { ...this.defaultHotkeys };
    }

    // Сохранить горячие клавиши
    saveHotkeys(hotkeys) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(hotkeys));
            return true;
        } catch (error) {
            console.error('Failed to save hotkeys:', error);
            return false;
        }
    }

    // Получить горячую клавишу для конкретного действия
    getHotkey(action) {
        const hotkeys = this.getHotkeys();
        return hotkeys[action] || this.defaultHotkeys[action];
    }

    // Установить горячую клавишу для конкретного действия
    setHotkey(action, key) {
        const hotkeys = this.getHotkeys();
        hotkeys[action] = key;
        return this.saveHotkeys(hotkeys);
    }

    // Проверить, используется ли уже эта клавиша
    isKeyUsed(key, excludeAction = null) {
        const hotkeys = this.getHotkeys();
        for (const [action, hotkey] of Object.entries(hotkeys)) {
            if (action !== excludeAction && hotkey === key) {
                return action;
            }
        }
        return null;
    }

    // Сбросить к значениям по умолчанию
    resetToDefaults() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to reset hotkeys:', error);
            return false;
        }
    }

    // Форматировать клавишу для отображения
    formatKey(key) {
        if (!key) return '';
        
        // Заменяем технические названия на читаемые
        const keyMap = {
            'Control': 'Ctrl',
            'Meta': 'Cmd',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Escape': 'Esc',
            'Delete': 'Del',
            'Insert': 'Ins',
            'PageUp': 'PgUp',
            'PageDown': 'PgDn',
            'Home': 'Home',
            'End': 'End',
            'CapsLock': 'Caps',
            'NumLock': 'Num',
            'ScrollLock': 'Scroll',
            'PrintScreen': 'PrtSc',
            'Pause': 'Pause',
            'ContextMenu': 'Menu',
            // Кнопки мыши
            'Mouse4': 'Боковая 1',
            'Mouse5': 'Боковая 2',
            'LeftClick': 'Левая',
            'MiddleClick': 'Средняя',
            'RightClick': 'Правая'
        };

        // Обрабатываем комбинации клавиш
        if (key.includes('+')) {
            return key.split('+').map(part => keyMap[part] || part).join(' + ');
        }

        return keyMap[key] || key;
    }

    // Парсить событие клавиатуры в строку
    parseKeyEvent(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Cmd');
        
        // Игнорируем модификаторы как основную клавишу
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            parts.push(event.key);
        }
        
        return parts.join('+');
    }

    // Парсить событие мыши в строку
    parseMouseEvent(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Cmd');
        
        // Определяем кнопку мыши
        switch (event.button) {
            case 3:
                parts.push('Mouse4');
                break;
            case 4:
                parts.push('Mouse5');
                break;
            case 0:
                parts.push('LeftClick');
                break;
            case 1:
                parts.push('MiddleClick');
                break;
            case 2:
                parts.push('RightClick');
                break;
            default:
                parts.push(`Mouse${event.button}`);
        }
        
        return parts.join('+');
    }
}

const hotkeyStorage = new HotkeyStorage();
export default hotkeyStorage;