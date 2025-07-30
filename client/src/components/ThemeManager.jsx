import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeManager.css';

const ThemeManager = () => {
    const { currentTheme, changeTheme, availableThemes, unlockTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [secretCode, setSecretCode] = useState('');
    const [showUnlockMessage, setShowUnlockMessage] = useState(false);

    const handleThemeChange = (themeName) => {
        changeTheme(themeName);
        setIsOpen(false);
    };

    const handleSecretCodeSubmit = (e) => {
        e.preventDefault();
        if (secretCode.toLowerCase() === 'mug1vara') {
            unlockTheme('glitchMatrix');
            setShowUnlockMessage(true);
            setSecretCode('');
            setTimeout(() => setShowUnlockMessage(false), 3000);
        } else {
            setSecretCode('');
        }
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
                                style={{ backgroundColor: availableThemes[currentTheme].colors.primary }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: availableThemes[currentTheme].colors.background }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: availableThemes[currentTheme].colors.surface }}
                            />
                        </div>
                        <div className="current-theme-info">
                            <h4>{availableThemes[currentTheme].name}</h4>
                            <p>Основной цвет: {availableThemes[currentTheme].colors.primary}</p>
                            <p>Фон: {availableThemes[currentTheme].colors.background}</p>
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

                <div className="secret-theme-section">
                    <h3>Секретные темы</h3>
                    <p>Введите секретный код для разблокировки скрытых тем:</p>
                    <form onSubmit={handleSecretCodeSubmit} className="secret-code-form">
                        <input
                            type="text"
                            value={secretCode}
                            onChange={(e) => setSecretCode(e.target.value)}
                            placeholder="Введите секретный код..."
                            className="secret-code-input"
                        />
                        <button type="submit" className="secret-code-button">
                            Разблокировать
                        </button>
                    </form>
                    {showUnlockMessage && (
                        <div className="unlock-message">
                            🎉 Тема "Matrix Glitch" разблокирована!
                        </div>
                    )}
                </div>

                <div className="theme-info">
                    <h3>О темах</h3>
                    <p>Темы изменяют цветовую схему всего приложения. Ваш выбор сохраняется автоматически.</p>
                    <div className="theme-features">
                        <div className="feature">
                            <span className="feature-icon">🎨</span>
                            <span>Динамическое изменение цветов</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">💾</span>
                            <span>Автоматическое сохранение</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">⚡</span>
                            <span>Мгновенное применение</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🔓</span>
                            <span>Секретные темы</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeManager; 