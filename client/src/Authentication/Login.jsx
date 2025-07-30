import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import { BASE_URL } from '../config/apiConfig';
import LetterGlitch from '../components/LetterGlitch';
import { FaDiscord, FaGoogle } from 'react-icons/fa';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
    
        try {
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });
    
            if (response.ok) {
                const data = await response.json();
                const userData = {
                    username: data.username,
                    userId: data.userId
                };
                localStorage.setItem('user', JSON.stringify(userData));
                onLogin(userData.username, userData.userId);
                navigate('/channels/@me');
            } else {
                setError('Invalid username or password');
            }
        } catch {
            setError('Network error. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <LetterGlitch
                glitchSpeed={50}
                centerVignette={true}
                outerVignette={false}
                smooth={true}
            />
            <div className="login-box">
                <div className="login-header">
                    <h2>Welcome back!</h2>
                    <p>We're so excited to see you again!</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>USERNAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="form-input"
                            placeholder="Enter your username"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label>PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-input"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="login-button">
                        Log In
                    </button>
                </form>

                <p className="register-link">
                    Need an account? <a href="/register">Register</a>
                </p>
            </div>
        </div>
    );
};

export default Login;