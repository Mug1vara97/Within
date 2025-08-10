import React from 'react';
import UserStatus from './UserStatus';

const UserAvatar = ({ username, avatarUrl, avatarColor, size = '32px', status, showStatus = true }) => {
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
                    backgroundColor: avatarColor || '#5865F2',
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
                    overflow: 'hidden'
                }}
            >
                {avatarUrl ? (
                    <img 
                        src={avatarUrl} 
                        alt="User avatar" 
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    username?.charAt(0).toUpperCase()
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