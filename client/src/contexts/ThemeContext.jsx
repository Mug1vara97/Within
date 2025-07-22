import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    default: {
        name: 'По умолчанию',
        colors: {
            primary: '#5865f2',
            primaryHover: '#4752c4',
            secondary: '#4752c4',
            background: '#36393f',
            surface: '#2f3136',
            text: '#ffffff',
            textSecondary: '#dcddde',
            textMuted: '#72767d',
            border: '#40444b',
            hover: '#40444b',
            success: '#43b581',
            successHover: '#3ca374',
            danger: '#f04747',
            dangerHover: '#d84040',
            warning: '#faa61a',
            // RGB переменные для прозрачности
            primaryRgb: '88, 101, 242',
            dangerRgb: '240, 71, 71'
        }
    },
    redWhiteBlack: {
        name: 'Красная тема',
        colors: {
            primary: '#dc2626',
            primaryHover: '#b91c1c',
            secondary: '#b91c1c',
            background: '#1f1f1f',
            surface: '#2d2d2d',
            text: '#ffffff',
            textSecondary: '#e5e5e5',
            textMuted: '#a3a3a3',
            border: '#404040',
            hover: '#404040',
            success: '#16a34a',
            successHover: '#15803d',
            danger: '#dc2626',
            dangerHover: '#b91c1c',
            warning: '#ca8a04',
            // RGB переменные для прозрачности
            primaryRgb: '220, 38, 38',
            dangerRgb: '220, 38, 38'
        }
    }
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState('default');

    useEffect(() => {
        // Загружаем сохраненную тему из localStorage
        const savedTheme = localStorage.getItem('app-theme');
        if (savedTheme && themes[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        // Применяем тему к CSS переменным
        const theme = themes[currentTheme];
        Object.entries(theme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });
        
        // Сохраняем тему в localStorage
        localStorage.setItem('app-theme', currentTheme);
    }, [currentTheme]);

    const changeTheme = (themeName) => {
        if (themes[themeName]) {
            setCurrentTheme(themeName);
        }
    };

    const value = {
        currentTheme,
        changeTheme,
        themes,
        colors: themes[currentTheme].colors
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}; 