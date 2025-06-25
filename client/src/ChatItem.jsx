import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { FaHashtag, FaMicrophone, FaCog, FaLock } from 'react-icons/fa';

const ChatItem = ({ 
    chat, 
    selectedChat, 
    onContextMenu,
    setModalsState,
    index,
    userPermissions,
    isServerOwner,
    handleGroupChatClick,
    ...props 
}) => {
    const isDragDisabled = !(isServerOwner || userPermissions?.manageChannels);

    const handleClick = () => {
        // Сбрасываем состояние выхода из голосового чата при входе в новый чат
        if (props.setLeftVoiceChat) {
            props.setLeftVoiceChat(false);
        }
        // Вызываем обработчик клика с типом чата
        handleGroupChatClick(chat.chatId, chat.name, chat.typeId);
    };

    console.log('ChatItem render:', {
        chatId: chat.chatId,
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
                    <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`channel ${selectedChat?.chatId === chat.chatId ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''} ${chat.isPrivate ? 'private' : ''}`}
                        onClick={handleClick}
                        onContextMenu={(e) => onContextMenu(e, chat.chatId, chat.name, chat.typeId)}
                        style={{
                            ...provided.draggableProps.style,
                            cursor: isDragDisabled ? 'default' : 'grab'
                        }}
                    >
                        <div className="channel-content">
                            <div className="channel-icons">
                                {chat.typeId === 3 ? <FaHashtag /> : <FaMicrophone />}
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
            }}
        </Draggable>
    );
};

export default React.memo(ChatItem); 