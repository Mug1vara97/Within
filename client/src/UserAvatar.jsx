const UserAvatar = ({ username, avatarUrl, avatarColor }) => {
    return (
        <div 
            className="user-avatar"
            style={{ 
                backgroundColor: avatarColor || '#5865F2',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                flexShrink: 0
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