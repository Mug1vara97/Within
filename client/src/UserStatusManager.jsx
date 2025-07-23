import React, { useState } from 'react';
import UserStatus from './UserStatus';
import './styles/UserStatusManager.css';

const UserStatusManager = ({ currentStatus = 'online', onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const statusOptions = [
        { value: 'online', label: 'В сети', color: '#43b581' },
        { value: 'idle', label: 'Нет на месте', color: '#faa61a' },
        { value: 'dnd', label: 'Не беспокоить', color: '#f04747' },
        { value: 'offline', label: 'Невидимый', color: '#747f8d' }
    ];

    const handleStatusChange = (newStatus) => {
        if (onStatusChange) {
            onStatusChange(newStatus);
        }
        setIsOpen(false);
    };

    return (
        <div className="user-status-manager">
            <button 
                className="status-selector"
                onClick={() => setIsOpen(!isOpen)}
                title="Изменить статус"
            >
                <UserStatus status={currentStatus} size="medium" />
                <span className="status-label">
                    {statusOptions.find(s => s.value === currentStatus)?.label || 'В сети'}
                </span>
                <span className="status-arrow">▼</span>
            </button>

            {isOpen && (
                <div className="status-dropdown">
                    {statusOptions.map((status) => (
                        <button
                            key={status.value}
                            className={`status-option ${currentStatus === status.value ? 'active' : ''}`}
                            onClick={() => handleStatusChange(status.value)}
                        >
                            <UserStatus status={status.value} size="small" />
                            <span className="status-option-label">{status.label}</span>
                            {currentStatus === status.value && (
                                <span className="status-check">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserStatusManager; 