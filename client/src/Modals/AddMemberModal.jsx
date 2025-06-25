import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig';

const AddMemberModal = ({ isOpen, onClose, serverId, userId, fetchServerData }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/messages/${serverId}/available-users?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                setError('Failed to fetch users');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (userIdToAdd) => {
        try {
            const response = await fetch(`${BASE_URL}/api/messages/${serverId}/add-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    requestingUserId: userId, 
                    userIdToAdd: userIdToAdd 
                }),
            });

            if (response.ok) {
                fetchServerData();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add member');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Add Member</h3>
                
                {error && <div className="error-message">{error}</div>}
                
                {isLoading ? (
                    <div>Loading...</div>
                ) : (
                    <ul className="members-list">
                        {users.map(user => (
                            <li key={user.userId} className="member-item">
                                <span>{user.username}</span>
                                <button 
                                    onClick={() => handleAddMember(user.userId)}
                                    className="add-button"
                                >
                                    Add
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                
                <button onClick={onClose} className="close-button">
                    Close
                </button>
            </div>
        </div>
    );
};

export default AddMemberModal;