import React from 'react';
import VoiceChannelUsers from './VoiceChannelUsers';

const TestVoiceChat = () => {
    const testUsers = [
        {
            id: '1',
            name: 'Alice',
            isMuted: false,
            isSpeaking: true,
            isAudioEnabled: true,
            avatarUrl: null,
            avatarColor: '#5865F2'
        },
        {
            id: '2',
            name: 'Bob',
            isMuted: true,
            isSpeaking: false,
            isAudioEnabled: false,
            avatarUrl: 'https://via.placeholder.com/100x100/ff6b6b/ffffff?text=B',
            avatarColor: '#ff6b6b'
        },
        {
            id: '3',
            name: 'Charlie',
            isMuted: false,
            isSpeaking: false,
            isAudioEnabled: true,
            avatarUrl: null,
            avatarColor: '#4ecdc4'
        }
    ];

    return (
        <div style={{ 
            backgroundColor: '#2f3136', 
            padding: '20px', 
            color: 'white',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h2>Тест аватаров в голосовом чате</h2>
            <VoiceChannelUsers users={testUsers} currentUserId="1" />
        </div>
    );
};

export default TestVoiceChat; 