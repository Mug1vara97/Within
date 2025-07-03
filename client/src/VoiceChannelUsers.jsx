import React, { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaHeadphones, FaHeadphonesAlt, FaVolumeUp, FaVolumeDown, FaVolumeMute } from 'react-icons/fa';
import { Slider, Popover, Box, Typography, Tooltip, IconButton } from '@mui/material';
import './styles/VoiceChannelUsers.css';

const VoiceChannelUsers = ({ users = [], currentUserId, onVolumeChange }) => {
    const [volumePopover, setVolumePopover] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);

    if (!users || users.length === 0) {
        return null;
    }

    const handleVolumeIconClick = (event, userId) => {
        event.stopPropagation();
        if (userId === currentUserId) return; // Нельзя изменять громкость самого себя
        
        setSelectedUserId(userId);
        setVolumePopover(event.currentTarget);
    };

    const handleVolumePopoverClose = () => {
        setVolumePopover(null);
        setSelectedUserId(null);
    };

    const handleVolumeSliderChange = (event, newValue) => {
        console.log('🎛️ VoiceChannelUsers: Slider changed for user:', selectedUserId, 'to:', newValue);
        if (onVolumeChange && selectedUserId) {
            console.log('📞 VoiceChannelUsers: Calling onVolumeChange');
            onVolumeChange(selectedUserId, newValue);
        } else {
            console.warn('⚠️ VoiceChannelUsers: onVolumeChange not available or no user selected');
            console.log('onVolumeChange:', !!onVolumeChange, 'selectedUserId:', selectedUserId);
        }
    };

    const getVolumeIcon = (user) => {
        if (user.id === currentUserId) {
            return user.isAudioEnabled ? <FaHeadphones className="voice-indicator audio-enabled" title="Звук включен" /> : <FaHeadphonesAlt className="voice-indicator audio-disabled" title="Звук выключен" />;
        }
        
        const volume = user.volume || 100;
        if (volume === 0) {
            return <FaVolumeMute className="voice-indicator volume-muted" title="Заглушен" />;
        } else if (volume <= 30) {
            return <FaVolumeDown className="voice-indicator volume-low" title={`Громкость: ${volume}%`} />;
        } else {
            return <FaVolumeUp className="voice-indicator volume-high" title={`Громкость: ${volume}%`} />;
        }
    };

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
                            {user.id === currentUserId ? (
                                getVolumeIcon(user)
                            ) : (
                                <Tooltip title="Нажмите для регулировки громкости" placement="top">
                                    <span 
                                        onClick={(e) => handleVolumeIconClick(e, user.id)}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        {getVolumeIcon(user)}
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            
            <Popover
                open={Boolean(volumePopover) && selectedUserId !== null}
                anchorEl={volumePopover}
                onClose={handleVolumePopoverClose}
                anchorOrigin={{
                    vertical: 'center',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            backgroundColor: '#2f3136',
                            border: '1px solid #40444b',
                            borderRadius: '8px',
                            padding: '12px 8px',
                            minWidth: '200px',
                        }
                    }
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    color: '#dcddde'
                }}>
                    <FaVolumeDown style={{ fontSize: '16px', color: '#72767d' }} />
                    <Slider
                        value={users.find(u => u.id === selectedUserId)?.volume || 100}
                        onChange={handleVolumeSliderChange}
                        min={0}
                        max={100}
                        step={1}
                        sx={{
                            flex: 1,
                            height: 8,
                            '& .MuiSlider-track': {
                                backgroundColor: '#5865f2',
                                border: 'none',
                            },
                            '& .MuiSlider-rail': {
                                backgroundColor: '#4f545c',
                            },
                            '& .MuiSlider-thumb': {
                                backgroundColor: '#5865f2',
                                width: 16,
                                height: 16,
                                border: '2px solid #ffffff',
                                '&:hover': {
                                    boxShadow: '0 0 0 8px rgba(88, 101, 242, 0.16)',
                                }
                            }
                        }}
                    />
                    <FaVolumeUp style={{ fontSize: '16px', color: '#72767d' }} />
                    <Typography variant="caption" sx={{ 
                        color: '#dcddde', 
                        minWidth: '35px',
                        textAlign: 'center',
                        fontSize: '12px'
                    }}>
                        {users.find(u => u.id === selectedUserId)?.volume || 100}%
                    </Typography>
                </Box>
            </Popover>
        </div>
    );
};

export default VoiceChannelUsers; 