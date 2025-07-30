import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import LetterGlitch from './LetterGlitch';
import '../styles/MatrixGlitchTheme.css';

const GlobalGlitchBackground = ({ children }) => {
    const { currentTheme, themes } = useTheme();
    const hasGlitchBackground = themes[currentTheme]?.hasGlitchBackground;

    useEffect(() => {
        // Добавляем/удаляем CSS класс для темы Matrix Glitch
        if (hasGlitchBackground) {
            document.body.classList.add('matrix-glitch-theme');
        } else {
            document.body.classList.remove('matrix-glitch-theme');
        }

        // Очистка при размонтировании компонента
        return () => {
            document.body.classList.remove('matrix-glitch-theme');
        };
    }, [hasGlitchBackground]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {hasGlitchBackground && (
                <LetterGlitch
                    glitchSpeed={80}
                    centerVignette={false}
                    outerVignette={true}
                    smooth={true}
                    glitchColors={['#2b4539', '#61dca3', '#61b3dc']}
                />
            )}
            <div style={{ 
                position: 'relative', 
                zIndex: 1, 
                width: '100%', 
                height: '100%',
                backgroundColor: hasGlitchBackground ? 'transparent' : undefined
            }}>
                {children}
            </div>
        </div>
    );
};

export default GlobalGlitchBackground;