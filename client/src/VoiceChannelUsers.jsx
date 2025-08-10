import React, { useState, useEffect } from 'react';
import { MicOff, HeadsetOff } from '@mui/icons-material';
import './styles/VoiceChannelUsers.css';

const VoiceChannelUsers = React.memo(({ users = [], currentUserId }) => {
    const [userProfiles, setUserProfiles] = useState(new Map());

    // Функция для получения профиля пользователя
    const fetchUserProfile = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://whithin.ru/api/profile/${userId}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const profile = await response.json();
                const avatarData = {
                    avatarUrl: profile.avatar ? `https://whithin.ru${profile.avatar}` : null,
                    avatarColor: profile.avatarColor || '#5865F2',
                    bannerUrl: profile.banner ? `https://whithin.ru${profile.banner}` : null
                };
                setUserProfiles(prev => new Map(prev).set(userId, avatarData));
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    // Загружаем профили всех пользователей
    useEffect(() => {
        users.forEach(user => {
            if (!userProfiles.has(user.id)) {
                fetchUserProfile(user.id);
            }
        });
    }, [users, userProfiles]);

    // Функция для отображения аватара пользователя
    const renderUserAvatar = (user) => {
        const userProfile = userProfiles.get(user.id);
        const avatarUrl = userProfile?.avatarUrl;
        const avatarColor = userProfile?.avatarColor || '#5865F2';
        const bannerUrl = userProfile?.bannerUrl;
        
        // Если есть баннер, используем его как фон
        if (bannerUrl) {
            return (
                <div 
                    className="voice-user-avatar"
                    style={{
                        backgroundImage: `url(${bannerUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Поверх баннера показываем полупрозрачный слой для читаемости текста */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '50%'
                    }} />
                    {/* Текст поверх баннера */}
                    <span style={{
                        position: 'relative',
                        zIndex: 1,
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}>
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                    </span>
                </div>
            );
        }
        
        // Если есть аватар, используем его
        if (avatarUrl) {
            return (
                <img
                    src={avatarUrl}
                    alt={user.name || 'User'}
                    className="voice-user-avatar"
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                    }}
                    onError={(e) => {
                        // Если загрузка аватара не удалась, показываем букву
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            );
        }
        
        // Если нет ни баннера, ни аватара, используем цвет
        return (
            <div 
                className="voice-user-avatar"
                style={{
                    backgroundColor: avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}
            >
                {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
        );
    };

    if (!users || users.length === 0) {
        return null;
    }

    return (
        <div className="voice-channel-users">
            {users.map((user) => (
                <div key={user.id} className={`voice-user ${user.id === currentUserId ? 'current-user' : ''}`}>
                    {renderUserAvatar(user)}
                    {/* Fallback аватар (скрыт по умолчанию) */}
                    <div 
                        className="voice-user-avatar"
                        style={{
                            backgroundColor: userProfiles.get(user.id)?.avatarColor || '#5865F2',
                            display: 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="voice-user-info">
                        <span className="voice-user-name">{user.name || 'Unknown'}</span>
                        <div className="voice-user-indicators">
                            {user.isMuted && (
                                <MicOff className="voice-indicator muted" title="Микрофон выключен" />
                            )}
                            {user.isAudioDisabled && (
                                <HeadsetOff className="voice-indicator audio-disabled" title="Звук выключен" />
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default VoiceChannelUsers; 