import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export { ThemeContext };

export const themes = {
    default: {
        name: 'По умолчанию',
        colors: {
            primary: '#5865f2',
            primaryHover: '#4752c4',
            secondary: '#4752c4',
            background: '#36393f',
            surface: '#2f3136',
            serverListBackground: '#202225',
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
            bottom: '#292b2f',
            borderBottom: '#202225',
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
            serverListBackground: '#202225',
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
            bottom: '#1f1f1f',
            borderBottom: '#625c5c',
            // RGB переменные для прозрачности
            primaryRgb: '220, 38, 38',
            dangerRgb: '220, 38, 38'
        }
    },
    glitchMatrix: {
        name: 'Mug1vara Bits Glitch',
        colors: {
            primary: '#61dca3',
            primaryHover: '#4fb085',
            secondary: '#61b3dc',
            background: 'rgba(0, 0, 0, 0.7)',
            surface: 'rgba(2, 15, 11, 0.8)',
            serverListBackground: 'rgba(0, 0, 0, 0.9)',
            text: '#ffffff',
            textSecondary: '#61b3dc',
            textMuted: '#2b4539',
            border: 'rgba(97, 220, 163, 0.3)',
            hover: 'rgba(97, 220, 163, 0.1)',
            success: '#61dca3',
            successHover: '#4fb085',
            danger: '#dc6161',
            dangerHover: '#b04f4f',
            warning: '#dcb361',
            bottom: 'rgba(0, 0, 0, 0.9)',
            borderBottom: 'rgba(97, 220, 163, 0.2)',
            // RGB переменные для прозрачности
            primaryRgb: '97, 220, 163',
            dangerRgb: '220, 97, 97'
        },
        hasGlitchBackground: true
    }
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState('default');
    const [unlockedThemes, setUnlockedThemes] = useState(() => {
        const saved = localStorage.getItem('unlockedThemes');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        // Загружаем сохраненную тему из localStorage
        const savedTheme = localStorage.getItem('app-theme');
        if (savedTheme && themes[savedTheme]) {
            // Проверяем, доступна ли сохраненная тема
            if (savedTheme === 'default' || savedTheme === 'redWhiteBlack' || unlockedThemes.includes(savedTheme)) {
                setCurrentTheme(savedTheme);
            } else {
                // Если тема недоступна, используем тему по умолчанию
                setCurrentTheme('default');
            }
        }
    }, [unlockedThemes]);

    useEffect(() => {
        // Применяем тему к CSS переменным
        const theme = themes[currentTheme];
        Object.entries(theme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });
        
        // Сохраняем тему в localStorage
        localStorage.setItem('app-theme', currentTheme);
    }, [currentTheme]);

    useEffect(() => {
        // Сохраняем разблокированные темы в localStorage
        localStorage.setItem('unlockedThemes', JSON.stringify(unlockedThemes));
    }, [unlockedThemes]);

    const changeTheme = (themeName) => {
        if (themes[themeName]) {
            // Если пользователь переключается с секретной темы на другую, скрываем секретную тему
            if (currentTheme === 'glitchMatrix' && themeName !== 'glitchMatrix') {
                setUnlockedThemes(prev => prev.filter(theme => theme !== 'glitchMatrix'));
            }
            setCurrentTheme(themeName);
        }
    };

    const unlockTheme = (themeName) => {
        if (themes[themeName] && !unlockedThemes.includes(themeName)) {
            setUnlockedThemes(prev => [...prev, themeName]);
        }
    };

    // Функция для получения доступных тем (базовые + разблокированные)
    const getAvailableThemes = () => {
        const availableThemes = {};
        Object.entries(themes).forEach(([key, theme]) => {
            // Показываем базовые темы или разблокированные
            if (key === 'default' || key === 'redWhiteBlack' || unlockedThemes.includes(key)) {
                availableThemes[key] = theme;
            }
        });
        return availableThemes;
    };

    const value = {
        currentTheme,
        changeTheme,
        unlockTheme,
        themes,
        availableThemes: getAvailableThemes(),
        unlockedThemes,
        colors: themes[currentTheme]?.colors || themes.default.colors
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