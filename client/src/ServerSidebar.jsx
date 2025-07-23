// ServerSidebar.jsx
import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaTimes } from 'react-icons/fa';
import CategoriesList from './CategoriesList';
import UserPanel from './UserPanel';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from './config/apiConfig';
import './styles/ServerSidebar.css';

const ServerSidebar = ({ 
    server,
    setModalsState,
    setContextMenuCategory,
    setContextMenuChat,
    fetchUsers,
    userPermissions,
    isServerOwner,
    connection,
    userId,
    userRoles,
    voiceRoom,
    isMuted,
    isAudioEnabled,
    onToggleMute,
    onToggleAudio,
    ...props
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [serverBanner, setServerBanner] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchServerBanner = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/server/${server.serverId}/banner`);
                if (response.ok) {
                    const data = await response.json();
                    setServerBanner(data);
                } else {
                    setServerBanner(null);
                }
            } catch (error) {
                console.error('Ошибка при получении баннера:', error);
                setServerBanner(null);
            }
        };

        if (server?.serverId) {
            fetchServerBanner();
        }
    }, [server?.serverId]);

    const handleLeaveServer = async () => {
        if (!window.confirm('Вы уверены, что хотите покинуть сервер?')) {
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/messages/servers/${server.serverId}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: parseInt(userId)
                })
            });

            if (response.ok) {
                navigate('/channels/@me');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Ошибка при покидании сервера');
            }
        } catch (error) {
            console.error('Ошибка при покидании сервера:', error);
            alert(error.message);
        }
    };

    const handleCategoryContextMenu = (e, categoryId, categoryName) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuCategory({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            categoryId,
            categoryName
        });
    };

    const handleChatContextMenu = (e, chatId, chatName, chatType) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuChat({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            chatId,
            chatName,
            chatType
        });
    };

    const handleChatClick = (chatId, groupName, chatType) => {
        console.log('ServerSidebar handleChatClick:', { chatId, groupName, chatType });
        
        const chatData = {
            chatId,
            groupName,
            chatType
        };
        
        // Вызываем функцию onChatSelect для передачи данных в ServerPage
        if (props.onChatSelect) {
            console.log('Calling props.onChatSelect with:', chatData);
            props.onChatSelect(chatData);
        } else {
            console.log('props.onChatSelect is not defined');
        }
        
        props.setSelectedChat(chatData);
        navigate(`/channels/${props.serverId}/${chatId}`);
    };

    const handleShowAddMember = () => {
        fetchUsers();
        setModalsState(prev => ({ ...prev, showAddMemberModal: true }));
    };

    return (
        <div className="server-sidebar">
            <div 
                className="server-header"
                style={{
                    backgroundColor: serverBanner?.bannerColor || '#2f3136',
                    minHeight: (serverBanner?.bannerColor || serverBanner?.banner) ? '132px' : '52px'
                }}
            >
                {serverBanner?.banner && (
                    <div 
                        className="server-banner"
                        style={{
                            backgroundImage: `url(${BASE_URL}${serverBanner.banner})`
                        }}
                    />
                )}
                <div className="server-header-content">
                    <h2 className="server-name">{server.name}</h2>
                    <div className="dropdown-container">
                        <button
                            className="icon-toggle"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            {showDropdown ? <FaTimes /> : <FaChevronDown />}
                        </button>
                        {showDropdown && (
                            <div className="dropdown-menu">
                                {(isServerOwner || userPermissions?.createInvites) && (
                                    <button className="dropdown-item" onClick={handleShowAddMember}>
                                        Добавить участника
                                    </button>
                                )}
                                <button 
                                    className="dropdown-item" 
                                    onClick={() => setModalsState(prev => ({
                                        ...prev,
                                        showServerSettings: true
                                    }))}
                                >
                                    Настройки сервера
                                </button>
                                {!isServerOwner && (
                                    <button 
                                        className="dropdown-item danger"
                                        onClick={handleLeaveServer}
                                    >
                                        Покинуть сервер
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="tree">
                <CategoriesList 
                    categories={server.categories}
                    handleCategoryContextMenu={handleCategoryContextMenu}
                    handleChatContextMenu={handleChatContextMenu}
                    setModalsState={setModalsState}
                    {...props}
                    handleGroupChatClick={handleChatClick}
                    userPermissions={userPermissions}
                    connection={connection}
                    isServerOwner={isServerOwner}
                    userRoles={userRoles}
                    userId={userId}
                />
            </div>
            
            <UserPanel 
                userId={userId} 
                username={props.username} 
                isOpen={true}
                voiceRoom={voiceRoom}
                isMuted={isMuted}
                isAudioEnabled={isAudioEnabled}
                onToggleMute={onToggleMute}
                onToggleAudio={onToggleAudio}
            />
        </div>
    );
};

export default ServerSidebar;