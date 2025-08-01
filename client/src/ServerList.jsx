import React, { useEffect, useState, useCallback } from 'react';
import { BASE_URL } from './config/apiConfig';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './styles/ServerList.css';
import compassIcon from './assets/magnifying-glass.png';
import NotificationButton from './components/NotificationButton';
import SettingsModal from './components/SettingsModal';
import { Settings } from '@mui/icons-material';

const ServerList = ({ userId, onDiscoverClick }) => {
    const [servers, setServers] = useState([]);
    const [newServerName, setNewServerName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [description, setDescription] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const navigate = useNavigate();

    const handleDiscoverClick = () => {
        onDiscoverClick(true);
        navigate('/discover/servers');
    };

    const handleLogout = () => {
        // Запрашиваем подтверждение
        if (window.confirm('Вы уверены, что хотите выйти из аккаунта?')) {
            // Очищаем данные пользователя из localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('token');
            
            // Перенаправляем на страницу входа
            navigate('/login');
        }
    };

    const fetchServers = useCallback(async () => {
        if (!userId) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/messages/servers?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                const sortedServers = data.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                setServers(sortedServers);
            } else {
                console.error('Failed to fetch servers:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching servers:', error);
        }
    }, [userId]);

    useEffect(() => {
        fetchServers();
    }, [fetchServers]);

    const handleCreateServer = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/messages/servers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serverName: newServerName,
                    ownerId: userId,
                    isPublic: isPublic,
                    description: description
                }),
            });

            const result = await response.json();

            if (response.ok) {
                await fetchServers();
                setNewServerName('');
                setIsPublic(false);
                setDescription('');
                setShowCreateModal(false);
                onDiscoverClick(false);
                navigate(`/channels/${result.serverId}`);
            } else {
                console.error('Error:', result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Network error:', error);
        }
    };

    const resetModalState = () => {
        setNewServerName('');
        setIsPublic(false);
        setDescription('');
        setShowCreateModal(false);
    };

    const onDragStart = () => {
        setIsDragging(true);
    };

    const onDragEnd = async (result) => {
        setIsDragging(false);

        if (!result.destination || !result.source) return;

        const { source, destination } = result;

        // Если позиция не изменилась
        if (source.index === destination.index) return;

        try {
            const items = Array.from(servers);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            // Обновляем позиции
            const updatedItems = items.map((item, index) => ({
                ...item,
                position: index
            }));

            // Оптимистично обновляем UI
            setServers(updatedItems);

            // Отправляем обновление на сервер
            const response = await fetch(`${BASE_URL}/api/messages/servers/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    serverOrders: updatedItems.map((server, index) => ({
                        serverId: server.serverId,
                        position: index
                    }))
                })
            });

            if (!response.ok) {
                // Если обновление не удалось, возвращаем исходное состояние
                await fetchServers();
                console.error('Failed to update server positions');
            }
        } catch (error) {
            // В случае ошибки возвращаем исходное состояние
            await fetchServers();
            console.error('Error updating server positions:', error);
        }
    };

    return (
        <div className="server-list">
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <Droppable droppableId="servers" direction="vertical">
                    {(provided) => (
                        <ul
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            <li className="server-item">
                                <Link 
                                    to="/channels/@me" 
                                    className="server-button"
                                    onClick={() => onDiscoverClick(false)}
                                >
                                    Чаты
                                </Link>
                            </li>
                            {servers.map((server, index) => (
                                <Draggable
                                    key={server.serverId.toString()}
                                    draggableId={server.serverId.toString()}
                                    index={index}
                                    isDragDisabled={!server.serverId}
                                >
                                    {(provided, snapshot) => (
                                        <li
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`server-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                            style={{
                                                ...provided.draggableProps.style,
                                                cursor: isDragging ? 'grabbing' : 'grab'
                                            }}
                                        >
                                            <Link
                                                to={`/channels/${server.serverId}`}
                                                className="server-button"
                                                onClick={() => {
                                                    if (!snapshot.isDragging) {
                                                        onDiscoverClick(false);
                                                    }
                                                }}
                                            >
                                                {server.avatar ? (
                                                    <img 
                                                        src={`${BASE_URL}${server.avatar}`}
                                                        alt={server.name}
                                                        style={{
                                                            width: 'inherit',
                                                            height: 'inherit',
                                                            borderRadius: 'inherit',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                ) : server.name}
                                            </Link>
                                        </li>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            <li className="server-item">
                                <div 
                                    className="server-button"
                                    onClick={handleDiscoverClick}
                                >
                                    <img 
                                        src={compassIcon}
                                        alt="Discover"
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            filter: 'brightness(0) invert(1)',
                                            opacity: 0.8
                                        }}
                                    />
                                </div>
                            </li>
                            <li className="server-item">
                                <button
                                    className="server-button create-button"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    +
                                </button>
                            </li>
                            <li className="server-item">
                                <NotificationButton />
                            </li>
                            <li className="server-item">
                                <button
                                    className="server-button settings-button"
                                    onClick={() => setShowSettings(true)}
                                    title="Настройки"
                                >
                                    <Settings />
                                </button>
                            </li>
                            <li className="server-item">
                                <button
                                    className="server-button logout-button"
                                    onClick={handleLogout}
                                    title="Выйти из аккаунта"
                                >
                                    <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16,17 21,12 16,7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                </button>
                            </li>
                        </ul>
                    )}
                </Droppable>
            </DragDropContext>

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="create-modal">
                        <h3>Создать новый сервер</h3>
                        <input
                            type="text"
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                            placeholder="Название сервера"
                            className="modal-input"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Описание сервера"
                            className="modal-input"
                            rows={3}
                        />
                        <div className="server-type-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                />
                                <span className="toggle-text">
                                    {isPublic ? 'Публичный сервер' : 'Приватный сервер'}
                                </span>
                            </label>
                            <p className="toggle-description">
                                {isPublic 
                                    ? 'Сервер будет виден в поиске и доступен всем' 
                                    : 'Сервер будет доступен только по приглашению'}
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                onClick={handleCreateServer}
                                disabled={!newServerName.trim()}
                            >
                                Создать
                            </button>
                            <button onClick={resetModalState}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SettingsModal 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
            />
        </div>
    );
};

export default ServerList;