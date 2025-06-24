import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig';
import '../styles/Modal.css';

const CreateCategoryModal = ({ 
    isOpen, 
    onClose, 
    serverId, 
    fetchServerData,
    connection,
    newCategoryName,
    setNewCategoryName
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [serverMembers, setServerMembers] = useState([]);

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

    useEffect(() => {
        if (isOpen && serverId) {
            fetchRolesAndMembers();
        }
    }, [isOpen, serverId]);

    const handleCreate = async () => {
        if (!newCategoryName.trim()) {
            setError('Название категории не может быть пустым');
            return;
        }

        setIsLoading(true);
        try {
            if (isPrivate) {
                await connection.invoke("CreatePrivateCategory", 
                    parseInt(serverId, 10),
                    newCategoryName,
                    selectedRoles.map(roleId => parseInt(roleId, 10)),
                    selectedUsers.map(userId => parseInt(userId, 10))
                );
            } else {
            await connection.invoke("CreateCategory", 
                parseInt(serverId, 10),
                newCategoryName
            );
            }
            onClose();
            setNewCategoryName('');
            setIsPrivate(false);
            setSelectedRoles([]);
            setSelectedUsers([]);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleToggle = (roleId) => {
        setSelectedRoles(prev => {
            if (prev.includes(roleId)) {
                return prev.filter(id => id !== roleId);
            } else {
                return [...prev, roleId];
            }
        });
    };

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Создать категорию</h2>
                <div className="modal-form">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Название категории"
                        className="modal-input"
                    />
                    
                    <div className="privacy-settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                            />
                            Приватная категория
                        </label>
                    </div>

                    {isPrivate && (
                        <>
                            <div className="roles-list">
                                <h3>Выберите роли с доступом:</h3>
                                {roles.map(role => (
                                    <label key={role.roleId}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRoles.includes(role.roleId)}
                                            onChange={() => handleRoleToggle(role.roleId)}
                                        />
                                        {role.roleName}
                                    </label>
                                ))}
                </div>
                
                            <div className="users-list">
                                <h3>Выберите пользователей с доступом:</h3>
                                {serverMembers.map(member => (
                                    <label key={member.userId}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(member.userId)}
                                            onChange={() => handleUserToggle(member.userId)}
                                        />
                                        {member.username}
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="modal-buttons">
                    <button 
                        onClick={handleCreate} 
                        disabled={isLoading}
                            className="modal-button primary"
                    >
                            {isLoading ? 'Создание...' : 'Создать'}
                    </button>
                    <button 
                        onClick={onClose} 
                            className="modal-button secondary"
                    >
                            Отмена
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCategoryModal;