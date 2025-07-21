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
    const { getVoiceChannelParticipants, getVoiceChannelParticipantCount } = useVoiceChannel();

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
                                {(() => {
                                    const isVoiceChannel = chat.chatType === 4;
                                    console.log('Voice channel condition check:', {
                                        chatId: chat.chatId,
                                        chatName: chat.name,
                                        typeId: chat.typeId,
                                        chatType: chat.chatType,
                                        isVoiceChannel,
                                        condition1: chat.typeId === 2,
                                        condition2: chat.chatType === 4
                                    });
                                    return isVoiceChannel ? (() => {
                                        const channelId = chat.chatId || chat.id;
                                        const participantCount = getVoiceChannelParticipantCount(channelId);
                                        const participants = getVoiceChannelParticipants(channelId);
                                        console.log('Voice channel participants:', {
                                            chatId: chat.chatId,
                                            chatIdAlt: chat.id,
                                            channelId,
                                            chatName: chat.name,
                                            participantCount,
                                            participants
                                        });
                                        return participantCount > 0 ? (
                                            <div className="voice-channel-participants">
                                                <span className="participant-count">{participantCount}</span>
                                                <div className="participant-avatars">
                                                    {participants.slice(0, 3).map((participant, index) => (
                                                        <div key={index} className="participant-avatar">
                                                            <FaUser />
                                                        </div>
                                                    ))}
                                                    {participants.length > 3 && (
                                                        <div className="more-participants">
                                                            +{participants.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null;
                                    })() : null;
                                })()}
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
                    </>
                );
            }}
        </Draggable>
    );
};

export default React.memo(ChatItem); 