import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { FaHashtag, FaMicrophone, FaCog, FaLock, FaUser } from 'react-icons/fa';
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
    const { getVoiceChannelParticipants, forceSync } = useVoiceChannel();

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
                            const isVoiceChannel = chat.typeId === 4;
                            console.log('Voice channel condition check:', {
                                chatId: chat.chatId,
                                chatName: chat.name,
                                typeId: chat.typeId,
                                chatType: chat.chatType,
                                isVoiceChannel
                            });
                            
                            if (isVoiceChannel) {
                                const channelId = chat.chatId || chat.id;
                                const participants = getVoiceChannelParticipants(channelId);
                                
                                // Убираем дубликаты участников по ID
                                const uniqueParticipants = participants.filter((participant, index, self) => 
                                    index === self.findIndex(p => p.id === participant.id)
                                );
                                
                                const participantCount = uniqueParticipants.length;
                                console.log('Voice channel participants:', {
                                    chatId: chat.chatId,
                                    chatIdAlt: chat.id,
                                    channelId,
                                    chatName: chat.name,
                                    participantCount,
                                    participants: uniqueParticipants
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
                                                {isVoiceChannel && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            forceSync();
                                                        }}
                                                        style={{
                                                            marginLeft: '8px',
                                                            fontSize: '0.7em',
                                                            padding: '2px 4px',
                                                            backgroundColor: '#4a4a4a',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            color: '#8e9297',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Синхронизировать участников"
                                                    >
                                                        🔄
                                                    </button>
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
                                                {participant.isMuted && (
                                                    <span style={{ color: '#ed4245' }}>🔇</span>
                                                )}
                                                {participant.isSpeaking && (
                                                    <span style={{ color: '#43b581' }}>🔊</span>
                                                )}
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