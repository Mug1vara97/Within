import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Authentication/Login';
import Home from './Home';
import Register from './Authentication/Register';
import "./UserProfile.css"
import { AudioProvider } from './contexts/AudioContext';
import { VoiceChatProvider, useVoiceChat } from './contexts/VoiceChatContext';
import VoiceChat from './VoiceChat';

function VoiceChatHeadlessWrapper() {
    const { voiceRoom, isVoiceChatActive } = useVoiceChat();
    return isVoiceChatActive && voiceRoom ? (
        <VoiceChat
            roomId={voiceRoom.roomId}
            userName={voiceRoom.userName}
            userId={voiceRoom.userId}
            serverId={voiceRoom.serverId}
            autoJoin={true}
            headless={true}
        />
    ) : null;
}

const App = () => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : { username: null, userId: null };
    });

    const handleLogin = (username, userId) => {
        const userData = { username, userId };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        setUser({ username: null, userId: null });
        localStorage.removeItem('user');
    };

    return (
        <AudioProvider>
            <VoiceChatProvider>
                <VoiceChatHeadlessWrapper />
                <Router>
                    <Routes>
                        <Route path="/*" element={user.username ? <Home user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />} />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/register" element={<Register />} />
                    </Routes>
                </Router>
            </VoiceChatProvider>
        </AudioProvider>
    );
};

export default App;