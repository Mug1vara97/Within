import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeManager.css';

const ThemeManager = () => {
    const { currentTheme, changeTheme, availableThemes, unlockTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [showUnlockMessage, setShowUnlockMessage] = useState(false);

    const handleThemeChange = (themeName) => {
        changeTheme(themeName);
        setIsOpen(false);
    };



    useEffect(() => {
        // Глобальный обработчик для ввода секретного кода
        let buffer = '';
        let timeout;

        const handleKeyPress = (e) => {
            // Игнорируем если фокус на input элементе
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            buffer += e.key.toLowerCase();
            
            // Очищаем буфер через 2 секунды бездействия
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                buffer = '';
            }, 2000);

            // Проверяем секретный код
            if (buffer.includes('mug1vara')) {
                unlockTheme('glitchMatrix');
                setShowUnlockMessage(true);
                setTimeout(() => setShowUnlockMessage(false), 3000);
                buffer = '';
            }
        };

        document.addEventListener('keypress', handleKeyPress);
        
        return () => {
            document.removeEventListener('keypress', handleKeyPress);
            clearTimeout(timeout);
        };
    }, [unlockTheme]);

    return (
        <div className="theme-manager">
            <div className="theme-manager-header">
                <h2>Настройки темы</h2>
                <button 
                    className="close-theme-manager"
                    onClick={() => setIsOpen(false)}
                >
                    ×
                </button>
            </div>
            
            <div className="theme-manager-content">
                <div className="current-theme">
                    <h3>Текущая тема</h3>
                    <div className="current-theme-display">
                        <div className="theme-preview-large">
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: availableThemes[currentTheme]?.colors?.primary || '#5865f2' }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: availableThemes[currentTheme]?.colors?.background || '#36393f' }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: availableThemes[currentTheme]?.colors?.surface || '#2f3136' }}
                            />
                        </div>
                        <div className="current-theme-info">
                            <h4>{availableThemes[currentTheme]?.name || 'Неизвестная тема'}</h4>
                            <p>Основной цвет: {availableThemes[currentTheme]?.colors?.primary || '#5865f2'}</p>
                            <p>Фон: {availableThemes[currentTheme]?.colors?.background || '#36393f'}</p>
                        </div>
                    </div>
                </div>

                <div className="available-themes">
                    <h3>Доступные темы</h3>
                    <div className="themes-grid">
                        {Object.entries(availableThemes).map(([key, theme]) => (
                            <div
                                key={key}
                                className={`theme-card ${currentTheme === key ? 'active' : ''}`}
                                onClick={() => handleThemeChange(key)}
                            >
                                <div className="theme-card-header">
                                    <h4>{theme.name}</h4>
                                    {currentTheme === key && <span className="active-indicator">✓</span>}
                                </div>
                                <div className="theme-preview-grid">
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.primary }}
                                        title="Основной цвет"
                                    />
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.secondary }}
                                        title="Вторичный цвет"
                                    />
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.background }}
                                        title="Фон"
                                    />
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.surface }}
                                        title="Поверхность"
                                    />
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.border }}
                                        title="Граница"
                                    />
                                    <div 
                                        className="theme-color-sample"
                                        style={{ backgroundColor: theme.colors.text }}
                                        title="Текст"
                                    />
                                </div>
                                <div className="theme-card-footer">
                                    <button 
                                        className={`select-theme-btn ${currentTheme === key ? 'selected' : ''}`}
                                        onClick={() => handleThemeChange(key)}
                                    >
                                        {currentTheme === key ? 'Выбрана' : 'Выбрать'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {showUnlockMessage && (
                    <div className="unlock-message">
                        🎉 Тема "Matrix Glitch" разблокирована!
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThemeManager; 