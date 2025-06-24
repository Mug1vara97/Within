// ContextMenu.jsx
import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ 
    contextMenu,
    contextMenuCategory,
    contextMenuChat,
    setModalsState,
    setContextMenu,
    setContextMenuCategory,
    setContextMenuChat
}) => {
    const menuRef = useRef(null);

    // Обработчик кликов вне меню
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                closeAllMenus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Обработчик клавиши Escape
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeAllMenus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const closeAllMenus = () => {
        setContextMenu({ visible: false, x: 0, y: 0 });
        setContextMenuCategory({ visible: false, x: 0, y: 0, categoryId: null, categoryName: '' });
        setContextMenuChat({ visible: false, x: 0, y: 0, chatId: null, chatName: '', chatType: null });
    };

    const handleContextMenuAction = (type) => {
        switch (type) {
            case 'createCategory':
                setModalsState(prev => ({...prev, showCreateCategoryModal: true}));
                break;
            case 'deleteChat':
                setModalsState(prev => ({
                    ...prev,
                    showDeleteChatModal: true,
                    chatToDelete: {
                        chatId: contextMenuChat.chatId,
                        chatName: contextMenuChat.chatName
                    }
                }));
                break;
            case 'chatSettings':
                setModalsState(prev => ({
                    ...prev, 
                    showChatSettingsModal: {
                        isOpen: true,
                        chatId: contextMenuChat.chatId,
                        chatName: contextMenuChat.chatName
                    }
                }));
                break;
            case 'deleteCategory':
                setModalsState(prev => ({
                    ...prev,
                    showDeleteCategoryModal: true,
                    contextMenuCategory: {
                        categoryId: contextMenuCategory.categoryId,
                        categoryName: contextMenuCategory.categoryName
                    }
                }));
                break;
            default:
                break;
        }
        closeAllMenus();
    };

    const renderContextMenu = () => {
        if (contextMenu.visible) {
            return (
                <div 
                    ref={menuRef}
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 1000
                    }}
                >
                    <button 
                        className="context-menu-item"
                        onClick={() => handleContextMenuAction('createCategory')}
                    >
                        Создать категорию
                    </button>
                </div>
            );
        }

        if (contextMenuCategory.visible) {
            return (
                <div 
                    ref={menuRef}
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenuCategory.y,
                        left: contextMenuCategory.x,
                        zIndex: 1000
                    }}
                >
                    <button 
                        className="context-menu-item"
                        onClick={() => handleContextMenuAction('deleteCategory')}
                    >
                        Удалить категорию
                    </button>
                </div>
            );
        }

        if (contextMenuChat.visible) {
            return (
                <div 
                    ref={menuRef}
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenuChat.y,
                        left: contextMenuChat.x,
                        zIndex: 1000
                    }}
                >
                    <button 
                        className="context-menu-item"
                        onClick={() => handleContextMenuAction('chatSettings')}
                    >
                        Настройки
                    </button>
                    <button 
                        className="context-menu-item delete"
                        onClick={() => handleContextMenuAction('deleteChat')}
                    >
                        Удалить чат
                    </button>
                </div>
            );
        }

        return null;
    };

    return renderContextMenu();
};

export default ContextMenu;