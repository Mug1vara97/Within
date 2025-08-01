import React from 'react';
import { MicOff, HeadsetOff } from '@mui/icons-material';
import './styles/VoiceChannelUsers.css';

const VoiceChannelUsers = React.memo(({ users = [], currentUserId }) => {
    if (!users || users.length === 0) {
        return null;
    }

    return (
        <div className="voice-channel-users">
            {users.map((user) => (
                <div key={user.id} className={`voice-user ${user.id === currentUserId ? 'current-user' : ''}`}>
                    <div className="voice-user-avatar">
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