import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeSwitcher.css';

const ThemeSwitcher = () => {
    const { currentTheme, changeTheme, themes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const handleThemeChange = (themeName) => {
        changeTheme(themeName);
        setIsOpen(false);
    };

    return (
        <div className="theme-switcher">
            <button 
                className="theme-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Сменить тему"
            >
                🎨
            </button>
            
            {isOpen && (
                <div className="theme-dropdown">
                    <div className="theme-dropdown-header">
                        <h4>Выберите тему</h4>
                        <button 
                            className="close-theme-dropdown"
                            onClick={() => setIsOpen(false)}
                        >
                            ×
                        </button>
                    </div>
                    <div className="theme-options">
                        {Object.entries(themes).map(([key, theme]) => (
                            <button
                                key={key}
                                className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                                onClick={() => handleThemeChange(key)}
                            >
                                <div className="theme-preview">
                                    <div 
                                        className="theme-color-preview"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    />
                                    <div 
                                        className="theme-color-preview"
                                        style={{ backgroundColor: theme.colors.background }}
                                    />
                                    <div 
                                        className="theme-color-preview"
                                        style={{ backgroundColor: theme.colors.surface }}
                                    />
                                </div>
                                <span className="theme-name">{theme.name}</span>
                                {currentTheme === key && <span className="theme-check">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeSwitcher; 