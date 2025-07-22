const UserAvatar = ({ username, avatarUrl, avatarColor, size = '32px' }) => {
    return (
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
    );
};

export default UserAvatar;