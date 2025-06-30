import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from './config/apiConfig';
import { Mic, MicOff, Headset, HeadsetOff } from '@mui/icons-material';

const UserPanel = ({ userId, username, isOpen, isMuted, isAudioEnabled, onToggleMute, onToggleAudio }) => {
    const [userProfile, setUserProfile] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showBannerEditor, setShowBannerEditor] = useState(false);
    const [bannerInput, setBannerInput] = useState('');
    const fileInputRef = useRef(null);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [avatarInput, setAvatarInput] = useState('');
    const avatarFileInputRef = useRef(null);

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/profile/${userId}/profile`);
            if (response.ok) {
                const data = await response.json();
                if (data.avatar && !data.avatar.startsWith('http')) {
                    data.avatar = `${BASE_URL}${data.avatar}`;
                }
                setUserProfile(data);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };
    const toggleProfile = () => {
        setShowProfile(!showProfile);
    };

    const updateAvatar = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/profile/update-avatar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    UserId: userId,
                    Avatar: avatarInput
                })
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setUserProfile(prev => ({ ...prev, avatar: updatedProfile.Avatar }));
                setShowAvatarEditor(false);
                setAvatarInput('');
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
        }
    };

    const handleAvatarFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${BASE_URL}/api/profile/upload/avatar`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const { url } = await response.json();
                setAvatarInput(url);
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
        }
    };

    const updateBanner = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/profile/update-banner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    UserId: userId,
                    Banner: bannerInput
                })
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setUserProfile(prev => ({ ...prev, banner: updatedProfile.Banner }));
                setShowBannerEditor(false);
                setBannerInput('');
            }
        } catch (error) {
            console.error('Error updating banner:', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${BASE_URL}/api/profile/upload/banner`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const { url } = await response.json();
                setBannerInput(url);
            }
        } catch (error) {
            console.error('Error uploading banner:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
          fetchUserProfile();
        }
      }, [isOpen, userId]);
    
      if (!isOpen) return null;    

    return (
        <>
        <div className="user-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
        }}>
             <div 
                className="user-avatar" 
                style={{ 
                    backgroundColor: userProfile?.avatarColor || '#5865F2', 
                    cursor: 'pointer',
                    flexShrink: 0
                }}
                onClick={toggleProfile}
            >
                {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="User avatar" className="avatar-image" />
                ) : (
                    username.charAt(0).toUpperCase()
                )}
            </div>
            
            <span className="username" style={{
                textAlign: 'center',
                flex: 1,
                color: '#dcddde'
            }}>{username}</span>
            
            {/* Кнопки управления звуком - справа */}
            <div className="voice-controls" style={{
                display: 'flex',
                gap: '6px',
                flexShrink: 0
            }}>
                <button
                        className="voice-control-button"
                        onClick={onToggleMute}
                        title={isMuted ? "Включить микрофон" : "Выключить микрофон"}
                        style={{
                            background: isMuted ? '#ed4245' : '#40444b',
                            border: 'none',
                            borderRadius: '4px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#ffffff',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isMuted ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
                    </button>
                    
                    <button
                        className="voice-control-button"
                        onClick={onToggleAudio}
                        title={isAudioEnabled ? "Выключить звук" : "Включить звук"}
                        style={{
                            background: !isAudioEnabled ? '#ed4245' : '#40444b',
                            border: 'none',
                            borderRadius: '4px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#ffffff',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isAudioEnabled ? <Headset fontSize="small" /> : <HeadsetOff fontSize="small" />}
                    </button>
                </div>
        </div>

        {showProfile && (
                <div className="profile-modal">
                    <div className="profile-modal-content">
                        <div className="profile-banner" style={{ 
                            backgroundImage: userProfile?.banner?.startsWith('/uploads/') 
                                ? `url(${BASE_URL}${userProfile.banner})` 
                                : (userProfile?.banner?.startsWith('http') ? `url(${userProfile.banner})` : 'none'),
                            backgroundColor: userProfile?.banner?.startsWith('#') 
                                ? userProfile.banner 
                                : (userProfile?.banner ? 'transparent' : userProfile?.avatarColor || '#5865F2'),
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                            <button className="close-button-profile" onClick={toggleProfile}>×</button>
                            
                            <div className="profile-avatar-large-container">
                            <div 
                                className="profile-avatar-large" 
                                style={{ 
                                    backgroundColor: userProfile?.avatarColor || '#5865F2',
                                    position: 'relative'
                                }}
                                onClick={() => setShowAvatarEditor(true)}
                            >
                                {userProfile?.avatar ? (
                                    <img 
                                        src={userProfile.avatar} 
                                        alt="User avatar" 
                                        className="avatar-image-large" 
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    username.charAt(0).toUpperCase()
                                )}
                                <div className="avatar-edit-overlay">
                                    <span>Изменить</span>
                                </div>
                            </div>
                        </div>

                        {showAvatarEditor && (
                            <div className="avatar-editor">
                                <h3>Редактирование аватарки</h3>
                                <div className="avatar-options">
                                    <div className="image-option">
                                        <input
                                            type="file"
                                            ref={avatarFileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarFileUpload}
                                            accept="image/*"
                                        />
                                        <button 
                                            onClick={() => avatarFileInputRef.current.click()}
                                            className="upload-button"
                                        >
                                            Загрузить фото
                                        </button>
                                        {avatarInput && (
                                            <div className="avatar-preview">
                                                <img 
                                                    src={avatarInput} 
                                                    alt="Preview" 
                                                    style={{ 
                                                        width: '100px', 
                                                        height: '100px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover'
                                                    }} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="avatar-editor-actions">
                                    <button onClick={updateAvatar}>Сохранить</button>
                                    <button onClick={() => {
                                        setShowAvatarEditor(false);
                                        setAvatarInput('');
                                    }}>Отмена</button>
                                </div>
                            </div>
                        )}
                            
                            {/* Перенесенная кнопка изменения баннера */}
                            <button 
                                className="edit-banner-button"
                                onClick={() => setShowBannerEditor(true)}
                            >
                                Изменить баннер
                            </button>
                        </div>

                        {showBannerEditor && (
                            <div className="banner-editor">
                                <h3>Редактирование баннера</h3>
                                <div className="banner-options">
                                    <div className="color-option">
                                        <p>Использовать цвет:</p>
                                        <input 
                                            type="color" 
                                            value={bannerInput.startsWith('#') ? bannerInput : '#5865F2'}
                                            onChange={(e) => setBannerInput(e.target.value)}
                                        />
                                        <button onClick={() => setBannerInput(userProfile?.avatarColor || '#5865F2')}>
                                            Использовать цвет аватарки
                                        </button>
                                    </div>
                                    <div className="image-option">
                                        <p>Или загрузить изображение:</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                        />
                                        <button onClick={() => fileInputRef.current.click()}>
                                            Выбрать файл
                                        </button>
                                        {(bannerInput.startsWith('http') || bannerInput.startsWith('/')) && (
                                            <div className="image-preview">
                                                <img src={bannerInput} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="banner-editor-actions">
                                    <button onClick={updateBanner}>Сохранить</button>
                                    <button onClick={() => {
                                        setShowBannerEditor(false);
                                        setBannerInput('');
                                    }}>Отмена</button>
                                </div>
                            </div>
                        )}

                        <div className="profile-header">
                            <h2>{username}</h2>
                        </div>
                        <div className="profile-body">
                            {userProfile?.description && (
                                <div className="profile-section">
                                    <h3>Обо мне</h3>
                                    <p>{userProfile.description}</p>
                                </div>
                            )}
                            <div className="profile-section">
                                <h3>Информация</h3>
                                <p>В числе участников с {new Date(userProfile?.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="profile-modal-overlay" onClick={toggleProfile}></div>
                </div>
            )}
        </>
    );
};

export default UserPanel;