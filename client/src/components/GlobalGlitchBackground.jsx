import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import LetterGlitch from './LetterGlitch';

const GlobalGlitchBackground = ({ children }) => {
    const { currentTheme, themes } = useTheme();
    const hasGlitchBackground = themes[currentTheme]?.hasGlitchBackground;

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