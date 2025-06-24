import React, { useState, useEffect } from 'react';
import { FaHashtag, FaMicrophone, FaLock } from 'react-icons/fa';
import { BASE_URL } from '../config/apiConfig';
import '../styles/CreateChatModal.css';

const CreateChatModal = ({ 
    isOpen, 
    onClose, 
    serverId, 
    categoryId,
    fetchServerData
}) => {
    const [chatName, setChatName] = useState('');
    const [chatType, setChatType] = useState(3);
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [roles, setRoles] = useState([]);
    const [serverMembers, setServerMembers] = useState([]);

    useEffect(() => {
        if (!isOpen) {
            setIsPrivate(false);
            setSelectedRoles([]);
            setSelectedUsers([]);
            setChatName('');
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchRolesAndMembers();
        }
    }, [isOpen, serverId]);

    const fetchRolesAndMembers = async () => {
        try {
            // Загружаем роли
            const rolesResponse = await fetch(`${BASE_URL}/api/server/${serverId}/roles`);
            if (rolesResponse.ok) {
                const rolesData = await rolesResponse.json();
                setRoles(rolesData);
            }

            // Загружаем участников сервера
            const membersResponse = await fetch(`${BASE_URL}/api/role/${serverId}/members`);
            if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                setServerMembers(membersData);
            }
        } catch (err) {
            setError('Ошибка при загрузке данных');
        }
    };

    const handleCreateChat = async () => {
        if (!chatName.trim()) {
            setError('Название чата не может быть пустым');
            return;
        }
        
        if (isPrivate && selectedRoles.length === 0 && selectedUsers.length === 0) {
            setError('Выберите хотя бы одну роль или пользователя');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const endpoint = isPrivate 
                ? `${BASE_URL}/api/server/${serverId}/create-private-channel`
                : `${BASE_URL}/api/messages/${serverId}/create-channel`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatName: chatName,
                    chatType: chatType,
                    categoryId: categoryId,
                    ...(isPrivate && {
                        allowedRoleIds: selectedRoles.map(Number),
                        allowedUserIds: selectedUsers.map(Number)
                    })
                }),
            });

            if (!response.ok) {
                throw new Error(isPrivate ? 'Ошибка при создании приватного канала' : 'Ошибка при создании канала');
            }

            onClose();
            setChatName('');
            setSelectedRoles([]);
            setSelectedUsers([]);
            setIsPrivate(false);
            fetchServerData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Создать канал {isPrivate && <FaLock className="private-active" />}</h3>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                    <label>Тип канала</label>
                    <div className="radio-group">
                        <label className={`radio-option ${chatType === 3 ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="chatType"
                                checked={chatType === 3}
                                onChange={() => setChatType(3)}
                            />
                            <FaHashtag /> Текстовый
                        </label>
                        <label className={`radio-option ${chatType === 4 ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="chatType"
                                checked={chatType === 4}
                                onChange={() => setChatType(4)}
                            />
                            <FaMicrophone /> Голосовой
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label>Название канала</label>
                    <input
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        placeholder="новый-канал"
                        className="channel-name-input"
                    />
                </div>

                <div className="form-group privacy-section">
                    <label className="privacy-label">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        Приватный канал
                    </label>
                    {isPrivate && (
                        <p className="privacy-description">
                            Только выбранные роли и пользователи будут иметь доступ к этому каналу
                        </p>
                    )}
                </div>

                {isPrivate && (
                    <>
                        <div className="form-group">
                            <label>Роли с доступом</label>
                            <div className="roles-list">
                                {roles.map(role => (
                                    <div key={role.roleId} className="role-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedRoles.includes(role.roleId.toString())}
                                                onChange={() => {
                                                    const roleId = role.roleId.toString();
                                                    setSelectedRoles(prev => 
                                                        prev.includes(roleId)
                                                            ? prev.filter(id => id !== roleId)
                                                            : [...prev, roleId]
                                                    );
                                                }}
                                            />
                                            <span className="role-name">{role.roleName}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Пользователи с доступом</label>
                            <div className="users-list">
                                {serverMembers.map(member => (
                                    <div key={member.userId} className="user-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(member.userId.toString())}
                                                onChange={() => {
                                                    const userId = member.userId.toString();
                                                    setSelectedUsers(prev => 
                                                        prev.includes(userId)
                                                            ? prev.filter(id => id !== userId)
                                                            : [...prev, userId]
                                                    );
                                                }}
                                            />
                                            <span className="user-name">{member.username}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                
                <div className="modal-actions">
                    <button 
                        onClick={handleCreateChat} 
                        disabled={isLoading}
                        className="confirm-button"
                    >
                        {isLoading ? 'Создание...' : 'Создать канал'}
                    </button>
                    <button onClick={onClose} className="cancel-button">
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateChatModal;