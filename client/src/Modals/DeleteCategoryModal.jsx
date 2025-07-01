import React, { useState } from 'react';
import { BASE_URL } from '../config/apiConfig';

const DeleteCategoryModal = ({ 
    isOpen, 
    onClose, 
    serverId, 
    categoryId,
    categoryName,
    connection,
    fetchServerData 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // DeleteCategoryModal.jsx
    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Deleting category with params:', {
                serverId: Number(serverId),
                categoryId: Number(categoryId)
            });
    
            if (!serverId || !categoryId) {
                throw new Error("Недостаточно данных для удаления");
            }
    
            await connection.invoke("DeleteCategory", 
                Number(serverId),
                Number(categoryId)
            );
            
            await fetchServerData();
            onClose();
        } catch (err) {
            console.error("Delete error details:", {
                error: err,
                connectionState: connection?.state
            });
            setError(err.message || "Ошибка при удалении категории");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Delete Category</h3>
                
                {error && <div className="error-message">{error}</div>}
                
                <p>Are you sure you want to delete the category "{categoryName}"? All chats inside will also be deleted.</p>
                
                <div className="modal-actions">
                    <button 
                        onClick={handleDelete} 
                        disabled={isLoading}
                        className="delete-button"
                    >
                        {isLoading ? 'Deleting...' : 'Delete'}
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

export default DeleteCategoryModal;