import React, { useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { FaHashtag, FaMicrophone, FaCog, FaLock, FaUser } from 'react-icons/fa';
import { MicOff, HeadsetOff, Mic, RecordVoiceOver } from '@mui/icons-material';
import { useVoiceChannel } from './contexts/VoiceChannelContext';

const ChatItem = ({ 
    chat, 
    selectedChat, 
    onContextMenu,
    setModalsState,
    index,
    userPermissions,
    isServerOwner,
    handleGroupChatClick
}) => {
    const isDragDisabled = !(isServerOwner || userPermissions?.manageChannels);
    const { getVoiceChannelParticipants, voiceChannels } = useVoiceChannel();

    // Предварительно вычисляем участников для голосового канала
    const isVoiceChannel = chat.typeId === 4;
    const channelId = chat.chatId || chat.id;
    
    const { uniqueParticipants, participantCount } = useMemo(() => {
        if (!isVoiceChannel) {
            return { uniqueParticipants: [], participantCount: 0 };
        }
        
        const participants = getVoiceChannelParticipants(channelId);
        
        // Убираем дубликаты участников по ID
        const unique = participants.filter((participant, index, self) => 
            index === self.findIndex(p => p.id === participant.id)
        );
        
        return {
            uniqueParticipants: unique,
            participantCount: unique.length
        };
    }, [isVoiceChannel, channelId, getVoiceChannelParticipants]);

    console.log('ChatItem render:', {
        chatId: chat.chatId,
        chat: chat,
        index,
        isDragDisabled,
        hasManageChannels: userPermissions?.manageChannels,
        isServerOwner
    });

    return (
        <Draggable
            draggableId={`chat-${chat.chatId}`}
            index={index}
            isDragDisabled={isDragDisabled}
        >
            {(provided, snapshot) => {
                console.log('Draggable render:', {
                    chatId: chat.chatId,
                    isDragging: snapshot.isDragging,
                    draggingOver: snapshot.draggingOver,
                    dragHandleProps: provided.dragHandleProps ? 'present' : 'missing',
                    isDragDisabled
                });

                return (
                    <>
                        {(() => {
                            console.log('Voice channel condition check:', {
                                chatId: chat.chatId,
                                chatName: chat.name,
                                typeId: chat.typeId,
                                chatType: chat.chatType,
                                isVoiceChannel
                            });
                            
                            if (isVoiceChannel) {
                                console.log('Voice channel participants:', {
                                    chatId: chat.chatId,
                                    chatIdAlt: chat.id,
                                    channelId,
                                    chatName: chat.name,
                                    participantCount,
                                    participants: uniqueParticipants.map(p => ({
                                        id: p.id,
                                        name: p.name,
                                        isMuted: p.isMuted,
                                        isSpeaking: p.isSpeaking,
                                        isAudioDisabled: p.isAudioDisabled
                                    })),
                                    allChannels: Array.from(voiceChannels.keys())
                                });
                                
                                return (
                                    <>
                                        <li
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`channel ${selectedChat?.chatId === chat.chatId ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''} ${chat.isPrivate ? 'private' : ''}`}
                                            onClick={() => {
                                                console.log('ChatItem clicked:', { 
                                                    chatId: chat.chatId, 
                                                    name: chat.name, 
                                                    typeId: chat.typeId,
                                                    chat: chat
                                                });
                                                handleGroupChatClick(chat.chatId, chat.name, chat.typeId);
                                            }}
                                            onContextMenu={(e) => onContextMenu(e, chat.chatId, chat.name, chat.typeId)}
                                            style={{
                                                ...provided.draggableProps.style,
                                                cursor: isDragDisabled ? 'default' : 'grab'
                                            }}
                                        >
                                            <div className="channel-content">
                                                <div className="channel-icons">
                                                    {(chat.typeId === 3 || chat.chatType === 3) ? <FaHashtag /> : <FaMicrophone />}
                                                    {chat.isPrivate && <FaLock className="private-icon" />}
                                                </div>
                                                <span className="channel-name">{chat.name}</span>
                                                {participantCount > 0 && (
                                                    <span className="participant-count" style={{ 
                                                        marginLeft: 'auto', 
                                                        fontSize: '0.8em', 
                                                        color: '#8e9297',
                                                        backgroundColor: '#36393f',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px'
                                                    }}>
                                                        {participantCount}
                                                    </span>
                                                )}

                                            </div>
                                            {(isServerOwner || userPermissions?.manageRoles) && (
                                                <div 
                                                    className="channel-settings"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        className="settings-button"
                                                        onClick={() => {
                                                            setModalsState(prev => ({
                                                                ...prev,
                                                                showChatSettingsModal: {
                                                                    isOpen: true,
                                                                    chatId: chat.chatId,
                                                                    chatName: chat.name
                                                                }
                                                            }));
                                                        }}
                                                    >
                                                        <FaCog />
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                        {participantCount > 0 && uniqueParticipants.map((participant) => (
                                            <li
                                                key={`participant-${channelId}-${participant.id}`}
                                                className="voice-channel-participant"
                                                style={{
                                                    paddingLeft: '20px',
                                                    fontSize: '0.9em',
                                                    color: '#8e9297',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    height: '28px',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'default'
                                                }}
                                            >
                                                <FaUser style={{ fontSize: '12px' }} />
                                                <span>{participant.name}</span>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    {participant.isMuted ? (
                                                        <MicOff style={{ fontSize: '14px', color: '#ed4245' }} title="Микрофон выключен" />
                                                    ) : participant.isSpeaking ? (
                                                        <RecordVoiceOver style={{ fontSize: '14px', color: '#43b581' }} title="Говорит" />
                                                    ) : (
                                                        <Mic style={{ fontSize: '14px', color: '#43b581' }} title="Микрофон включен" />
                                                    )}
                                                    {participant.isAudioDisabled && (
                                                        <HeadsetOff style={{ fontSize: '14px', color: '#ed4245' }} title="Звук выключен" />
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </>
                                );
                            }
                            
                            return (
                        <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`channel ${selectedChat?.chatId === chat.chatId ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''} ${chat.isPrivate ? 'private' : ''}`}
                            onClick={() => {
                                console.log('ChatItem clicked:', { 
                                    chatId: chat.chatId, 
                                    name: chat.name, 
                                    typeId: chat.typeId,
                                    chat: chat
                                });
                                handleGroupChatClick(chat.chatId, chat.name, chat.typeId);
                            }}
                            onContextMenu={(e) => onContextMenu(e, chat.chatId, chat.name, chat.typeId)}
                            style={{
                                ...provided.draggableProps.style,
                                cursor: isDragDisabled ? 'default' : 'grab'
                            }}
                        >
                            <div className="channel-content">
                                <div className="channel-icons">
                                            {(chat.typeId === 3 || chat.chatType === 3) ? <FaHashtag /> : <FaMicrophone />}
                                    {chat.isPrivate && <FaLock className="private-icon" />}
                                </div>
                                <span className="channel-name">{chat.name}</span>
                            </div>
                            {(isServerOwner || userPermissions?.manageRoles) && (
                                <div 
                                    className="channel-settings"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        className="settings-button"
                                        onClick={() => {
                                            setModalsState(prev => ({
                                                ...prev,
                                                showChatSettingsModal: {
                                                    isOpen: true,
                                                    chatId: chat.chatId,
                                                    chatName: chat.name
                                                }
                                            }));
                                        }}
                                    >
                                        <FaCog />
                                    </button>
                                </div>
                            )}
                        </li>
                            );
                        })()}
                    </>
                );
            }}
        </Draggable>
    );
};

export default React.memo(ChatItem); 