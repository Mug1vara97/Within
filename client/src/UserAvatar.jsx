import React from 'react';
import UserStatus from './UserStatus';

const UserAvatar = ({ username, avatarUrl, avatarColor, bannerUrl, size = '32px', status, showStatus = true }) => {
    const getStatusSize = () => {
        const sizeNum = parseInt(size);
        if (sizeNum <= 24) return 'small';
        if (sizeNum >= 100) return 'large';
        return 'medium';
    };

    const getAvatarSize = () => {
        const sizeNum = parseInt(size);
        if (sizeNum <= 24) return 'small';
        if (sizeNum >= 100) return 'large';
        return 'medium';
    };

    const getFontSize = () => {
        const sizeNum = parseInt(size);
        if (sizeNum <= 24) return '11px';
        if (sizeNum <= 32) return '14px';
        if (sizeNum <= 48) return '18px';
        if (sizeNum <= 80) return '32px';
        return '48px'; // Для больших аватаров как 120px
    };

    const getBackgroundStyle = () => {
        if (bannerUrl) {
            return {
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        }
        // Если нет баннера, используем avatarColor как фон
        return {
            backgroundColor: avatarColor || '#5865F2'
        };
    };

    return (
        <div 
            className="user-avatar-container"
            style={{ 
                position: 'relative',
                display: 'inline-block'
            }}
        >
            <div 
                className="user-avatar"
                style={{ 
                    ...getBackgroundStyle(),
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: getFontSize(),
                    fontWeight: 'bold',
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {bannerUrl && (
                    // Поверх баннера показываем полупрозрачный слой для читаемости текста
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '50%'
                    }} />
                )}
                {avatarUrl ? (
                    <img 
                        src={avatarUrl} 
                        alt="User avatar" 
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 1
                        }}
                    />
                ) : (
                    <span style={{ position: 'relative', zIndex: 1 }}>
                        {username?.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>
            {showStatus && status && (
                <div className={`user-status-avatar-${getAvatarSize()}`}>
                    <UserStatus status={status} size={getStatusSize()} />
                </div>
            )}
        </div>
    );
};

export default UserAvatar;