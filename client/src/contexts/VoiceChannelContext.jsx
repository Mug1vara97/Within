import React, { createContext, useContext, useState } from 'react';

const VoiceChannelContext = createContext();

export const useVoiceChannel = () => {
    const context = useContext(VoiceChannelContext);
    if (!context) {
        throw new Error('useVoiceChannel must be used within a VoiceChannelProvider');
    }
    return context;
};

export const VoiceChannelProvider = ({ children }) => {
    const [voiceChannels, setVoiceChannels] = useState(new Map()); // Map<channelId, {participants: Map<userId, {name, isMuted, isSpeaking}>}>

    const updateVoiceChannelParticipants = (channelId, participants) => {
        setVoiceChannels(prev => {
            const newChannels = new Map(prev);
            newChannels.set(channelId, {
                participants: new Map(participants)
            });
            return newChannels;
        });
    };

    const addVoiceChannelParticipant = (channelId, userId, participantData) => {
        setVoiceChannels(prev => {
            const newChannels = new Map(prev);
            const channel = newChannels.get(channelId) || { participants: new Map() };
            channel.participants.set(userId, participantData);
            newChannels.set(channelId, channel);
            return newChannels;
        });
    };

    const removeVoiceChannelParticipant = (channelId, userId) => {
        setVoiceChannels(prev => {
            const newChannels = new Map(prev);
            const channel = newChannels.get(channelId);
            if (channel) {
                channel.participants.delete(userId);
                if (channel.participants.size === 0) {
                    newChannels.delete(channelId);
                } else {
                    newChannels.set(channelId, channel);
                }
            }
            return newChannels;
        });
    };

    const updateVoiceChannelParticipant = (channelId, userId, updates) => {
        setVoiceChannels(prev => {
            const newChannels = new Map(prev);
            const channel = newChannels.get(channelId);
            if (channel) {
                const participant = channel.participants.get(userId);
                if (participant) {
                    channel.participants.set(userId, { ...participant, ...updates });
                    newChannels.set(channelId, channel);
                }
            }
            return newChannels;
        });
    };

    const getVoiceChannelParticipants = (channelId) => {
        const channel = voiceChannels.get(channelId);
        return channel ? Array.from(channel.participants.values()) : [];
    };

    const getVoiceChannelParticipantCount = (channelId) => {
        const channel = voiceChannels.get(channelId);
        return channel ? channel.participants.size : 0;
    };

    const value = {
        voiceChannels,
        updateVoiceChannelParticipants,
        addVoiceChannelParticipant,
        removeVoiceChannelParticipant,
        updateVoiceChannelParticipant,
        getVoiceChannelParticipants,
        getVoiceChannelParticipantCount
    };

    return (
        <VoiceChannelContext.Provider value={value}>
            {children}
        </VoiceChannelContext.Provider>
    );
}; 