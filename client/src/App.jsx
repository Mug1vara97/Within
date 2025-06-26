import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Authentication/Login';
import Home from './Home';
import Register from './Authentication/Register';
import "./UserProfile.css"
import { AudioProvider } from './contexts/AudioContext';
import VoiceChat from './VoiceChat';
// import { VoiceChatProvider } from './contexts/VoiceChatContext'; // закомментировано, чтобы не было конфликта контекстов

const App = () => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : { username: null, userId: null };
    });

    // Глобальное состояние для голосового звонка
    const [voiceRoomData, setVoiceRoomData] = useState(null);
    const [showVoiceUI, setShowVoiceUI] = useState(false);

    const handleLogin = (username, userId) => {
        const userData = { username, userId };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        setUser({ username: null, userId: null });
        localStorage.removeItem('user');
    };

    // Функции для управления звонком, которые будут прокидываться в Home/ServerPage
    const handleJoinVoiceChannel = (data) => {
        // Сохраняем предыдущий serverId если переходим в ChatList
        setVoiceRoomData(prev => ({
            ...data,
            serverId: data.serverId || prev?.serverId
        }));
        setShowVoiceUI(true);
    };

    const handleLeaveVoiceChannel = () => {
        setShowVoiceUI(false);
    };

    // Полный выход из звонка
    const handleLeaveVoiceRoom = () => {
        setVoiceRoomData(null);
        setShowVoiceUI(false);
    };

    return (
        <AudioProvider>
            {/* VoiceChat всегда работает в фоне, UI показывается по showVoiceUI */}
            {voiceRoomData && (
                <VoiceChat
                    roomId={voiceRoomData.roomId}
                    userName={voiceRoomData.userName}
                    userId={voiceRoomData.userId}
                    serverId={voiceRoomData.serverId}
                    autoJoin={true}
                    showUI={showVoiceUI}
                    onLeave={handleLeaveVoiceRoom}
                />
            )}
            {/* <VoiceChatProvider> */}  {/* закомментировано, чтобы не было конфликта контекстов */}
                <Router>
                    <Routes>
                        <Route path="/*" element={user.username ? <Home user={user} onLogout={handleLogout} onJoinVoiceChannel={handleJoinVoiceChannel} onLeaveVoiceChannel={handleLeaveVoiceChannel} /> : <Login onLogin={handleLogin} />} />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/register" element={<Register />} />
                    </Routes>
                </Router>
            {/* </VoiceChatProvider> */}
        </AudioProvider>
    );
};

export default App;