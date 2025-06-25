import React, { createContext, useContext, useState, useRef } from 'react';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const [activeVoiceChat, setActiveVoiceChat] = useState(null);
    const voiceChatSocketRef = useRef(null);

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

    const joinVoiceChat = (roomId) => {
        setActiveVoiceChat(roomId);
    };

    const leaveVoiceChat = () => {
        setActiveVoiceChat(null);
        if (voiceChatSocketRef.current) {
            voiceChatSocketRef.current.disconnect();
            voiceChatSocketRef.current = null;
        }
    };

    const value = {
        currentlyPlaying,
        setCurrentAudio,
        stopCurrentAudio,
        activeVoiceChat,
        voiceChatSocketRef,
        joinVoiceChat,
        leaveVoiceChat
    };

    return (
        <AudioContext.Provider value={value}>
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