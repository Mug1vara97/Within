import React, { createContext, useContext, useState } from 'react';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

    const stopCurrentAudio = () => {
        if (currentlyPlaying) {
            currentlyPlaying.stop();
            setCurrentlyPlaying(null);
        }
    };

    const setCurrentAudio = (wavesurfer) => {
        if (currentlyPlaying && currentlyPlaying !== wavesurfer) {
            stopCurrentAudio();
        }
        setCurrentlyPlaying(wavesurfer);
    };

    return (
        <AudioContext.Provider value={{ currentlyPlaying, setCurrentAudio, stopCurrentAudio }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}; 