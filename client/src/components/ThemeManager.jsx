import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeManager.css';

const ThemeManager = () => {
    const { currentTheme, changeTheme, themes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const handleThemeChange = (themeName) => {
        changeTheme(themeName);
        setIsOpen(false);
    };

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
                                style={{ backgroundColor: themes[currentTheme].colors.primary }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: themes[currentTheme].colors.background }}
                            />
                            <div 
                                className="theme-color-preview-large"
                                style={{ backgroundColor: themes[currentTheme].colors.surface }}
                            />
                        </div>
                        <div className="current-theme-info">
                            <h4>{themes[currentTheme].name}</h4>
                            <p>Основной цвет: {themes[currentTheme].colors.primary}</p>
                            <p>Фон: {themes[currentTheme].colors.background}</p>
                        </div>
                    </div>
                </div>

                <div className="available-themes">
                    <h3>Доступные темы</h3>
                    <div className="themes-grid">
                        {Object.entries(themes).map(([key, theme]) => (
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeManager; 