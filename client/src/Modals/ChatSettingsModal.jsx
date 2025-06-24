import React, { useState } from 'react';
import { BASE_URL } from '../config/apiConfig';

const ChatSettingsModal = ({ 
    isOpen, 
    onClose, 
    serverId, 
    chatId, 
    chatName: initialChatName,
    fetchServerData,
    connection
}) => {
    const [chatName, setChatName] = useState(initialChatName);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpdate = async () => {
        if (!chatName.trim()) {
            setError('Chat name cannot be empty');
            return;
        }
    
        setIsLoading(true);
        try {
            await connection.invoke("UpdateChatName", 
                parseInt(serverId, 10),
                parseInt(chatId, 10),
                chatName
            );
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
        setIsLoading(true);
        try {
            await connection.invoke("DeleteChat",
                parseInt(serverId, 10),
                parseInt(chatId, 10)
            );
            onClose();
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
                <h3>Chat Settings</h3>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                    <label>Chat Name</label>
                    <input
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        placeholder="Enter new chat name"
                    />
                </div>
                
                <div className="modal-actions">
                    <button 
                        onClick={handleUpdate} 
                        disabled={isLoading}
                        className="confirm-button"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                        onClick={handleDelete} 
                        disabled={isLoading}
                        className="delete-button"
                    >
                        Delete Chat
                    </button>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatSettingsModal;