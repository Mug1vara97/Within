import React from 'react';
import UserStatus from './UserStatus';

const UserAvatar = ({ username, avatarUrl, avatarColor, size = '32px', status, showStatus = true }) => {
    const getStatusSize = () => {
        if (size === '24px') return 'small';
        if (size === '40px' || size === '48px') return 'large';
        return 'medium';
    };

    const getAvatarSize = () => {
        if (size === '24px') return 'small';
        if (size === '40px' || size === '48px') return 'large';
        return 'medium';
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
                    fontSize: size === '24px' ? '11px' : '14px',
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