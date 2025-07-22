import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaHeadphones, FaHeadphonesAlt } from 'react-icons/fa';
import './styles/VoiceChannelUsers.css';

const VoiceChannelUsers = ({ users = [], currentUserId }) => {
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
                            {user.isMuted ? (
                                <FaMicrophoneSlash className="voice-indicator muted" title="Микрофон выключен" />
                            ) : user.isSpeaking ? (
                                <FaMicrophone className="voice-indicator speaking" title="Говорит" />
                            ) : (
                                <FaMicrophone className="voice-indicator idle" title="Микрофон включен" />
                            )}
                            {!user.isAudioEnabled ? (
                                <FaHeadphonesAlt className="voice-indicator audio-disabled" title="Звук выключен" />
                            ) : (
                                <FaHeadphones className="voice-indicator audio-enabled" title="Звук включен" />
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VoiceChannelUsers; 