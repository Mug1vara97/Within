import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Login from './Authentication/Login';
import Register from './Authentication/Register';
import "./UserProfile.css"
import { AudioProvider } from './contexts/AudioContext';


const App = () => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : { username: null, userId: null };
    });

    const handleLogin = (username, userId) => {
        const userData = { username, userId };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser({ username: null, userId: null });
        localStorage.removeItem('user');
    };

    return (
        <AudioProvider>
                <Router>
                    <Routes>
                        <Route path="/*" element={user.username ? <Home user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />} />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/register" element={<Register />} />
                    </Routes>
                </Router>
        </AudioProvider>
    );
};

export default App;