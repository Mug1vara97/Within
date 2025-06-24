// CategoryItem.jsx
import React, { useState, useEffect } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import ChatItem from './ChatItem';
import { FaLock } from 'react-icons/fa';

const CategoryItem = ({ 
    category,
    index,
    onContextMenu,
    handleChatContextMenu,
    setModalsState,
    handleGroupChatClick,
    serverId,
    userPermissions,
    isServerOwner,
    selectedChat
}) => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const savedState = localStorage.getItem(`categoryCollapsed_${serverId}_${category.categoryId}`);
        return savedState ? JSON.parse(savedState) : false;
    });

    useEffect(() => {
        localStorage.setItem(
            `categoryCollapsed_${serverId}_${category.categoryId}`, 
            JSON.stringify(isCollapsed)
        );
    }, [isCollapsed, category.categoryId, serverId]);

    const toggleCollapse = (e) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
    };
    
    return (
        <Draggable
            draggableId={`category-${category.categoryId}`}
            index={index}
            isDragDisabled={!(isServerOwner || userPermissions?.manageChannels)}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`category ${snapshot.isDragging ? 'dragging' : ''} ${category.isPrivate ? 'private' : ''}`}
                    onContextMenu={(e) => onContextMenu(e, category.categoryId, category.categoryName)}
                >
                    <div 
                        className="category-header"
                        {...provided.dragHandleProps}
                    >
                        <div className="category-name-container">
                            {category.isPrivate && <FaLock className="private-icon" />}
                            <span 
                                className="category-name"
                                onClick={toggleCollapse}
                                aria-label={isCollapsed ? "Развернуть категорию" : "Свернуть категорию"}
                            >
                                {category.categoryName}
                            </span>
                        </div>
                        {(isServerOwner || userPermissions?.manageChannels) && (
                            <div className="category-actions">
                                <button
                                    className="add-chat-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setModalsState(prev => ({
                                            ...prev,
                                            showCreateChatModal: { 
                                                isOpen: true, 
                                                categoryId: category.categoryId,
                                                chatType: 3
                                            }
                                        }));
                                    }}
                                >
                                    <span className="icon">+</span>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {!isCollapsed && (
                        <Droppable
                            droppableId={`category-${category.categoryId}`}
                            type="CHAT"
                        >
                            {(provided, snapshot) => (
                                <ul 
                                    className={`channel-list ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${(!category.chats || category.chats.length === 0) ? 'empty' : ''}`}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {category.chats && category.chats.length > 0 ? (
                                        category.chats
                                            .sort((a, b) => a.chatOrder - b.chatOrder)
                                            .map((chat, index) => (
                                                <ChatItem
                                                    key={chat.chatId}
                                                    chat={chat}
                                                    index={index}
                                                    onContextMenu={handleChatContextMenu}
                                                    setModalsState={setModalsState}
                                                    handleGroupChatClick={handleGroupChatClick}
                                                    userPermissions={userPermissions}
                                                    isServerOwner={isServerOwner}
                                                    selectedChat={selectedChat}
                                                />
                                            ))
                                    ) : (
                                        <li className="empty-drop-target" />
                                    )}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default CategoryItem;