import React from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import './VoiceChannelUsersList.css';

const VoiceChannelUsersList = ({ users = [], currentUserId }) => {
    console.log('VoiceChannelUsersList render:', { users, currentUserId });
    
    if (!users || users.length === 0) {
        console.log('VoiceChannelUsersList: no users, returning null');
        return null;
    }

    return (
        <div className="voice-channel-users-list">
            {users.map((user) => (
                <div 
                    key={user.id} 
                    className={`voice-user-item ${user.id === currentUserId ? 'current-user' : ''}`}
                >
                    <div className="voice-user-avatar">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="voice-user-info">
                        <span className="voice-user-name">{user.name || 'Unknown'}</span>
                        <div className="voice-user-indicators">
                            {user.isMuted ? (
                                <FaMicrophoneSlash className="voice-indicator muted" title="Микрофон выключен" />
                            ) : user.isSpeaking ? (
                                <FaMicrophone className="voice-indicator speaking" title="Говорит" />
                            ) : (
                                <FaMicrophone className="voice-indicator idle" title="Микрофон включен" />
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VoiceChannelUsersList; 