import React, { useState, useEffect } from 'react';
import { BASE_URL } from './config/apiConfig';

const CreateGroupChatModal = ({ userId, onClose, onChatCreated, connection }) => {
    const [chatName, setChatName] = useState('');
    const [contacts, setContacts] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    useEffect(() => {
        const fetchContacts = async () => {
            if (connection) {
                try {
                    await connection.invoke("GetUserContacts", userId);
                } catch (error) {
                    console.error('Ошибка при загрузке контактов:', error);
                }
            }
        };

        fetchContacts();

        // Подписываемся на событие получения контактов
        if (connection) {
            connection.on("ReceiveContacts", (receivedContacts) => {
                setContacts(receivedContacts);
            });
        }

        return () => {
            if (connection) {
                connection.off("ReceiveContacts");
            }
        };
    }, [connection, userId]);

    const handleUserSelect = (userId) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (chatName.trim() && selectedUserIds.length > 0) {
            const selectedUsers = contacts.filter(user => selectedUserIds.includes(user.user_id));
            onChatCreated(chatName.trim(), selectedUsers);
            onClose();
            } else {
            alert('Пожалуйста, введите название чата и выберите хотя бы одного участника');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Создать групповой чат</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Название чата:</label>
                    <input
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                            placeholder="Введите название чата"
                            required
                    />
                    </div>
                    <div className="contacts-list">
                        <h3>Выберите участников:</h3>
                        <div className="contacts-container">
                            {contacts.map(user => (
                                <div key={user.user_id} className="contact-item">
                                <label>
                                    <input
                                        type="checkbox"
                                            checked={selectedUserIds.includes(user.user_id)}
                                        onChange={() => handleUserSelect(user.user_id)}
                                    />
                                    {user.username}
                                </label>
                                </div>
                        ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="submit">Создать</button>
                        <button type="button" onClick={onClose}>Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupChatModal;