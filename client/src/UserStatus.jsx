import React from 'react';
import './styles/UserStatus.css';

const UserStatus = ({ status = 'offline', size = 'medium' }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'online':
                return '#43b581'; // Зеленый
            case 'idle':
                return '#faa61a'; // Желтый/оранжевый
            case 'dnd':
                return '#f04747'; // Красный (не беспокоить)
            case 'offline':
                return '#747f8d'; // Серый
            default:
                return '#747f8d';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'online':
                return '●';
            case 'idle':
                return '🌙';
            case 'dnd':
                return '🔴';
            case 'offline':
                return '○';
            default:
                return '○';
        }
    };

    return (
        <div 
            className={`user-status user-status-${status} user-status-${size}`}
            style={{ 
                backgroundColor: getStatusColor(),
                color: status === 'idle' || status === 'dnd' ? '#ffffff' : 'transparent'
            }}
            title={getStatusTitle(status)}
        >
            {status === 'idle' || status === 'dnd' ? getStatusIcon() : ''}
        </div>
    );
};

const getStatusTitle = (status) => {
    switch (status) {
        case 'online':
            return 'В сети';
        case 'idle':
            return 'Нет на месте';
        case 'dnd':
            return 'Не беспокоить';
        case 'offline':
            return 'Не в сети';
        default:
            return 'Не в сети';
    }
};

export default UserStatus; 