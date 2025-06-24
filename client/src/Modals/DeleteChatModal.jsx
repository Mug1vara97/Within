import React, { useState } from 'react';

const DeleteChatModal = ({ 
    isOpen, 
    onClose, 
    chatId,
    chatName,
    connection,
    serverId,
    fetchServerData
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await connection.invoke("DeleteChat", 
                Number(serverId),
                Number(chatId)
            );
            await fetchServerData();
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
                <h3>Delete Chat</h3>
                {error && <div className="error-message">{error}</div>}
                <p>Вы уверены, что хотите удалить чат "{chatName}"?</p>
                <div className="modal-actions">
                    <button 
                        onClick={handleDelete} 
                        disabled={isLoading}
                        className="delete-button"
                    >
                        {isLoading ? 'Удаление...' : 'Удалить'}
                    </button>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="cancel-button"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteChatModal;